import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUserStore } from '@/stores/userStore';
import { useActivityStore } from '@/stores/activityStore';
import { toast } from '@/hooks/useToast';
import { useFormValidation } from '@/hooks/useFormValidation';

const registerSchema = z.object({
  name: z.string().min(1, '请输入姓名').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少需要8位字符'),
  confirmPassword: z.string().min(1, '请再次输入密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { addActivity } = useActivityStore();

  const { fields, setFieldValue, validateField, validateAll, getVariant, getErrorMessage } = useFormValidation(
    registerSchema,
    { name: '', email: '', password: '', confirmPassword: '' },
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAll()) {
      toast.error('请检查表单', { description: '请修正错误后再提交' });
      return;
    }

    const data = {
      name: fields.name.value,
      email: fields.email.value,
      password: fields.password.value,
    };

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || '注册失败，请稍后重试');
        return;
      }

      setUser(json.data.user);
      addActivity({ type: 'login', title: '新用户注册', description: data.name });
      toast.success('注册成功', { description: `欢迎，${data.name}！` });
      navigate('/app');
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm animate-fade-in">
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-600">销冠AI教练</h1>
        <p className="mb-6 text-center text-sm text-gray-500">注册新账号</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-gray-700">姓名</label>
            <Input
              id="reg-name"
              value={fields.name.value}
              onChange={(e) => setFieldValue('name', e.target.value)}
              onBlur={(e) => validateField('name', e.target.value)}
              placeholder="输入姓名"
              autoComplete="name"
              variant={getVariant('name')}
              errorMessage={getErrorMessage('name')}
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-gray-700">邮箱</label>
            <Input
              id="reg-email"
              type="email"
              value={fields.email.value}
              onChange={(e) => setFieldValue('email', e.target.value)}
              onBlur={(e) => validateField('email', e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              variant={getVariant('email')}
              errorMessage={getErrorMessage('email')}
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-gray-700">密码</label>
            <Input
              id="reg-password"
              type="password"
              value={fields.password.value}
              onChange={(e) => setFieldValue('password', e.target.value)}
              onBlur={(e) => validateField('password', e.target.value)}
              placeholder="至少8位"
              autoComplete="new-password"
              variant={getVariant('password')}
              errorMessage={getErrorMessage('password')}
            />
          </div>
          <div>
            <label htmlFor="reg-confirm" className="mb-1 block text-sm font-medium text-gray-700">确认密码</label>
            <Input
              id="reg-confirm"
              type="password"
              value={fields.confirmPassword.value}
              onChange={(e) => setFieldValue('confirmPassword', e.target.value)}
              onBlur={(e) => validateField('confirmPassword', e.target.value)}
              placeholder="再次输入密码"
              autoComplete="new-password"
              variant={getVariant('confirmPassword')}
              errorMessage={getErrorMessage('confirmPassword')}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              '注册'
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          已有账号？ <Link to="/login" className="text-primary-600 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
