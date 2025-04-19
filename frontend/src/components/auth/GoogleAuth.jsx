// components/auth/GoogleAuth.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithGoogle } from '../../services/auth';

const GoogleAuth = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const buttonRef = React.useRef(null);

  const handleGoogleLogin = async (response) => {
    try {
      const result = await loginWithGoogle(response.credential);
      setUser(result.user);
      navigate('/');
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  React.useEffect(() => {
    const loadGoogleScript = () => {
      // 기존 스크립트가 있다면 제거
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }

      // 새 스크립트 추가
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) {
          try {
            const initOptions = {
              client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              callback: handleGoogleLogin,
              auto_select: false,
              cancel_on_tap_outside: true
            };

            window.google.accounts.id.initialize(initOptions);

            // 버튼이 마운트되어 있는지 확인
            if (buttonRef.current) {
              window.google.accounts.id.renderButton(buttonRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                locale: 'ko',
                width: 250
              });
            }
          } catch (error) {
            console.error('Google Sign-In initialization error:', error);
          }
        }
      };

      document.body.appendChild(script);
    };

    // 컴포넌트 마운트 시 스크립트 로드
    loadGoogleScript();

    return () => {
      // 컴포넌트 언마운트 시 정리
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script) {
        document.body.removeChild(script);
      }
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 text-gray-500 bg-white">Or continue with</span>
        </div>
      </div>
      <div className="mt-6">
        <div ref={buttonRef} className="flex justify-center"></div>
      </div>
    </div>
  );
};

export default GoogleAuth;