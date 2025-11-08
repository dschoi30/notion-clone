// components/auth/GoogleAuth.jsx
import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const isInitialized = useRef(false);
  const buttonContainerRef = useRef(null);

  const handleGoogleLogin = useCallback(async (response) => {
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
        existingScript.onload = initializeGoogleAuth;
      }
    } else {
      // 스크립트가 없으면 새로 로드
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = initializeGoogleAuth;
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
            width: '100%',
            text: 'continue_with',
            shape: 'rectangular',
            locale: 'ko'
          }
        );

        isInitialized.current = true;
      } catch (error) {
        console.error('Google Auth 초기화 실패:', error);
      }
    }

    return () => {
      // 컴포넌트 언마운트 시 정리
      if (buttonContainerRef.current) {
        buttonContainerRef.current.innerHTML = '';
      }
      isInitialized.current = false;
    };
  }, [handleGoogleLogin]);

  return (
    <div ref={buttonContainerRef} id="googleButton" className="flex justify-center"></div>
  );
}