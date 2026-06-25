import { Menu, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { t } = useTranslation('layout');
  const { user } = useUserStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4" role="banner">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label={t('header.openMenu')}
          aria-expanded="false"
          aria-controls="sidebar-navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-sm text-gray-500">
          {user ? (
            <>{t('header.welcome')}<span className="font-medium text-gray-700">{user.name}</span></>
          ) : (
            t('header.loading')
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSelector variant="compact" />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700"
          role="img"
          aria-label={`${t('header.userLabel')}: ${user?.name || t('header.notLoggedIn')}`}
        >
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
