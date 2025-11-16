// useDocumentSocket.js (커스텀 훅)
import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { createLogger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

/**
 * 문서 실시간 협업용 WebSocket 커스텀 훅
 * @param {string} documentId - 편집 중인 문서 ID
 * @param {function} onRemoteEdit - 서버에서 온 편집 메시지 처리 콜백
 * @returns {object} sendEdit(메시지 전송 함수)
 */
export default function useDocumentSocket(documentId, onRemoteEdit) {
  const rlog = createLogger('useDocumentSocket');
  const stompClientRef = useRef(null);
  const onRemoteEditRef = useRef(onRemoteEdit);

  // 최신 콜백을 참조로 유지하여 이펙트 재실행 없이도 최신 로직을 사용
  useEffect(() => {
    onRemoteEditRef.current = onRemoteEdit;
  }, [onRemoteEdit]);

  useEffect(() => {
    if (!documentId){
      rlog.debug('useDocumentSocket: documentId 없음, 연결 시도 안함');
      return;
    }
    // console.log('useDocumentSocket: documentId 있음, 연결 시도');
    // JWT 토큰을 쿼리 파라미터로 전달 (accessToken 사용)
    const token = localStorage.getItem('accessToken');
    // console.log('WebSocket 연결에 사용할 accessToken:', token);
    const wsUrl = token ? `/ws/document?token=${token}` : '/ws/document';
    // console.log('WebSocket 연결 URL:', wsUrl);
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      // debug: (str) => console.log(str),
      reconnectDelay: 5000,
      onConnect: () => {
        rlog.info('WebSocket 연결 성공:', documentId);
        stompClient.subscribe(`/topic/document/${documentId}`, (msg) => {
          if (msg.body && onRemoteEditRef.current) {
            onRemoteEditRef.current(JSON.parse(msg.body));
          }
        });
      },
      onStompError: (frame) => {
        rlog.error('STOMP 에러:', frame);
        captureException(new Error('WebSocket STOMP error'), {
          tags: {
            document_id: documentId,
            error_type: 'websocket_stomp',
          },
          extra: {
            command: frame.command,
            message: frame.message,
            headers: frame.headers,
          },
        });
      },
      onWebSocketError: (event) => {
        rlog.error('WebSocket 연결 에러:', event);
        captureException(new Error('WebSocket connection error'), {
          tags: {
            document_id: documentId,
            error_type: 'websocket_connection',
          },
        });
      },
      onDisconnect: () => {
        rlog.info('WebSocket 연결 종료:', documentId);
      },
    });
    stompClient.activate();
    stompClientRef.current = stompClient;
    return () => {
      stompClient.deactivate();
    };
  }, [documentId]);

  // 편집 메시지 전송 함수
  const sendEdit = (editData) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      // console.log('WebSocket 메시지 전송:', editData);
      stompClientRef.current.publish({
        destination: `/app/document/${documentId}/edit`,
        body: JSON.stringify(editData),
      });
    } else {
      rlog.debug('WebSocket 연결 안 됨, 메시지 전송 실패');
    }
  };

  return { sendEdit };
}