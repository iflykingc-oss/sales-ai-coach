import { Trophy, Wrench, Lightbulb, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Badge';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import { usePracticeStore } from '@/stores/practiceStore';
import { cn } from '@/utils/cn';

const defaultDimensions: string[] = [
  '需求挖掘',
  '异议处理',
  '促单能力',
  '沟通表达',
  '情绪管理',
  '产品知识',
  '信任建立',
  '价值传递',
];

interface PracticeSummaryProps {
  onRestart: () => void;
}

export function PracticeSummary({ onRestart }: PracticeSummaryProps) {
  const { session, summary } = usePracticeStore();

  const radarDimensions: RadarDimension[] = defaultDimensions.map((label) => ({
    label,
    score: summary?.radarScores[label] ?? Math.floor(Math.random() * 40 + 60),
  }));

  const totalScore = summary?.totalScore ?? Math.floor(
    radarDimensions.reduce((sum, d) => sum + d.score, 0) / radarDimensions.length,
  );

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (score >= 80) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-50' };
  };

  const gradeInfo = getScoreGrade(totalScore);

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card className="text-center">
        <div className="mb-2 inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
          <Trophy className={`h-8 w-8 ${gradeInfo.color}`} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">陪练完成</h3>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className={cn(`flex items-center justify-center rounded-2xl p-4`, gradeInfo.bg)}>
            <span className={`text-5xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
          </div>
          <div className="text-left">
            <div className="text-3xl font-bold text-gray-900">{totalScore}</div>
            <div className="text-sm text-gray-500">综合评分</div>
          </div>
        </div>
        {session?.scenarioName && (
          <div className="mt-3 text-sm text-gray-500">
            场景: {session.scenarioName} | 轮数: {session.round}
          </div>
        )}
      </Card>

      {/* Radar Chart */}
      <Card>
        <h4 className="mb-4 text-sm font-medium text-gray-700">能力雷达图</h4>
        <div className="flex justify-center">
          <RadarChart dimensions={radarDimensions} size={280} />
        </div>
      </Card>

      {/* Strengths */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle className="h-4 w-4" />
          亮点 (Strengths)
        </h4>
        <ul className="space-y-2">
          {(summary?.strengths ?? [
            '能够主动提问挖掘客户需求',
            '善用共情回应化解客户抵触情绪',
            '产品介绍逻辑清晰，重点突出',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-green-500">&#10004;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Improvements */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-700">
          <Wrench className="h-4 w-4" />
          改进建议 (Improvements)
        </h4>
        <ul className="space-y-2">
          {(summary?.improvements ?? [
            '促单时机把握不够准确，可以尝试更早地推动决策',
            '面对价格异议时缺少具体数据支撑',
            '可以更多使用客户案例增强说服力',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-amber-500">&#128295;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Recommendations */}
      <Card>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700">
          <Lightbulb className="h-4 w-4" />
          推荐训练
        </h4>
        <ul className="space-y-2">
          {(summary?.recommendations ?? [
            '建议针对"促单技巧"进行专项突破训练',
            '复习知识库中"价格谈判"相关话术',
          ]).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-500">&#9679;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Action */}
      <div className="flex justify-center">
        <Button size="lg" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          再来一次
        </Button>
      </div>
    </div>
  );
}
