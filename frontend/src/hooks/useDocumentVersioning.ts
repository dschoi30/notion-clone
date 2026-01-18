/**
 * useDocumentVersioning.ts
 * 문서 버전 스냅샷 자동 생성 로직을 담당하는 커스텀 훅
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getProperties, getPropertyValuesByDocument, createDocumentVersion } from '@/services/documentApi';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import usePageStayTimer from '@/hooks/usePageStayTimer';
import { createLogger } from '@/lib/logger';
import type { Document, Workspace, PropertyValue } from '@/types';

const vlog = createLogger('version');

/** 
 * 개발 환경: 30초, 프로덕션: 10분
 * Vite의 import.meta.env를 사용
 */
const getSnapshotInterval = (): number => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') {
        return 30 * 1000; // 30초
    }
    return 10 * 60 * 1000; // 10분
};

/** 최대 재시도 횟수 */
const MAX_RETRY_COUNT = 3;

interface UseDocumentVersioningOptions {
    /** 버전 스냅샷 간격 (ms), 기본값: 환경에 따라 30초 또는 10분 */
    snapshotIntervalMs?: number;
    /** 스냅샷 에러 콜백 */
    onError?: (message: string) => void;
}

interface UseDocumentVersioningReturn {
    /** 현재까지 경과된 시간 (ms) */
    elapsedMs: number;
    /** 다음 스냅샷까지 남은 시간 (ms) */
    nextSnapshotMs: number;
}

/**
 * 문서 버전 스냅샷 자동 생성 로직을 담당하는 커스텀 훅
 * - 일정 시간(개발: 30초, 프로덕션: 10분) 경과 시 자동으로 버전 스냅샷 생성
 * - 문서 전환 시 타이머 리셋
 * - 실패 시 재시도 (최대 3회)
 */
