import { Star, Download, FileText, Target, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePluginStore, type Plugin } from '@/stores/pluginStore';
import { getPluginScripts, getPluginScenarios } from '@/data/pluginContent';

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

const pluginCategoryKnowledge: Record<string, string[]> = {
  p1: ['企业级SaaS功能架构与权限设计', 'B端客户决策链分析与关键人策略', '免费试用→付费转化的最佳实践'],
  p2: ['医疗器械法规与NMPA注册流程', '医院采购流程与招标政策解读', '临床学术推广与KOL关系建立'],
  p3: ['教育行业政策与"双减"合规要求', 'K12学员心理与学习动机分析', '家校沟通策略与续费率提升'],
  p4: ['房地产调控政策与限购限贷解读', '按揭贷款计算与税费知识', '客户带看技巧与房源匹配策略'],
  p5: ['金融产品合规销售与适当性管理', '保险条款解读与理赔流程', '市场波动下的客户沟通策略'],
  p6: ['Shopee/Amazon平台规则与优化', '供应链管理与海外仓选品', '东南亚消费者行为分析'],
  p7: ['B2B SaaS metrics (MRR, ARR, NRR)', 'MEDDPIC sales qualification framework', 'Product-led growth (PLG) motion'],
  p8: ['TikTok Shop直播带货运营指南', 'Shopee/Lazada大促活动策划', '东南亚多语言客服标准'],
};

interface PluginDetailProps {
  plugin: Plugin;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const { installPlugin, setActivePlugin } = usePluginStore();
  const scripts = getPluginScripts(plugin.id);
  const scenarios = getPluginScenarios(plugin.id);
  const knowledge = pluginCategoryKnowledge[plugin.id] || ['行业知识加载中...'];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in">
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
          <p className="mt-1 text-lg font-semibold text-gray-900">{scripts.length}</p>
          <p className="text-xs text-gray-500">话术数量</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <Target className="mx-auto h-5 w-5 text-gray-400" />
          <p className="mt-1 text-lg font-semibold text-gray-900">{scenarios.length}</p>
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
          {scripts.map((script) => (
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
          {scenarios.map((scenario) => (
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
            {knowledge.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 text-primary-600">&#8226;</span>
                {item}
              </li>
            ))}
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
