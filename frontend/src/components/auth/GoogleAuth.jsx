// components/auth/GoogleAuth.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async (response) => {
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (error) {
      console.error('Google 로그인 실패:', error);
    }
  };

  useEffect(() => {
    // Google 클라이언트 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
        ux_mode: 'popup',
        context: 'signin',
        auto_select: false,
        itp_support: true
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleButton'),
        { 
          theme: 'outline', 
          size: 'large', 
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          locale: 'ko'
        }
      );
    };

    return () => {
      const scriptElement = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (scriptElement) {
        document.body.removeChild(scriptElement);
      }
      // Google One Tap 정리
      const googleOneTap = document.querySelector('div[id^="g_id_onload"]');
      if (googleOneTap) {
        googleOneTap.remove();
      }
    };
  }, [handleGoogleLogin]);

  return (
    <div id="googleButton" className="flex justify-center"></div>
  );
}