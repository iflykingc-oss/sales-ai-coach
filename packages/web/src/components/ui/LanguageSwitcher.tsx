import { useTranslation } from 'react-i18next';
import { setLocale, type Locale } from '@/i18n';
import { cn } from '@/utils/cn';

interface LanguageSwitcherProps {
  /** 显示模式：landing = 只显示中英, full = 显示所有语言 */
  mode?: 'landing' | 'full';
  className?: string;
}

/**
 * 简化的语言切换器
 * - landing 模式：只显示中文和英文切换（用于落地页）
 * - full 模式：显示所有支持的语言（用于注册页、产品页）
 */
export function LanguageSwitcher({ mode = 'landing', className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language as Locale;

  // landing 模式只显示中英文
  const landingLocales: Array<{ key: Locale; label: string; flag: string }> = [
    { key: 'zh', label: '中文', flag: '🇨🇳' },
    { key: 'en', label: 'EN', flag: '🇺🇸' },
  ];

  // full 模式显示所有语言
  const fullLocales: Array<{ key: Locale; label: string; flag: string }> = [
    { key: 'zh', label: '中文', flag: '🇨🇳' },
    { key: 'en', label: 'English', flag: '🇺🇸' },
    { key: 'th', label: 'ไทย', flag: '🇹🇭' },
    { key: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { key: 'ms', label: 'Melayu', flag: '🇲🇾' },
    { key: 'id', label: 'Indonesia', flag: '🇮🇩' },
  ];

  const locales = mode === 'landing' ? landingLocales : fullLocales;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {locales.map(({ key, label, flag }) => (
        <button
          key={key}
          onClick={() => setLocale(key)}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all',
            locale === key
              ? 'bg-primary-100 text-primary-700 shadow-sm'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          )}
          title={label}
        >
          <span className="text-sm">{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
