// useDocumentSocket.ts (커스텀 훅)
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { createLogger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

interface EditMessage {
  [key: string]: unknown;
}

/** WebSocket 연결 상태 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseDocumentSocketReturn {
  /** 편집 메시지 전송 함수 */
  sendEdit: (editData: EditMessage) => void;
  /** 현재 연결 상태 */
  connectionStatus: ConnectionStatus;
  /** 마지막 에러 메시지 */
  error: string | null;
  /** 연결 재시도 함수 */
  reconnect: () => void;
}

/**
 * 문서 실시간 협업용 WebSocket 커스텀 훅
 * @param documentId - 편집 중인 문서 ID
 * @param onRemoteEdit - 서버에서 온 편집 메시지 처리 콜백
 * @returns 연결 상태, 에러, 전송 함수
 */
export default function useDocumentSocket(
  documentId: number | undefined,
  onRemoteEdit: (message: EditMessage) => void
): UseDocumentSocketReturn {
  // rlog를 메모이제이션하여 리렌더링 시 재생성 방지
  const rlog = useMemo(() => createLogger('useDocumentSocket'), []);
  const stompClientRef = useRef<Client | null>(null);
  const onRemoteEditRef = useRef(onRemoteEdit);
  const reconnectAttemptRef = useRef(0);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // 최신 콜백을 참조로 유지하여 이펙트 재실행 없이도 최신 로직을 사용
  useEffect(() => {
    onRemoteEditRef.current = onRemoteEdit;
  }, [onRemoteEdit]);

  // 연결 함수
  const connect = useCallback(() => {
    if (!documentId) {
      rlog.debug('useDocumentSocket: documentId 없음, 연결 시도 안함');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    // JWT 토큰을 쿼리 파라미터로 전달 (accessToken 사용)
    const token = localStorage.getItem('accessToken');
    const wsUrl = token ? `/ws/document?token=${token}` : '/ws/document';

    rlog.debug('WebSocket 연결 시도:', {
      documentId,
      wsUrl: wsUrl.replace(/token=[^&]*/, 'token=***'), // 토큰 마스킹
      hasToken: !!token,
      tokenLength: token?.length || 0,
      attempt: reconnectAttemptRef.current,
    });

    // SockJS 인스턴스 생성 및 이벤트 리스너 추가
    const sockJS = new SockJS(wsUrl);

    // SockJS 이벤트 리스너로 상세 정보 수집
    let connectionAttempted = false;
    let isCleaningUp = false;

    sockJS.onopen = () => {
      connectionAttempted = true;
      reconnectAttemptRef.current = 0; // 성공 시 재시도 카운터 리셋
      rlog.info('SockJS 연결 열림:', documentId);
    };

    sockJS.onclose = (event) => {
      const closeInfo = {
        documentId,
        code: event.code,
        reason: event.reason || 'Unknown',
        wasClean: event.wasClean,
        readyState: sockJS.readyState,
        protocol: sockJS.protocol,
        url: sockJS.url?.replace(/token=[^&]*/, 'token=***'),
        connectionAttempted,
        isCleaningUp,
      };

      // cleanup 중이면 로그만 남기고 에러로 처리하지 않음
      if (isCleaningUp) {
        rlog.debug('SockJS 연결 종료 (cleanup):', closeInfo);
        return;
      }

      // 연결이 열리지 않고 바로 닫힌 경우 (에러로 간주)
      if (!connectionAttempted && event.code !== 1000) {
        rlog.error('SockJS 연결 실패 (열리지 않고 닫힘):', closeInfo);

        // 에러 코드별 메시지 제공
        let errorMessage = 'WebSocket 연결 실패';
        if (event.code === 1006) {
          errorMessage = 'WebSocket 연결이 비정상적으로 종료되었습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
        } else if (event.code === 1002) {
          errorMessage = 'WebSocket 프로토콜 에러가 발생했습니다.';
        } else if (event.code === 1003) {
          errorMessage = 'WebSocket에서 지원하지 않는 데이터 타입이 전송되었습니다.';
        } else if (event.code === 1005) {
          errorMessage = 'WebSocket 상태 코드가 제공되지 않았습니다.';
        }

        setConnectionStatus('error');
        setError(errorMessage);

        captureException(new Error(errorMessage), {
          tags: {
            document_id: String(documentId),
            error_type: 'websocket_connection_failed',
            close_code: String(event.code),
          },
          extra: closeInfo,
        });
      } else {
        setConnectionStatus('disconnected');
        rlog.warn('SockJS 연결 종료:', closeInfo);
      }
    };

    sockJS.onerror = (error) => {
      // cleanup 중이면 에러를 무시
      if (isCleaningUp) {
        rlog.debug('SockJS 에러 (cleanup 중, 무시):', {
          documentId,
          readyState: sockJS.readyState,
        });
        return;
      }

      setConnectionStatus('error');
      setError('WebSocket 연결 에러가 발생했습니다.');

      rlog.error('SockJS 에러 발생:', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
        readyState: sockJS.readyState,
        protocol: sockJS.protocol,
        url: sockJS.url?.replace(/token=[^&]*/, 'token=***'),
        connectionAttempted,
      });
    };

    const stompClient = new Client({
      webSocketFactory: () => sockJS,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        rlog.info('WebSocket 연결 성공:', documentId);
        setConnectionStatus('connected');
        setError(null);
        stompClient.subscribe(`/topic/document/${documentId}`, (msg) => {
          if (msg.body && onRemoteEditRef.current) {
            onRemoteEditRef.current(JSON.parse(msg.body) as EditMessage);
          }
        });
      },
      onStompError: (frame) => {
        // cleanup 중이면 에러를 무시
        if (isCleaningUp) {
          rlog.debug('STOMP 에러 (cleanup 중, 무시):', { documentId });
          return;
        }

        setConnectionStatus('error');
        setError('STOMP 프로토콜 에러가 발생했습니다.');

        rlog.error('STOMP 에러:', {
          command: frame.command,
          body: frame.body,
          headers: frame.headers,
          documentId,
        });
        captureException(new Error('WebSocket STOMP error'), {
          tags: {
            document_id: String(documentId),
            error_type: 'websocket_stomp',
          },
          extra: {
            command: frame.command,
            body: frame.body,
            headers: frame.headers,
          },
        });
      },
      onWebSocketError: (event) => {
        // cleanup 중이거나 연결이 이미 닫힌 경우 에러를 무시
        if (isCleaningUp || sockJS.readyState === 3) {
          rlog.debug('WebSocket 에러 (cleanup 또는 이미 닫힘, 무시):', {
            documentId,
            readyState: sockJS.readyState,
            isCleaningUp,
          });
          return;
        }

        setConnectionStatus('error');
        setError('WebSocket 연결 에러가 발생했습니다.');

        // 에러 이벤트에서 상세 정보 추출
        const errorInfo: Record<string, unknown> = {
          type: event.type,
          documentId,
          wsUrl: wsUrl.replace(/token=[^&]*/, 'token=***'),
          sockJSReadyState: sockJS.readyState,
          sockJSProtocol: sockJS.protocol,
          sockJSUrl: sockJS.url?.replace(/token=[^&]*/, 'token=***'),
        };

        // Event 객체의 속성들 추출
        if ('target' in event && event.target) {
          const target = event.target as { readyState?: number; url?: string };
          if (target.readyState !== undefined) {
            errorInfo.targetReadyState = target.readyState;
          }
          if (target.url) {
            errorInfo.targetUrl = target.url.replace(/token=[^&]*/, 'token=***');
          }
        }

        // Error 이벤트인 경우 추가 정보
        if ('error' in event && event.error) {
          errorInfo.error = String(event.error);
        }

        // 모든 이벤트 속성 추출 시도
        try {
          const eventKeys = Object.keys(event);
          errorInfo.eventKeys = eventKeys;
          for (const key of eventKeys) {
            if (key !== 'target' && key !== 'type') {
              try {
                const value = (event as Record<string, unknown>)[key];
                if (typeof value !== 'object' || value === null) {
                  errorInfo[`event_${key}`] = value;
                }
              } catch {
                // 무시
              }
            }
          }
        } catch {
          // 무시
        }

        rlog.error('WebSocket 연결 에러:', errorInfo);
        captureException(new Error('WebSocket connection error'), {
          tags: {
            document_id: String(documentId),
            error_type: 'websocket_connection',
          },
          extra: errorInfo,
        });
      },
      onDisconnect: () => {
        if (!isCleaningUp) {
          setConnectionStatus('disconnected');
        }
        rlog.info('WebSocket 연결 종료:', documentId);
      },
    });
    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      isCleaningUp = true;
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch (error) {
          // cleanup 중 발생하는 에러는 무시
          rlog.debug('WebSocket cleanup 중 에러 (무시):', error);
        }
        stompClientRef.current = null;
      }
    };
  }, [documentId]); // rlog 의존성 제거 (useMemo로 안정화됨)

  // 초기 연결 - documentId가 변경될 때만 재연결
  useEffect(() => {
    const cleanup = connect();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]); // connect 대신 documentId에만 의존

  // 자동 재연결 (에러 또는 연결이 끊어진 경우에만)
  // 주의: 초기 'disconnected' 상태에서는 재연결하지 않음
  useEffect(() => {
    // 연결된 적이 없거나, 연결 중이거나, 이미 연결된 상태면 재연결 안 함
    if (connectionStatus !== 'error') {
      return;
    }

    // 최대 재시도 횟수 제한 (5회)
    const MAX_RETRY = 5;
    if (reconnectAttemptRef.current >= MAX_RETRY) {
      rlog.warn('최대 재연결 시도 횟수 초과:', {
        maxRetry: MAX_RETRY,
        documentId
      });
      return;
    }

    // 재연결 시도 횟수에 따른 대기 시간 (5초, 10초, 20초, 최대 30초)
    const delays = [5000, 10000, 20000, 30000];
    const delay = delays[Math.min(reconnectAttemptRef.current, delays.length - 1)];

    rlog.info('자동 재연결 예약:', {
      attempt: reconnectAttemptRef.current + 1,
      delayMs: delay,
      documentId
    });

    const timeoutId = setTimeout(() => {
      reconnectAttemptRef.current++;
      rlog.info('자동 재연결 시도:', { attempt: reconnectAttemptRef.current, documentId });

      // 기존 연결 정리
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch {
          // 무시
        }
        stompClientRef.current = null;
      }

      // 재연결
      connect();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [connectionStatus, connect, documentId, rlog]);

  // 수동 재연결 함수 (사용하지 않지만 API 호환성 유지)
  const reconnect = useCallback(() => {
    reconnectAttemptRef.current++;
    rlog.info('수동 재연결 시도:', { attempt: reconnectAttemptRef.current, documentId });

    // 기존 연결 정리
    if (stompClientRef.current) {
      try {
        stompClientRef.current.deactivate();
      } catch {
        // 무시
      }
      stompClientRef.current = null;
    }

    // 재연결
    connect();
  }, [connect, documentId, rlog]);

  // 편집 메시지 전송 함수
  const sendEdit = useCallback((editData: EditMessage): void => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: `/app/document/${documentId}/edit`,
        body: JSON.stringify(editData),
      });
    } else {
      rlog.debug('WebSocket 연결 안 됨, 메시지 전송 실패');
    }
  }, [documentId, rlog]);

  return { sendEdit, connectionStatus, error, reconnect };
}