export function useDocumentVersioning(
    currentDocument: Document | null,
    currentWorkspace: Workspace | null,
    titleRef: React.MutableRefObject<string>,
    contentRef: React.MutableRefObject<string>,
    options: UseDocumentVersioningOptions = {}
): UseDocumentVersioningReturn {
    const SNAPSHOT_INTERVAL_MS = options.snapshotIntervalMs ?? getSnapshotInterval();
    const { onError } = options;

    const [nextSnapshotMs, setNextSnapshotMs] = useState<number>(SNAPSHOT_INTERVAL_MS);
    const { titleWidth } = useDocumentPropertiesStore(state => ({ titleWidth: state.titleWidth }));

    // 문서 ID를 추적하여 전환 시 타이머 리셋
    const prevDocIdRef = useRef<number | undefined>(undefined);
    // 재시도 카운터
    const retryCountRef = useRef<number>(0);

    // 스냅샷 생성 핸들러
    const handleReachSnapshot = useCallback(async (reachedMs?: number) => {
        /** 재시도 가능한 에러인지 확인 (네트워크 에러 또는 5xx 서버 에러) */
        const isRetryableError = (error: unknown): boolean => {
            const apiError = error as { response?: { status?: number } };
            const status = apiError?.response?.status;
            // 상태 코드가 없으면 네트워크 에러로 간주하여 재시도
            if (!status) return true;
            // 4xx 클라이언트 에러는 재시도하지 않음
            if (status >= 400 && status < 500) return false;
            // 5xx 서버 에러는 재시도
            return true;
        };

        /** 스냅샷 실행 - 성공 시 true, 재시도 가능한 실패 시 false, 재시도 불가 시 null 반환 */
        const executeSnapshot = async (): Promise<boolean | null> => {
            try {
                if (!currentDocument || !currentWorkspace) return false;

                // 최신 속성/값을 병렬로 로드
                const [props, valuesArr] = await Promise.all([
                    getProperties(currentWorkspace.id, currentDocument.id),
                    getPropertyValuesByDocument(currentWorkspace.id, currentDocument.id),
                ]);

                const propsSlim = (props || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    sortOrder: p.sortOrder,
                    width: p.width,
                }));

                const valuesObj: Record<string, PropertyValue> = {};
                (valuesArr || []).forEach(v => {
                    valuesObj[v.propertyId] = v.value;
                });

                const payload = {
                    title: titleRef.current || '',
                    viewType: currentDocument.viewType,
                    titleWidth: titleWidth,
                    content: currentDocument.viewType === 'PAGE' ? (contentRef.current || '') : null,
                    propertiesJson: JSON.stringify(propsSlim),
                    propertyValuesJson: JSON.stringify(valuesObj),
                };

                vlog.debug('create payload', payload);
                const res = await createDocumentVersion(currentWorkspace.id, currentDocument.id, payload);
                vlog.info('created version id', res);
                retryCountRef.current = 0; // 성공 시 재시도 카운터 리셋
                return true;
            } catch (e) {
                vlog.error('create failed', e);
                // 재시도 가능한 에러인지 확인
                if (!isRetryableError(e)) {
                    vlog.error('client error (4xx), not retrying', e);
                    return null; // 재시도 불가
                }
                return false; // 재시도 가능
            }
        };

        // 실행 및 재시도 로직
        let result = await executeSnapshot();

        // null이면 재시도 불가 (4xx 에러)
        if (result === null) {
            onError?.('버전 스냅샷 저장에 실패했습니다. 요청을 확인해주세요.');
            retryCountRef.current = 0;
            // 다음 임계치 설정 후 종료
            const base = typeof reachedMs === 'number' ? reachedMs : 0;
            setNextSnapshotMs(base + SNAPSHOT_INTERVAL_MS);
            return;
        }

        while (!result && retryCountRef.current < MAX_RETRY_COUNT) {
            retryCountRef.current++;
            vlog.warn(`retry snapshot (${retryCountRef.current}/${MAX_RETRY_COUNT})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current)); // 점진적 대기
            result = await executeSnapshot();

            // 재시도 중 4xx 에러 발생 시 중단
            if (result === null) {
                onError?.('버전 스냅샷 저장에 실패했습니다. 요청을 확인해주세요.');
                retryCountRef.current = 0;
                const base = typeof reachedMs === 'number' ? reachedMs : 0;
                setNextSnapshotMs(base + SNAPSHOT_INTERVAL_MS);
                return;
            }
        }

        if (!result && retryCountRef.current >= MAX_RETRY_COUNT) {
            vlog.error('max retry reached, giving up');
            onError?.('버전 스냅샷 저장에 실패했습니다. 네트워크 연결을 확인해주세요.');
            retryCountRef.current = 0; // 리셋
        }

        // 다음 임계치: 방금 도달 지점 기준으로 재설정
        const base = typeof reachedMs === 'number' ? reachedMs : 0;
        const next = base + SNAPSHOT_INTERVAL_MS;
        setNextSnapshotMs(next);
        vlog.debug('next target set', next);
    }, [currentDocument, currentWorkspace, titleRef, contentRef, titleWidth, SNAPSHOT_INTERVAL_MS, onError]);

    // 타이머 활성화 여부
    const isTimerEnabled = Boolean(currentDocument);

    // 페이지 체류 타이머
    const { elapsedMs } = usePageStayTimer({
        enabled: isTimerEnabled,
        onReachMs: handleReachSnapshot,
        targetMs: nextSnapshotMs,
    });

    // 문서 전환 시 타이머 리셋
    useEffect(() => {
        if (currentDocument?.id !== prevDocIdRef.current) {
            setNextSnapshotMs(elapsedMs + SNAPSHOT_INTERVAL_MS);
            prevDocIdRef.current = currentDocument?.id;
            retryCountRef.current = 0; // 문서 전환 시 재시도 카운터 리셋
        }
    }, [currentDocument?.id, elapsedMs, SNAPSHOT_INTERVAL_MS]);

    return {
        elapsedMs,
        nextSnapshotMs,
    };
}

export default useDocumentVersioning;
