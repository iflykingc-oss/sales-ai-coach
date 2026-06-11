import { useState, useMemo } from 'react';
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
  const [industry, setIndustry] = useState('');
  const [role, setRole] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { addActivity } = useActivityStore();
  const { t } = useI18n();

  const INDUSTRIES = useMemo(() => [
    { value: 'realestate', label: t('industry.realestate') },
    { value: 'auto', label: t('industry.auto') },
    { value: 'saas', label: t('industry.saas') },
    { value: 'insurance', label: t('industry.insurance') },
    { value: 'education', label: t('industry.education') },
    { value: 'medical', label: t('industry.medical') },
    { value: 'finance', label: t('industry.finance') },
    { value: 'retail', label: t('industry.retail') },
    { value: 'other', label: t('industry.other') },
  ], [t]);

  const ROLES = useMemo(() => [
    { value: 'newbie', label: t('role.newbie') },
    { value: 'rep', label: t('role.rep') },
    { value: 'senior', label: t('role.senior') },
    { value: 'manager', label: t('role.manager') },
    { value: 'other', label: t('role.other') },
  ], [t]);

  const { fields, setFieldValue, validateField, validateAll, getVariant, getErrorMessage } = useFormValidation(
    registerSchema,
    { name: '', email: '', password: '', confirmPassword: '' },
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAll()) {
      toast.error(t('common.error'), { description: '请修正错误后再提交' });
      return;
    }

    const data = {
      name: fields.name.value,
      email: fields.email.value,
      password: fields.password.value,
      industry: industry || undefined,
      role: role || undefined,
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
      toast.success(t('auth.registerSuccess'), { description: `欢迎，${data.name}！` });
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
        <p className="mb-6 text-center text-sm text-gray-500">{t('auth.register')}</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.name')}</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-industry" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.industry')} <span className="text-gray-400">({t('common.optional') || '选填'})</span></label>
              <select
                id="reg-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">{t('auth.industry')}</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.value} value={ind.value}>{ind.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-role" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.role')} <span className="text-gray-400">({t('common.optional') || '选填'})</span></label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">{t('auth.role')}</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.email')}</label>
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
            <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.password')}</label>
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
            <label htmlFor="reg-confirm" className="mb-1 block text-sm font-medium text-gray-700">{t('auth.confirmPassword')}</label>
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
                {t('common.loading')}
              </>
            ) : (
              t('auth.register')
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          {t('auth.hasAccount')} <Link to="/login" className="text-primary-600 hover:underline">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
