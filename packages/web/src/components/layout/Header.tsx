import { useUserStore } from '@/stores/userStore';

export function Header() {
  const { user } = useUserStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="text-sm text-gray-500">
        欢迎回来，{user?.name || '用户'}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
}
