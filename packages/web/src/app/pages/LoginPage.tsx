import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login API call
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-600">销冠AI教练</h1>
        <p className="mb-6 text-center text-sm text-gray-500">登录开始使用</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">邮箱</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">密码</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" required />
          </div>
          <Button type="submit" className="w-full">登录</Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          还没有账号？ <Link to="/register" className="text-primary-600 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  );
}
