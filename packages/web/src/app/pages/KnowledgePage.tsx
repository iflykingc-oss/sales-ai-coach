import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { KnowledgeList } from '@/components/knowledge/KnowledgeList';
import { KnowledgeForm } from '@/components/knowledge/KnowledgeForm';
import { KnowledgeImport } from '@/components/knowledge/KnowledgeImport';
import { CompanyKnowledge } from '@/components/CompanyKnowledge';
import { BookOpen, Building2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type TabType = 'personal' | 'company';

export default function KnowledgePage() {
  const { isFormOpen, isImportOpen, setIsFormOpen, setIsImportOpen } = useKnowledgeStore();
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">知识库</h2>
        <p className="mt-1 text-sm text-gray-500">
          管理你的销售知识资产，自动沉淀、智能检索、持续进化
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('personal')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'personal'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <BookOpen className="h-4 w-4" />
          个人知识
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
      {activeTab === 'personal' ? (
        <>
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
