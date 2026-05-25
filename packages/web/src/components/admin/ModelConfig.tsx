import { useState } from 'react';
import { Eye, EyeOff, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { useAdminStore, type ModelConfig } from '@/stores/adminStore';

const mockModels: ModelConfig[] = [
  {
    id: 'm1', name: 'Qwen-Max', provider: '阿里云', status: 'active',
    temperature: 0.7, maxTokens: 4096, repetitionPenalty: 1.1,
    apiKey: 'sk-xxxxxxxxxxxxxxxxxxxx', usageQuota: 1000000, usageCurrent: 420000, alertThreshold: 80,
  },
  {
    id: 'm2', name: 'GPT-4o', provider: 'OpenAI', status: 'active',
    temperature: 0.8, maxTokens: 8192, repetitionPenalty: 1.05,
    apiKey: 'sk-proj-xxxxxxxxxxxxxxxx', usageQuota: 500000, usageCurrent: 180000, alertThreshold: 85,
  },
  {
    id: 'm3', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', status: 'active',
    temperature: 0.7, maxTokens: 4096, repetitionPenalty: 1.1,
    apiKey: 'sk-ant-xxxxxxxxxxxxxxxx', usageQuota: 500000, usageCurrent: 120000, alertThreshold: 80,
  },
  {
    id: 'm4', name: 'Minimax', provider: 'MiniMax', status: 'inactive',
    temperature: 0.6, maxTokens: 4096, repetitionPenalty: 1.2,
    apiKey: 'xxxxxxxxxxxxxxxx', usageQuota: 200000, usageCurrent: 50000, alertThreshold: 75,
  },
];

const statusLabels: Record<string, string> = {
  active: '正常',
  inactive: '已停用',
  error: '异常',
};

const statusVariants: Record<string, 'success' | 'default' | 'danger'> = {
  active: 'success',
  inactive: 'default',
  error: 'danger',
};

export function ModelConfig() {
  const { models, setModels, updateModel } = useAdminStore();

  if (models.length === 0) {
    setModels(mockModels);
  }

  const displayModels = models.length > 0 ? models : mockModels;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {displayModels.map((model) => {
        const isExpanded = expandedId === model.id;
        const usagePercentage = Math.round((model.usageCurrent / model.usageQuota) * 100);
        const isNearQuota = usagePercentage >= model.alertThreshold;

        return (
          <Card key={model.id}>
            {/* Header */}
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => setExpandedId(isExpanded ? null : model.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-700">
                  {model.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{model.name}</span>
                    <Badge variant={statusVariants[model.status]}>{statusLabels[model.status]}</Badge>
                    {isNearQuota && (
                      <Badge variant="danger">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        用量预警
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{model.provider} · API 配额 {usagePercentage}%</p>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {isExpanded ? '收起' : '展开设置'}
              </div>
            </div>

            {/* Usage Bar */}
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    isNearQuota ? 'bg-red-500' : 'bg-primary-500',
                  )}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>{model.usageCurrent.toLocaleString()} 调用</span>
                <span>配额 {model.usageQuota.toLocaleString()}</span>
              </div>
            </div>

            {/* Expanded Settings */}
            {isExpanded && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Temperature</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={model.temperature}
                      onChange={(e) =>
                        updateModel(model.id, { temperature: parseFloat(e.target.value) || 0.7 })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Max Tokens</label>
                    <Input
                      type="number"
                      value={model.maxTokens}
                      onChange={(e) =>
                        updateModel(model.id, { maxTokens: parseInt(e.target.value) || 4096 })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Repetition Penalty</label>
                    <Input
                      type="number"
                      step="0.05"
                      min="1"
                      max="2"
                      value={model.repetitionPenalty}
                      onChange={(e) =>
                        updateModel(model.id, { repetitionPenalty: parseFloat(e.target.value) || 1.0 })
                      }
                    />
                  </div>
                </div>

                {/* API Key */}
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">API Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[model.id] ? 'text' : 'password'}
                        value={model.apiKey}
                        onChange={(e) =>
                          updateModel(model.id, { apiKey: e.target.value })
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() =>
                          setShowKeys({ ...showKeys, [model.id]: !showKeys[model.id] })
                        }
                      >
                        {showKeys[model.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alert Threshold */}
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    用量预警阈值 (%)
                  </label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={model.alertThreshold}
                    onChange={(e) =>
                      updateModel(model.id, { alertThreshold: parseInt(e.target.value) || 80 })
                    }
                  />
                </div>

                {/* Save Button */}
                <div className="mt-4 flex justify-end">
                  <Button size="sm">
                    <Save className="mr-1.5 h-4 w-4" />
                    保存设置
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
