import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleCredentialResponse {
  credential: string;
}

interface ResizeObserverEntry {
  contentRect: {
    width: number;
  };
}

interface ResizeObserverCallback {
  (entries: ResizeObserverEntry[]): void;
}

interface HTMLElementWithResizeObserver extends HTMLElement {
  _resizeObserver?: ResizeObserver;
}

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const isInitialized = useRef<boolean>(false);
  const buttonContainerRef = useRef<HTMLElementWithResizeObserver | null>(null);
  const containerWidthRef = useRef<number | null>(null);

  const handleGoogleLogin = useCallback(async (response: GoogleCredentialResponse) => {
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (error) {
      console.error('Google 로그인 실패:', error);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    // 이미 초기화되었거나 컨테이너가 없으면 리턴
    if (isInitialized.current || !buttonContainerRef.current) {
      return;
    }

    // 스크립트가 이미 로드되어 있는지 확인
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    
    if (existingScript) {
      // 스크립트가 이미 로드되어 있으면 바로 초기화
      if (window.google?.accounts?.id) {
        initializeGoogleAuth();
      } else {
        // 스크립트는 있지만 아직 로드 중이면 onload 대기
        existingScript.onload = initializeGoogleAuth as (this: GlobalEventHandlers, ev: Event) => void;
      }
    } else {
      // 스크립트가 없으면 새로 로드
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = initializeGoogleAuth as (this: GlobalEventHandlers, ev: Event) => void;
    }

    function initializeGoogleAuth() {
      if (isInitialized.current || !buttonContainerRef.current) {
        return;
      }

      try {
        // 기존 버튼이 있으면 제거
        const existingButton = buttonContainerRef.current.querySelector('div[role="button"]');
        if (existingButton) {
          buttonContainerRef.current.innerHTML = '';
        }

        // 컨테이너의 실제 픽셀 너비 계산
        const containerWidth = buttonContainerRef.current.getBoundingClientRect().width;
        const buttonWidth = Math.max(containerWidth || 400, 200);
        containerWidthRef.current = buttonWidth;

        if (!window.google?.accounts?.id) {
          console.error('Google Accounts ID API가 로드되지 않았습니다.');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
          ux_mode: 'popup',
          context: 'signin',
          auto_select: false,
          itp_support: true
        });

        window.google.accounts.id.renderButton(
          buttonContainerRef.current,
          { 
            theme: 'outline', 
            size: 'large', 
            text: 'continue_with',
            shape: 'rectangular',
            locale: 'ko',
            width: Math.floor(buttonWidth) // 정수 픽셀 값으로 전달
          }
        );

        isInitialized.current = true;

        // 초기화 완료 후 ResizeObserver 설정
        setupResizeObserver();
      } catch (error) {
        console.error('Google Auth 초기화 실패:', error);
      }
    }

    function setupResizeObserver() {
      if (!buttonContainerRef.current) {
        return;
      }

      const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          const currentWidth = containerWidthRef.current;

          // 너비가 10px 이상 변경되었을 때만 재렌더링 (성능 최적화)
          if (currentWidth && Math.abs(newWidth - currentWidth) > 10) {
            // 버튼 재렌더링
            const existingButton = buttonContainerRef.current?.querySelector('div[role="button"]');
            if (existingButton && window.google?.accounts?.id && buttonContainerRef.current) {
              buttonContainerRef.current.innerHTML = '';
              const buttonWidth = Math.max(newWidth || 400, 200);
              window.google.accounts.id.renderButton(
                buttonContainerRef.current,
                { 
                  theme: 'outline', 
                  size: 'large', 
                  text: 'continue_with',
                  shape: 'rectangular',
                  locale: 'ko',
                  width: Math.floor(buttonWidth)
                }
              );
              containerWidthRef.current = buttonWidth;
            }
          }
        }
      });

      resizeObserver.observe(buttonContainerRef.current);

      // cleanup 함수를 ref에 저장하여 나중에 호출할 수 있도록 함
      buttonContainerRef.current._resizeObserver = resizeObserver;
    }

    return () => {
      // 컴포넌트 언마운트 시 정리
      if (buttonContainerRef.current) {
        // ResizeObserver 정리
        if (buttonContainerRef.current._resizeObserver) {
          buttonContainerRef.current._resizeObserver.disconnect();
          delete buttonContainerRef.current._resizeObserver;
        }
        buttonContainerRef.current.innerHTML = '';
      }
      isInitialized.current = false;
    };
  }, [handleGoogleLogin]);
  
  return (
    <div ref={buttonContainerRef} id="googleButton" className="w-full flex justify-center">
    </div>
  );
}

