/**
 * 문서 관련 공통 타입 정의
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/114
 */

/**
 * 문서 저장 상태
 * - saved: 저장 완료
 * - saving: 저장 중
 * - error: 저장 실패
 * - unsaved: 저장 대기 (변경사항 있음)
 */
export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

/**
 * 원격 편집 메시지 (WebSocket)
 */
export interface RemoteEditMessage {
    content?: string;
    userId?: number;
}

/**
 * 문서 경로 정보 (breadcrumb)
 */
export interface DocumentPathInfo {
    id: number;
    title: string;
}

// Re-export from main types
export type { Document, ViewType, PropertyValue, DocumentProperty, Permission } from '@/types';
