import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useUserStore } from '@/stores/userStore';
import { useActivityStore } from '@/stores/activityStore';
import { useI18n } from '@/i18n';
import { toast } from '@/hooks/useToast';
import { useFormValidation } from '@/hooks/useFormValidation';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { addActivity } = useActivityStore();
  const { t } = useI18n();

  const { fields, setFieldValue, validateField, validateAll, getVariant, getErrorMessage } = useFormValidation(
    loginSchema,
    { email: '', password: '' },
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAll()) {
      toast.error(t('common.error'), { description: '请修正错误后再提交' });
      return;
    }

    const data = loginSchema.parse({
      email: fields.email.value,
      password: fields.password.value,
    });

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || '登录失败，请检查邮箱和密码');
        return;
      }

      setUser(json.data.user);
      addActivity({ type: 'login', title: '用户登录', description: json.data.user.name });
      toast.success(t('auth.loginSuccess'), { description: `欢迎回来，${json.data.user.name}` });
      navigate('/app');
    } catch {
      setError(t('msg.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm animate-fade-in">
        <div className="mb-4 flex justify-end">
          <LanguageSelector variant="compact" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-600">销冠AI教练</h1>
        <p className="mb-6 text-center text-sm text-gray-500">{t('auth.login')}</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.email')}</label>
            <Input
              id="login-email"
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
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.password')}</label>
            <Input
              id="login-password"
              type="password"
              value={fields.password.value}
              onChange={(e) => setFieldValue('password', e.target.value)}
              onBlur={(e) => validateField('password', e.target.value)}
              placeholder="输入密码"
              autoComplete="current-password"
              variant={getVariant('password')}
              errorMessage={getErrorMessage('password')}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.login')
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          {t('auth.noAccount')} <Link to="/register" className="text-primary-600 hover:underline">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
