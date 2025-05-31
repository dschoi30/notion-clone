// useDocumentSocket.js (커스텀 훅)
import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

/**
 * 문서 실시간 협업용 WebSocket 커스텀 훅
 * @param {string} documentId - 편집 중인 문서 ID
 * @param {function} onRemoteEdit - 서버에서 온 편집 메시지 처리 콜백
 * @returns {object} sendEdit(메시지 전송 함수)
 */
export default function useDocumentSocket(documentId, onRemoteEdit) {
  const stompClientRef = useRef(null);

  useEffect(() => {
    if (!documentId){
      console.log('useDocumentSocket: documentId 없음, 연결 시도 안함');
      return;
    }
    console.log('useDocumentSocket: documentId 있음, 연결 시도');
    // JWT 토큰을 쿼리 파라미터로 전달 (accessToken 사용)
    const token = localStorage.getItem('accessToken');
    console.log('WebSocket 연결에 사용할 accessToken:', token);
    const wsUrl = token ? `/ws/document?token=${token}` : '/ws/document';
    console.log('WebSocket 연결 URL:', wsUrl);
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe(`/topic/document/${documentId}`, (msg) => {
          if (msg.body) {
            console.log('useDocumentSocket: 서버에서 온 편집 메시지 수신');
            onRemoteEdit(JSON.parse(msg.body));
          }
        });
      },
    });
    stompClient.activate();
    stompClientRef.current = stompClient;
    return () => {
      stompClient.deactivate();
    };
  }, [documentId, onRemoteEdit]);

  // 편집 메시지 전송 함수
  const sendEdit = (editData) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      console.log('WebSocket 메시지 전송:', editData);
      stompClientRef.current.publish({
        destination: `/app/document/${documentId}/edit`,
        body: JSON.stringify(editData),
      });
    } else {
      console.log('WebSocket 연결 안 됨, 메시지 전송 실패');
    }
  };

  return { sendEdit };
}