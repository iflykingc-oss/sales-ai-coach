import { useState } from 'react';
import { Eye, EyeOff, Save, AlertTriangle, Cpu, Plus, Trash2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { useAdminStore, type ModelConfig } from '@/stores/adminStore';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';

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
  const { models, updateModel, addModel, deleteModel } = useAdminStore();
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Add model dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newModel, setNewModel] = useState<Partial<ModelConfig>>({
    name: '',
    provider: 'OpenAI',
    baseUrl: '',
    apiKey: '',
    modelId: '',
    temperature: 0.7,
    maxTokens: 4096,
    repetitionPenalty: 1.0,
    usageQuota: 10000,
    usageCurrent: 0,
    alertThreshold: 80,
    status: 'active',
  });

  // Test state
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const handleSave = async (model: ModelConfig) => {
    setSaving(model.id);
    try {
      await api.put(`/admin/models/${model.id}`, model);
      toast.success('模型配置已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(null);
    }
  };

  const handleAddModel = () => {
    if (!newModel.name || !newModel.apiKey || !newModel.modelId) {
      toast.error('请填写必填字段');
      return;
    }

    const model: ModelConfig = {
      id: `model-${Date.now()}`,
      name: newModel.name || '',
      provider: newModel.provider || 'OpenAI',
      baseUrl: newModel.baseUrl || '',
      apiKey: newModel.apiKey || '',
      modelId: newModel.modelId || '',
      temperature: newModel.temperature || 0.7,
      maxTokens: newModel.maxTokens || 4096,
      repetitionPenalty: newModel.repetitionPenalty || 1.0,
      usageQuota: newModel.usageQuota || 10000,
      usageCurrent: 0,
      alertThreshold: newModel.alertThreshold || 80,
      status: 'active',
    };

    addModel(model);
    setShowAddDialog(false);
    setNewModel({
      name: '',
      provider: 'OpenAI',
      baseUrl: '',
      apiKey: '',
      modelId: '',
      temperature: 0.7,
      maxTokens: 4096,
      repetitionPenalty: 1.0,
      usageQuota: 10000,
      usageCurrent: 0,
      alertThreshold: 80,
      status: 'active',
    });
    toast.success('模型添加成功');
  };

  const handleTestModel = async (model: ModelConfig) => {
    setTesting(model.id);
    setTestResult(null);
    try {
      const res = await api.post('/admin/models/test', {
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        modelId: model.modelId,
      });
      const data = res.data || res;
      setTestResult({
        id: model.id,
        success: data.success || false,
        message: data.message || (data.success ? '连接成功' : '连接失败'),
      });
      if (data.success) {
        toast.success('模型测试成功');
      } else {
        toast.error('模型测试失败');
      }
    } catch (err: any) {
      setTestResult({
        id: model.id,
        success: false,
        message: err.message || '测试请求失败',
      });
      toast.error('模型测试失败');
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteModel = (id: string) => {
    if (confirm('确定要删除这个模型配置吗？')) {
      deleteModel(id);
      toast.success('模型已删除');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">模型配置</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          添加模型
        </Button>
      </div>

      {models.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-6 w-6" />}
          title="暂无模型配置"
          description="点击上方按钮添加自定义AI模型配置"
          className="py-20"
        />
      ) : (
        <div className="space-y-4">
          {models.map((model) => {
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
                        {testResult?.id === model.id && (
                          <Badge variant={testResult.success ? 'success' : 'danger'}>
                            {testResult.success ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                            {testResult.message}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{model.provider} · {model.modelId} · API 配额 {usagePercentage}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleTestModel(model); }}
                      disabled={testing === model.id}
                    >
                      <TestTube className="mr-1 h-3.5 w-3.5" />
                      {testing === model.id ? '测试中...' : '测试'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDeleteModel(model.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                    <span className="text-xs text-gray-400">
                      {isExpanded ? '收起' : '展开设置'}
                    </span>
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">模型ID</label>
                        <Input
                          value={model.modelId || ''}
                          onChange={(e) =>
                            updateModel(model.id, { modelId: e.target.value })
                          }
                          placeholder="gpt-4, claude-3, etc."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Base URL</label>
                        <Input
                          value={model.baseUrl || ''}
                          onChange={(e) =>
                            updateModel(model.id, { baseUrl: e.target.value })
                          }
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                    {/* Enable/Disable Toggle */}
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">模型状态</p>
                        <p className="text-xs text-gray-500">
                          {model.status === 'active' ? '模型已启用，可用于生成' : '模型已禁用，不会被使用'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = model.status === 'active' ? 'inactive' : 'active';
                          updateModel(model.id, { status: newStatus });
                          toast.success(newStatus === 'active' ? '模型已启用' : '模型已禁用');
                        }}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          model.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                            model.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Save Button */}
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        disabled={saving === model.id}
                        onClick={(e) => { e.stopPropagation(); handleSave(model); }}
                      >
                        <Save className="mr-1.5 h-4 w-4" />
                        {saving === model.id ? '保存中...' : '保存设置'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Model Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加自定义模型</DialogTitle>
            <DialogDescription>配置自定义AI模型的连接信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">模型名称 *</label>
                <Input
                  value={newModel.name || ''}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder="My GPT-4"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">提供商</label>
                <select
                  value={newModel.provider || 'OpenAI'}
                  onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="Google">Google</option>
                  <option value="Azure">Azure</option>
                  <option value="Custom">自定义</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">模型ID *</label>
              <Input
                value={newModel.modelId || ''}
                onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                placeholder="gpt-4, claude-3-opus, gemini-pro, etc."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Base URL</label>
              <Input
                value={newModel.baseUrl || ''}
                onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1 (留空使用默认)"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">API Key *</label>
              <Input
                type="password"
                value={newModel.apiKey || ''}
                onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Temperature</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={newModel.temperature || 0.7}
                  onChange={(e) => setNewModel({ ...newModel, temperature: parseFloat(e.target.value) || 0.7 })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Max Tokens</label>
                <Input
                  type="number"
                  value={newModel.maxTokens || 4096}
                  onChange={(e) => setNewModel({ ...newModel, maxTokens: parseInt(e.target.value) || 4096 })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">配额</label>
                <Input
                  type="number"
                  value={newModel.usageQuota || 10000}
                  onChange={(e) => setNewModel({ ...newModel, usageQuota: parseInt(e.target.value) || 10000 })}
                />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              添加后可在模型列表中点击"测试"按钮验证配置是否正确。
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddModel}>添加模型</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
