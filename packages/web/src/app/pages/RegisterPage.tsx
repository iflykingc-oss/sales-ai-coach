import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement register API call
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-600">销冠AI教练</h1>
        <p className="mb-6 text-center text-sm text-gray-500">注册新账号</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">姓名</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入姓名" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">邮箱</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">密码</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少8位" required />
          </div>
          <Button type="submit" className="w-full">注册</Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          已有账号？ <Link to="/login" className="text-primary-600 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
