import { Target, MessageSquare, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

export type PracticeMode = 'scenario' | 'freeform' | 'special';

interface PracticeModeCard {
  mode: PracticeMode;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgLight: string;
}

const modes: PracticeModeCard[] = [
  {
    mode: 'scenario',
    icon: <Target className="h-6 w-6" />,
    title: '场景模拟',
    description: '选择行业特定场景，模拟真实销售情境',
    color: 'text-blue-600',
    bgLight: 'bg-blue-50 border-blue-200',
  },
  {
    mode: 'freeform',
    icon: <MessageSquare className="h-6 w-6" />,
    title: '实战对练',
    description: '自由对话模式，与AI客户进行真实对练',
    color: 'text-green-600',
    bgLight: 'bg-green-50 border-green-200',
  },
  {
    mode: 'special',
    icon: <Zap className="h-6 w-6" />,
    title: '专项突破',
    description: '针对异议处理、促单等专项技能强化训练',
    color: 'text-amber-600',
    bgLight: 'bg-amber-50 border-amber-200',
  },
];

interface PracticeModeSelectorProps {
  onSelect: (mode: PracticeMode) => void;
  selectedMode?: PracticeMode;
}

export function PracticeModeSelector({ onSelect, selectedMode }: PracticeModeSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {modes.map((m) => (
        <button
          key={m.mode}
          onClick={() => onSelect(m.mode)}
          className={cn(
            'rounded-xl border-2 p-5 text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            selectedMode === m.mode
              ? cn('border-primary-500 bg-primary-50 shadow-md', m.bgLight)
              : 'border-gray-200 bg-white hover:border-gray-300',
          )}
        >
          <div className={cn('mb-3 inline-flex rounded-lg p-2.5', m.bgLight, m.color)}>
            {m.icon}
          </div>
          <h3 className="text-base font-semibold text-gray-900">{m.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{m.description}</p>
        </button>
      ))}
    </div>
  );
}
