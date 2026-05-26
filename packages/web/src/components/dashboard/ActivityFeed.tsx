import {
  MessageSquare,
  Dumbbell,
  BookOpen,
  ClipboardList,
  BarChart3,
  Package,
  LogIn,
  LogOut,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useActivityStore, type Activity } from '@/stores/activityStore';

const ACTIVITY_ICONS: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  script_generate: MessageSquare,
  practice_session: Dumbbell,
  knowledge_create: BookOpen,
  knowledge_review: ClipboardList,
  review_analyze: BarChart3,
  plugin_install: Package,
  login: LogIn,
  logout: LogOut,
};

const ACTIVITY_ICON_COLORS: Record<Activity['type'], string> = {
  script_generate: 'bg-blue-100 text-blue-600',
  practice_session: 'bg-green-100 text-green-600',
  knowledge_create: 'bg-purple-100 text-purple-600',
  knowledge_review: 'bg-orange-100 text-orange-600',
  review_analyze: 'bg-cyan-100 text-cyan-600',
  plugin_install: 'bg-pink-100 text-pink-600',
  login: 'bg-emerald-100 text-emerald-600',
  logout: 'bg-gray-100 text-gray-500',
};

function formatDateGroup(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (activityDate.getTime() === today.getTime()) return '今天';
  if (activityDate.getTime() === yesterday.getTime()) return '昨天';
  return '更早';
}

function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICONS[activity.type];
  const colorClass = ACTIVITY_ICON_COLORS[activity.type];

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{activity.title}</p>
        {activity.description && (
          <p className="truncate text-xs text-gray-500">{activity.description}</p>
        )}
      </div>
      <span className="flex-shrink-0 text-xs text-gray-400">{formatTime(activity.timestamp)}</span>
    </div>
  );
}

export default function ActivityFeed() {
  const activities = useActivityStore((s) => s.activities);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10">
        <div className="mb-3 rounded-full bg-gray-100 p-3 text-gray-300">
          <BarChart3 className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-gray-500">暂无活动</p>
        <p className="mt-1 text-xs text-gray-400">你的操作记录将在这里显示</p>
      </div>
    );
  }

  const groups: Record<string, Activity[]> = {};
  for (const activity of activities) {
    const group = formatDateGroup(activity.timestamp);
    if (!groups[group]) groups[group] = [];
    groups[group].push(activity);
  }

  const groupOrder = ['今天', '昨天', '更早'];

  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">活动动态</h3>
      <div className="space-y-4">
        {groupOrder.map((group) => {
          const items = groups[group];
          if (!items) return null;
          return (
            <div key={group}>
              <p className="mb-2 text-xs font-medium text-gray-400">{group}</p>
              <div className="space-y-3">
                {items.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
