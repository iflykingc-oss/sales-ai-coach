import { Star, Download, FileText, Target, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePluginStore, type Plugin } from '@/stores/pluginStore';

const mockScripts = [
  { id: '1', title: '首访开场白', content: '您好，我是XX公司的顾问，今天来帮您解决...', scenario: '初次拜访' },
  { id: '2', title: '价格异议处理', content: '我理解您的顾虑，让我们来看看这个投资回报...', scenario: '价格谈判' },
  { id: '3', title: '竞品对比回应', content: '您提到的竞品确实不错，不过我们的差异在于...', scenario: '竞品分析' },
  { id: '4', title: '需求挖掘提问', content: '在使用现有方案时，您遇到过哪些痛点呢？', scenario: '需求挖掘' },
  { id: '5', title: '关单促成话术', content: '如果今天的方案您觉得合适，我们可以先...', scenario: '关单' },
];

const mockScenarios = [
  { id: 's1', name: '新客户首次拜访', difficulty: 'beginner' as const, description: '模拟与新客户的初次见面场景' },
  { id: 's2', name: '价格谈判与折扣', difficulty: 'intermediate' as const, description: '处理客户对价格的异议和折扣要求' },
  { id: 's3', name: '竞品对比分析', difficulty: 'intermediate' as const, description: '当客户提到竞品时如何应对' },
  { id: 's4', name: '高压关单场景', difficulty: 'advanced' as const, description: '在客户犹豫不决时促成成交' },
];

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

const difficultyVariants: Record<string, 'success' | 'warning' | 'danger'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

interface PluginDetailProps {
  plugin: Plugin;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const { installPlugin, setActivePlugin } = usePluginStore();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-3xl">
            {plugin.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{plugin.description}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-700">{plugin.rating}</span>
              </div>
              <span className="text-xs text-gray-400">({plugin.reviewCount}条评价)</span>
              <Badge variant={plugin.category === 'domestic' ? 'info' : 'warning'}>
                {plugin.category === 'domestic' ? '国内行业' : '海外行业'}
              </Badge>
              <span className="text-xs text-gray-400">v{plugin.version}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Download className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{plugin.installCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">安装次数</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <FileText className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{plugin.scriptCount}</p>
          <p className="text-xs text-gray-500">话术数量</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Target className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{plugin.scenarioCount}</p>
          <p className="text-xs text-gray-500">场景数量</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <BookOpen className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{plugin.lastUpdated}</p>
          <p className="text-xs text-gray-500">最近更新</p>
        </div>
      </div>

      {/* Industry Scripts Preview */}
      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FileText className="h-4 w-4 text-primary-600" />
          行业话术预览
        </h4>
        <div className="space-y-2">
          {mockScripts.map((script) => (
            <div key={script.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{script.title}</span>
                <Badge>{script.scenario}</Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">{script.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Practice Scenarios */}
      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Target className="h-4 w-4 text-primary-600" />
          陪练场景
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {mockScenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{scenario.name}</span>
                <Badge variant={difficultyVariants[scenario.difficulty]}>
                  {difficultyLabels[scenario.difficulty]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">{scenario.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Base Highlights */}
      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <BookOpen className="h-4 w-4 text-primary-600" />
          知识库亮点
        </h4>
        <div className="rounded-lg bg-primary-50 p-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary-600">&#8226;</span>
              {plugin.category === 'domestic' ? '国内行业政策法规与合规要求' : 'International regulations and compliance'}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary-600">&#8226;</span>
              {plugin.category === 'domestic' ? '行业Top10企业销售方法论' : 'Top enterprise sales methodologies'}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary-600">&#8226;</span>
              {plugin.category === 'domestic' ? '客户画像与消费行为分析' : 'Customer profiling and behavior analysis'}
            </li>
          </ul>
        </div>
      </div>

      {/* Customer Profile Templates */}
      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Users className="h-4 w-4 text-primary-600" />
          客户画像模板
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: '决策者画像', desc: '企业CXO/部门负责人特征' },
            { label: '影响者画像', desc: '技术/采购部门关注点' },
            { label: '使用者画像', desc: '一线员工使用习惯' },
          ].map((t) => (
            <div key={t.label} className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="mt-1 text-xs text-gray-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        {plugin.installed ? (
          plugin.active ? (
            <Button className="flex-1" disabled>当前使用中</Button>
          ) : (
            <Button className="flex-1" onClick={() => setActivePlugin(plugin.id)}>
              切换为当前插件
            </Button>
          )
        ) : (
          <Button className="flex-1" onClick={() => installPlugin(plugin.id)}>
            <Download className="mr-2 h-4 w-4" />
            安装此插件包
          </Button>
        )}
      </div>
    </div>
  );
}
