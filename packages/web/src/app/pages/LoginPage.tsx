import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useUserStore } from '@/stores/userStore';
import { useActivityStore } from '@/stores/activityStore';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/useToast';
import { useFormValidation } from '@/hooks/useFormValidation';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { addActivity } = useActivityStore();
  const { t } = useI18n();

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setGoogleLoading(true);
        try {
          const res = await fetch('/api/auth/social-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ access_token: session.access_token, provider: 'google' }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setUser(json.data.user);
            addActivity({ type: 'login', title: 'Google登录', description: json.data.user.name });
            toast.success(t('auth.loginSuccess'), { description: `欢迎，${json.data.user.name}` });
            navigate('/app');
          } else {
            setError(json.error || 'Google登录失败');
          }
        } catch {
          setError(t('msg.networkError'));
        } finally {
          setGoogleLoading(false);
          // Clear the Supabase session after we've used it
          await supabase.auth.signOut();
        }
      }
    };
    handleOAuthCallback();
  }, [navigate, setUser, addActivity, t]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Google登录初始化失败');
      setGoogleLoading(false);
    }
  };

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

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? '登录中...' : 'Continue with Google'}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">或</span>
          </div>
        </div>

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
