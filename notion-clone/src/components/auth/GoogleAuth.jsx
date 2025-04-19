// components/auth/GoogleAuth.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithGoogle } from '../../services/auth';

const GoogleAuth = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

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
          text: 'signin_with',
          shape: 'rectangular'
        }
      );
    };

    return () => {
      const scriptElement = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (scriptElement) {
        document.body.removeChild(scriptElement);
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
        <div id="googleButton" className="flex justify-center"></div>
      </div>
    </div>
  );
};

export default GoogleAuth;