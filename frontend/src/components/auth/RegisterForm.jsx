import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      console.error('회원가입 실패:', err);
    }
  };

  return (
    <Card className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-center">회원가입</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            required
          />
        </div>
        <div>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
          />
        </div>
        <div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
          />
        </div>
        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? '가입 중...' : '회원가입'}
        </Button>
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => navigate('/login')}
          >
            이미 계정이 있으신가요? 로그인
          </Button>
        </div>
      </form>
    </Card>
  );
} 