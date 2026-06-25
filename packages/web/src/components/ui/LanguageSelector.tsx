import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LOCALES, setLocale, type Locale } from '@/i18n';
import { cn } from '@/utils/cn';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function LanguageSelector({ variant = 'default', className }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // i18next LanguageDetector handles auto-detection automatically

  const currentLocale = LOCALES[locale];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors',
          variant === 'default'
            ? 'px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-200'
            : 'px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50'
        )}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className={cn(variant === 'default' ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
        <span>{currentLocale.flag}</span>
        {variant === 'default' && (
          <>
            <span>{currentLocale.nativeName}</span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400 border-b border-gray-100">
            选择语言 / Select Language
          </div>
          {Object.entries(LOCALES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => {
                setLocale(key as Locale);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                locale === key
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="text-lg">{value.flag}</span>
              <span className="flex-1 text-left">{value.nativeName}</span>
              {locale === key && (
                <span className="text-primary-500">✓</span>
              )}
            </button>
          ))}
          <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
            🌏 更多语言支持中...
          </div>
        </div>
      )}
    </div>
  );
}
