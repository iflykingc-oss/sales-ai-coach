import { useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/useToast';

export interface CustomScenario {
  id: string;
  name: string;
  industry: string;
  description: string;
  customerPersona: string;
  objectionTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  createdAt: string;
}

interface CustomScenarioBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (scenario: CustomScenario) => void;
}

const INDUSTRY_OPTIONS = [
  'SaaS软件', '医疗器械', '教育培训', '房地产', '金融理财',
  '汽车销售', '保险', '法律服务', '建筑工程', '跨境电商',
  '全球SaaS', '医疗健康', '制造业', '零售', '其他',
];

const OBJECTION_TYPES = [
  '价格异议', '预算不足', '竞品对比', '需求不明确', '决策拖延',
  '信任缺乏', '效果疑虑', '时机不对', '内部阻力', '其他',
];

export function CustomScenarioBuilder({ open, onOpenChange, onSave }: CustomScenarioBuilderProps) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [customerPersona, setCustomerPersona] = useState('');
  const [selectedObjections, setSelectedObjections] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');

  const handleSave = () => {
    if (!name || !industry || !description) {
      toast.error('请填写必填字段');
      return;
    }

    const scenario: CustomScenario = {
      id: `custom-${Date.now()}`,
      name,
      industry,
      description,
      customerPersona,
      objectionTypes: selectedObjections,
      difficulty,
      createdAt: new Date().toISOString(),
    };

    onSave(scenario);
    resetForm();
    onOpenChange(false);
    toast.success('自定义场景已保存');
  };

  const resetForm = () => {
    setName('');
    setIndustry('');
    setDescription('');
    setCustomerPersona('');
    setSelectedObjections([]);
    setDifficulty('medium');
  };

  const toggleObjection = (type: string) => {
    setSelectedObjections((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            创建自定义练习场景
          </DialogTitle>
          <DialogDescription>定义行业、客户画像和异议类型，创建个性化练习场景</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                场景名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：SaaS产品演示、价格谈判、异议处理"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                行业 <span className="text-red-500">*</span>
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">选择行业</option>
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                场景描述 <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="详细描述这个练习场景的背景、目标和关键挑战..."
                rows={3}
              />
            </div>
          </div>

          {/* Customer Persona */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              客户画像（可选）
            </label>
            <Textarea
              value={customerPersona}
              onChange={(e) => setCustomerPersona(e.target.value)}
              placeholder="描述理想客户的特点：职位、性格、决策风格、典型痛点..."
              rows={3}
            />
            <p className="mt-1 text-xs text-gray-500">
              留空将根据难度自动生成客户画像
            </p>
          </div>

          {/* Objection Types */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              预期异议类型（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {OBJECTION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleObjection(type)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    selectedObjections.includes(type)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              难度等级
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'easy', label: '初级', icon: '🟢', desc: '友善型买家' },
                { id: 'medium', label: '中级', icon: '🟡', desc: '分析型买家' },
                { id: 'hard', label: '高级', icon: '🔴', desc: '驱动型买家' },
                { id: 'expert', label: '地狱', icon: '💀', desc: '组合型买家' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id as any)}
                  className={cn(
                    'rounded-lg border-2 p-3 text-center transition-all',
                    difficulty === d.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div className="text-xl">{d.icon}</div>
                  <div className="mt-1 text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-gray-500">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {name && industry && description && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
              <h4 className="text-sm font-medium text-primary-800">场景预览</h4>
              <div className="mt-2 space-y-1 text-sm text-primary-700">
                <p><span className="font-medium">名称：</span>{name}</p>
                <p><span className="font-medium">行业：</span>{industry}</p>
                <p><span className="font-medium">描述：</span>{description.slice(0, 100)}{description.length > 100 ? '...' : ''}</p>
                {selectedObjections.length > 0 && (
                  <p><span className="font-medium">异议类型：</span>{selectedObjections.join('、')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { resetForm(); onOpenChange(false); }}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-1.5 h-4 w-4" />
            保存场景
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
