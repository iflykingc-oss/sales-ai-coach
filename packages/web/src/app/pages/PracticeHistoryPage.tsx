import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Target, Brain, Trophy, Clock, ChevronRight, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

interface PracticeRecord {
  id: string;
  scenario: string;
  industry: string | null;
  rounds: number;
  score: number;
  feedback: any;
  createdAt: string;
}

export default function PracticeHistoryPage() {
  const navigate = useNavigate();
  const [practices, setPractices] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');

  useEffect(() => {
    const fetchPractices = async () => {
      try {
        const res = await api.get('/practices');
        setPractices(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch practices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPractices();
  }, []);

  const filteredPractices = practices.filter((p) => {
    const matchesSearch = !searchQuery ||
      p.scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.industry && p.industry.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesIndustry = filterIndustry === 'all' || p.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  const industries = [...new Set(practices.map((p) => p.industry).filter((i): i is string => i !== null && i !== undefined))];

  const getScoreColor = (score: number) => {
    const normalizedScore = score > 1 ? score : Math.round(score * 100);
    if (normalizedScore >= 85) return 'text-green-600 bg-green-50';
    if (normalizedScore >= 75) return 'text-blue-600 bg-blue-50';
    if (normalizedScore >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreGrade = (score: number) => {
    const normalizedScore = score > 1 ? score : Math.round(score * 100);
    if (normalizedScore >= 90) return 'S';
    if (normalizedScore >= 80) return 'A';
    if (normalizedScore >= 70) return 'B';
    if (normalizedScore >= 60) return 'C';
    return 'D';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleViewDetail = (practiceId: string) => {
    navigate(`/app/review`, { state: { practiceSessionId: practiceId } });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">练习历史</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看过去的练习记录，回顾成长轨迹
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="text-center">
          <Target className="mx-auto h-5 w-5 text-primary-500" />
          <p className="mt-2 text-xl font-bold text-gray-900">{practices.length}</p>
          <p className="text-xs text-gray-500">总练习次数</p>
        </Card>
        <Card className="text-center">
          <Trophy className="mx-auto h-5 w-5 text-amber-500" />
          <p className="mt-2 text-xl font-bold text-gray-900">
            {practices.length > 0
              ? Math.round(practices.reduce((sum, p) => sum + (p.score > 1 ? p.score : p.score * 100), 0) / practices.length)
              : 0}
          </p>
          <p className="text-xs text-gray-500">平均分数</p>
        </Card>
        <Card className="text-center">
          <Brain className="mx-auto h-5 w-5 text-purple-500" />
          <p className="mt-2 text-xl font-bold text-gray-900">
            {practices.reduce((sum, p) => sum + p.rounds, 0)}
          </p>
          <p className="text-xs text-gray-500">总对话轮数</p>
        </Card>
        <Card className="text-center">
          <Clock className="mx-auto h-5 w-5 text-green-500" />
          <p className="mt-2 text-xl font-bold text-gray-900">
            {practices.length > 0 ? formatDate(practices[0].createdAt) : '-'}
          </p>
          <p className="text-xs text-gray-500">最近练习</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索场景或行业..."
            className="pl-9"
          />
        </div>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">全部行业</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {/* Practice List */}
      {filteredPractices.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="暂无练习记录"
          description="开始你的第一次AI陪练吧"
          action={{ label: '开始练习', onClick: () => navigate('/app/practice') }}
        />
      ) : (
        <div className="space-y-3">
          {filteredPractices.map((practice) => (
            <div
              key={practice.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleViewDetail(practice.id)}
            >
              <Card>
              <div className="flex items-center gap-4">
                {/* Score Badge */}
                <div className={cn(
                  'flex h-14 w-14 flex-col items-center justify-center rounded-xl',
                  getScoreColor(practice.score)
                )}>
                  <span className="text-lg font-bold">{getScoreGrade(practice.score)}</span>
                  <span className="text-[10px]">
                    {practice.score > 1 ? practice.score : Math.round(practice.score * 100)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {practice.scenario || '自由对练'}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    {practice.industry && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">
                        {practice.industry}
                      </span>
                    )}
                    <span>{practice.rounds} 轮对话</span>
                    <span>{formatDate(practice.createdAt)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
