import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge, Card } from '@/components/ui/Badge';
import { useReviewStore } from '@/stores/reviewStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface HistoryItem {
  id: string;
  date: string;
  overallScore: number;
  scenarioType?: string;
  summary: string;
}

export function ReviewHistory() {
  const { history, selectedDate, selectedScenario, setSelectedDate, setSelectedScenario } = useReviewStore();

  const { data: reviewHistory } = useQuery<HistoryItem[]>({
    queryKey: ['reviews'],
    queryFn: async () => {
      const res = await api.get('/reviews');
      return Array.isArray(res) ? res : res.data || [];
    },
  });

  const displayHistory = reviewHistory || history;

  const filteredHistory = displayHistory.filter((item: HistoryItem) => {
    const matchesDate = !selectedDate || item.date === selectedDate;
    const matchesScenario = !selectedScenario || item.scenarioType === selectedScenario;
    return matchesDate && matchesScenario;
  });

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'success' as const, label: '优秀' };
    if (score >= 80) return { variant: 'info' as const, label: '良好' };
    if (score >= 70) return { variant: 'warning' as const, label: '一般' };
    return { variant: 'danger' as const, label: '需改进' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">历史复盘</h3>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value || null)}
            className="w-auto"
          />
          <select
            value={selectedScenario || ''}
            onChange={(e) => setSelectedScenario(e.target.value || null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">全部场景</option>
            <option value="场景模拟">场景模拟</option>
            <option value="实战对练">实战对练</option>
            <option value="专项突破">专项突破</option>
          </select>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <Card className="py-8 text-center">
          <Calendar className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">暂无历史复盘记录</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Timeline */}
          <div className="relative border-l-2 border-gray-200 pl-6">
            {filteredHistory.map((item: HistoryItem) => {
              const badgeInfo = getScoreBadge(item.overallScore);
              return (
                <div key={item.id} className="relative pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary-500 ring-4 ring-white" />
                  <Card className="transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{item.date}</span>
                          {item.scenarioType && (
                            <Badge variant="default">{item.scenarioType}</Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className={cn(
                          'text-xl font-bold',
                          badgeInfo.variant === 'success' ? 'text-green-600' :
                          badgeInfo.variant === 'info' ? 'text-blue-600' :
                          badgeInfo.variant === 'warning' ? 'text-amber-600' : 'text-red-600',
                        )}>
                          {item.overallScore}
                        </div>
                        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
