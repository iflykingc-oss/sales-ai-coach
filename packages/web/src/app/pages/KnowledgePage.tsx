import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { KnowledgeList } from '@/components/knowledge/KnowledgeList';
import { KnowledgeForm } from '@/components/knowledge/KnowledgeForm';
import { KnowledgeImport } from '@/components/knowledge/KnowledgeImport';
import { CompanyKnowledge } from '@/components/CompanyKnowledge';
import { BookOpen, Building2, Shield } from 'lucide-react';
import { cn } from '@/utils/cn';

type TabType = 'general' | 'company';

export default function KnowledgePage() {
  const { isFormOpen, isImportOpen, setIsFormOpen, setIsImportOpen } = useKnowledgeStore();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">知识库</h2>
        <p className="mt-1 text-sm text-gray-500">
          管理销售知识资产，通用知识由管理员维护，公司知识由你配置
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">隐私说明</p>
            <p>上传的文件仅用于为您生成更好的话术，平台无法查看您的内容。您可随时在「数据权利」页面一键永久删除所有上传数据。</p>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'general'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <BookOpen className="h-4 w-4" />
          通用知识
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'company'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Building2 className="h-4 w-4" />
          公司知识
        </button>
      </div>

      {/* 内容 */}
      {activeTab === 'general' ? (
        <>
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              📚 通用知识由管理员统一维护，包含行业销售策略、异议处理方法论等，所有用户共享
            </p>
          </div>
          <KnowledgeList />
          <KnowledgeForm
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) useKnowledgeStore.getState().setEditingItem(null);
            }}
          />
          <KnowledgeImport
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
          />
        </>
      ) : (
        <CompanyKnowledge />
      )}
    </div>
  );
}
