import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { authSync } from '@/utils/authSync';
import type { User } from '@/types';

interface PresenceUser {
  userId: number;
  name: string;
  email: string;
}

interface PresenceMessage {
  type: 'presence';
  users: PresenceUser[];
}

/**
 * 문서 실시간 접속자(presence) 목록을 관리하는 커스텀 훅
 * @param documentId - 현재 문서 ID
 * @param user - 현재 로그인한 사용자 정보({ id, name, email })
 * @returns viewers - 현재 문서를 보고 있는 사용자 목록
 */
export default function useDocumentPresence(documentId: number | undefined, user: User | null): PresenceUser[] {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!documentId || !user) return;
    const token = localStorage.getItem('accessToken');
    const wsUrl = token ? `/ws/presence?token=${token}` : '/ws/presence';
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        // 입장 메시지 전송 (userId, name, email만 보냄)
        stompClient.publish({
          destination: `/app/presence/${documentId}/join`,
          body: JSON.stringify({
            userId: user.id,
            name: user.name,
            email: user.email,
          }),
        });
        // presence 브로드캐스트 구독
        stompClient.subscribe(`/topic/presence/${documentId}`, (msg) => {
          const data = JSON.parse(msg.body) as PresenceMessage;
          if (data.type === 'presence') {
            // console.log('presence 브로드캐스트 수신:', data.users);
            setViewers(data.users);
          }
        });
      },
    });
    stompClient.activate();
    stompClientRef.current = stompClient;
    return () => {
      // 퇴장 메시지 전송 (userId, name, email만 보냄)
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/app/presence/${documentId}/leave`,
          body: JSON.stringify({
            userId: user.id,
            name: user.name,
            email: user.email,
          }),
        });
        stompClientRef.current.deactivate();
      }
    };
  }, [documentId, user]);

  return viewers;
}

