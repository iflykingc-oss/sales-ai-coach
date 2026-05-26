import { useState } from 'react';
import { MessageSquare, User, Bot, ChevronDown, ChevronUp, Filter, BookOpen, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select, SelectItem } from '@/components/ui/Select';
import type { DialogueChain, ConversationStage, CustomerBranch, DialogueStyle } from '@/data/pluginContent';
import { getPluginDialogueChains, stageLabels, difficultyLabels } from '@/data/pluginContent';
import { cn } from '@/utils/cn';

const stageColors: Record<ConversationStage, string> = {
  introduction: 'bg-blue-50 text-blue-700 border-blue-200',
  qualification: 'bg-purple-50 text-purple-700 border-purple-200',
  value_proposition: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  needs_analysis: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  solution: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  objection: 'bg-amber-50 text-amber-700 border-amber-200',
  close: 'bg-green-50 text-green-700 border-green-200',
};

const sentimentColors: Record<CustomerBranch['sentiment'], string> = {
  positive: 'border-green-300 bg-green-50/50 hover:bg-green-50',
  neutral: 'border-gray-300 bg-gray-50/50 hover:bg-gray-50',
  negative: 'border-red-300 bg-red-50/50 hover:bg-red-50',
};

const sentimentLabels: Record<CustomerBranch['sentiment'], string> = {
  positive: '积极回应',
  neutral: '中性回应',
  negative: '异议/抗拒',
};

const styleLabels: Record<DialogueStyle, string> = {
  enthusiastic: '热情风格',
  professional: '专业风格',
  concise: '简洁风格',
};

interface Props {
  pluginId: string;
}

export function DialogueChainViewer({ pluginId }: Props) {
  const chains = getPluginDialogueChains(pluginId);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [_filterStyle, _setFilterStyle] = useState<DialogueStyle>('enthusiastic');
  const [expandedChainId, setExpandedChainId] = useState<string | null>(null);
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());

  const filteredChains = chains.filter((chain) => {
    const matchesStage = filterStage === 'all' || chain.stage === filterStage;
    const matchesDifficulty = filterDifficulty === 'all' || chain.difficulty === filterDifficulty;
    return matchesStage && matchesDifficulty;
  });

  const toggleChain = (id: string) => {
    setExpandedChainId(expandedChainId === id ? null : id);
  };

  const toggleBranch = (branchId: string) => {
    setExpandedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  if (chains.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="暂无对话链"
        description="当前插件尚未配置多轮对话链"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          筛选对话链
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">销售阶段</label>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectItem value="all">全部阶段</SelectItem>
              {Object.entries(stageLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">难度</label>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectItem value="all">全部难度</SelectItem>
              {(['beginner', 'intermediate', 'advanced'] as const).map((key) => (
                <SelectItem key={key} value={key}>{difficultyLabels[key]}</SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">风格</label>
            <Select value={_filterStyle} onValueChange={(v) => _setFilterStyle(v as DialogueStyle)}>
              {(['enthusiastic', 'professional', 'concise'] as const).map((key) => (
                <SelectItem key={key} value={key}>{styleLabels[key]}</SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Chain List */}
      <div className="space-y-3">
        {filteredChains.map((chain) => {
          const isExpanded = expandedChainId === chain.id;
          return (
            <Card key={chain.id} className="overflow-hidden">
              {/* Chain Header */}
              <button
                type="button"
                onClick={() => toggleChain(chain.id)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50/50"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{chain.title}</span>
                    <p className="text-xs text-gray-500">{chain.scenario}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'rounded-full border px-2 py-0.5 text-xs font-medium',
                    stageColors[chain.stage],
                  )}>
                    {stageLabels[chain.stage]}
                  </span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    chain.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    chain.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700',
                  )}>
                    {difficultyLabels[chain.difficulty]}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {/* Chain Body */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <div className="space-y-3">
                    {chain.turns.map((turn, turnIdx) => (
                      <TurnItem
                        key={turnIdx}
                        turn={turn}
                        turnIndex={turnIdx}
                        expandedBranchIds={expandedBranchIds}
                        onToggleBranch={toggleBranch}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filteredChains.length === 0 && (
          <EmptyState
            icon={<Filter className="h-6 w-6" />}
            title="无匹配的对话链"
            description="尝试调整筛选条件"
            className="py-12"
          />
        )}
      </div>
    </div>
  );
}

interface TurnItemProps {
  turn: DialogueChain['turns'][number];
  turnIndex: number;
  expandedBranchIds: Set<string>;
  onToggleBranch: (branchId: string) => void;
}

function TurnItem({ turn, turnIndex, expandedBranchIds, onToggleBranch }: TurnItemProps) {
  const isSeller = turn.speaker === 'seller';

  return (
    <div className={cn('flex gap-3', isSeller ? '' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
        isSeller ? 'bg-primary-600' : 'bg-gray-500',
      )}>
        {isSeller ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Message */}
      <div className={cn(
        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
        isSeller
          ? 'bg-primary-50 text-primary-900'
          : 'bg-gray-100 text-gray-900',
      )}>
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className={cn(
            'text-xs font-medium',
            isSeller ? 'text-primary-600' : 'text-gray-500',
          )}>
            {isSeller ? '销售顾问' : '客户'}
          </span>
          {isSeller && (
            <span className="text-[10px] text-gray-400">#{turnIndex + 1}</span>
          )}
        </div>
        <p className="leading-relaxed whitespace-pre-line">{turn.text}</p>

        {/* Customer branches */}
        {turn.branches && turn.branches.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-gray-200 pt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Lightbulb className="h-3 w-3" />
              客户回应分支
            </div>
            {turn.branches.map((branch) => {
              const isBranchExpanded = expandedBranchIds.has(branch.id);
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => onToggleBranch(branch.id)}
                  className={cn(
                    'w-full rounded-lg border p-2 text-left transition-colors',
                    sentimentColors[branch.sentiment],
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'text-xs font-medium',
                        branch.sentiment === 'positive' ? 'text-green-600' :
                        branch.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600',
                      )}>
                        {sentimentLabels[branch.sentiment]}
                      </span>
                      <span className="text-[10px] text-gray-400">· {branch.pattern}</span>
                    </div>
                    {isBranchExpanded ? (
                      <ChevronUp className="h-3 w-3 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  {isBranchExpanded && (
                    <div className="mt-1.5 space-y-1.5">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">客户：</span>{branch.text}
                      </p>
                      <p className="text-xs text-primary-700">
                        <span className="font-medium">跟进：</span>{branch.followup}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
