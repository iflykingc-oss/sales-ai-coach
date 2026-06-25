import { logger } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { X, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/i18n';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'once' | 'recurring' | 'scheduled';
  priority: number;
  publishedAt: string;
  expiresAt: string | null;
  isRead: boolean;
  isDismissed: boolean;
}

export function AnnouncementBanner() {
  const { locale } = useI18n();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 获取公告
  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/announcements');
      const data = (res as any)?.data || [];
      setAnnouncements(data);

      // 自动标记第一条为已读
      if (data.length > 0 && !data[0].isRead) {
        await markAsRead(data[0].id);
      }
    } catch (err) {
      logger.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // 标记已读
  const markAsRead = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/read`);
      setAnnouncements(prev =>
        prev.map(a => a.id === id ? { ...a, isRead: true } : a)
      );
    } catch (err) {
      logger.error('Failed to mark as read:', err);
    }
  };

  // 关闭公告
  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/dismiss`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));

      // 如果关闭的是当前公告，显示下一条
      if (currentIndex >= announcements.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }

      toast.success('公告已关闭');
    } catch (err) {
      logger.error('Failed to dismiss announcement:', err);
    }
  };

  // 切换公告
  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % announcements.length;
    setCurrentIndex(nextIndex);
    if (!announcements[nextIndex].isRead) {
      markAsRead(announcements[nextIndex].id);
    }
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + announcements.length) % announcements.length;
    setCurrentIndex(prevIndex);
    if (!announcements[prevIndex].isRead) {
      markAsRead(announcements[prevIndex].id);
    }
  };

  // 没有公告时不显示
  if (isLoading || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex];
  const unreadCount = announcements.filter(a => !a.isRead).length;

  return (
    <div className="mb-4">
      {/* 公告横幅 */}
      <div className={cn(
        'relative rounded-xl border p-4 transition-all',
        current.priority >= 2
          ? 'border-red-200 bg-red-50'
          : current.priority >= 1
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-blue-200 bg-blue-50'
      )}>
        {/* 关闭按钮 */}
        <button
          onClick={() => handleDismiss(current.id)}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
          title="关闭公告"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 公告头部 */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            current.priority >= 2
              ? 'bg-red-100 text-red-600'
              : current.priority >= 1
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-blue-100 text-blue-600'
          )}>
            <Bell className="h-4 w-4" />
          </div>

          <div className="flex-1 pr-8">
            {/* 标题 */}
            <h3 className={cn(
              'text-sm font-semibold',
              current.priority >= 2
                ? 'text-red-800'
                : current.priority >= 1
                  ? 'text-yellow-800'
                  : 'text-blue-800'
            )}>
              {current.title}
              {!current.isRead && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </h3>

            {/* 内容 */}
            <div className={cn(
              'mt-1 text-sm',
              current.priority >= 2
                ? 'text-red-700'
                : current.priority >= 1
                  ? 'text-yellow-700'
                  : 'text-blue-700',
              !isExpanded && 'line-clamp-2'
            )}>
              {current.content}
            </div>

            {/* 展开/收起按钮 */}
            {current.content.length > 100 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    展开全文
                  </>
                )}
              </button>
            )}

            {/* 底部信息 */}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>
                {new Date(current.publishedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
              </span>

              {/* 公告导航 */}
              {announcements.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    className="hover:text-gray-700"
                  >
                    ←
                  </button>
                  <span>
                    {currentIndex + 1} / {announcements.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="hover:text-gray-700"
                  >
                    →
                  </button>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-600">
                      {unreadCount} 条未读
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
