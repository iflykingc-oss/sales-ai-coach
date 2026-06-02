import { useState } from 'react';
import { Medal, Crown, TrendingUp, Target, Brain, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  totalPractices: number;
  avgScore: number;
  bestDimension: string;
  improvement: number;
  streak: number;
}

// Mock data - in production, fetch from API
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: '张三', avatar: '👨‍💼', totalPractices: 45, avgScore: 87, bestDimension: '异议处理', improvement: 12, streak: 7 },
  { rank: 2, name: '李四', avatar: '👩‍💼', totalPractices: 38, avgScore: 84, bestDimension: '需求挖掘', improvement: 8, streak: 5 },
  { rank: 3, name: '王五', avatar: '👨‍💻', totalPractices: 42, avgScore: 82, bestDimension: '促单能力', improvement: 15, streak: 3 },
  { rank: 4, name: '赵六', avatar: '👩‍💻', totalPractices: 35, avgScore: 79, bestDimension: '沟通表达', improvement: 10, streak: 4 },
  { rank: 5, name: '钱七', avatar: '👨‍🏫', totalPractices: 28, avgScore: 76, bestDimension: '信任建立', improvement: 18, streak: 2 },
  { rank: 6, name: '孙八', avatar: '👩‍🏫', totalPractices: 32, avgScore: 74, bestDimension: '价值传递', improvement: 6, streak: 1 },
  { rank: 7, name: '周九', avatar: '👨‍🎓', totalPractices: 25, avgScore: 71, bestDimension: '情绪管理', improvement: 20, streak: 0 },
  { rank: 8, name: '吴十', avatar: '👩‍🎓', totalPractices: 20, avgScore: 68, bestDimension: '产品知识', improvement: 5, streak: 0 },
];

const TIME_FILTERS = [
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'quarter', label: '本季度' },
  { id: 'all', label: '全部' },
];

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState('month');

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
    return 'bg-white border-gray-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">团队排行榜</h1>
          <p className="mt-1 text-sm text-gray-500">
            比较团队成员的练习表现，发现最佳实践
          </p>
        </div>
        <div className="flex items-center gap-2">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                timeFilter === filter.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="text-center">
          <Users className="mx-auto h-6 w-6 text-primary-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">8</p>
          <p className="text-sm text-gray-500">团队成员</p>
        </Card>
        <Card className="text-center">
          <Target className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">265</p>
          <p className="text-sm text-gray-500">总练习次数</p>
        </Card>
        <Card className="text-center">
          <Brain className="mx-auto h-6 w-6 text-purple-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">78</p>
          <p className="text-sm text-gray-500">平均分数</p>
        </Card>
        <Card className="text-center">
          <TrendingUp className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">+11%</p>
          <p className="text-sm text-gray-500">平均提升</p>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <div className="space-y-3">
          {MOCK_LEADERBOARD.map((entry) => (
            <div
              key={entry.rank}
              className={cn(
                'flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-md',
                getRankBg(entry.rank)
              )}
            >
              {/* Rank */}
              <div className="flex h-10 w-10 items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar & Name */}
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{entry.avatar}</span>
                <div>
                  <p className="font-semibold text-gray-900">{entry.name}</p>
                  <p className="text-xs text-gray-500">
                    最强维度: {entry.bestDimension}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">{entry.totalPractices}</p>
                  <p className="text-xs text-gray-500">练习次数</p>
                </div>
                <div className="text-center">
                  <p className={cn('text-sm font-bold', getScoreColor(entry.avgScore))}>
                    {entry.avgScore}
                  </p>
                  <p className="text-xs text-gray-500">平均分</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      +{entry.improvement}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">提升</p>
                </div>
                {entry.streak > 0 && (
                  <Badge variant="success" className="ml-2">
                    🔥 {entry.streak}天连续
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dimension Comparison */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">维度对比</h3>
        <div className="space-y-4">
          {['需求挖掘', '异议处理', '促单能力', '沟通表达', '情绪管理', '产品知识', '信任建立', '价值传递'].map((dim) => {
            const teamAvg = Math.floor(Math.random() * 20) + 65;
            const topScore = Math.min(teamAvg + Math.floor(Math.random() * 15), 95);
            return (
              <div key={dim} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{dim}</span>
                  <span className="text-gray-500">团队平均: {teamAvg}分</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-primary-500 transition-all"
                    style={{ width: `${teamAvg}%` }}
                  />
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-gray-400">最高: {topScore}分</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
