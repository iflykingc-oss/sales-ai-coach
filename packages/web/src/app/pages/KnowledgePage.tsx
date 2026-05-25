import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { KnowledgeList } from '@/components/knowledge/KnowledgeList';
import { KnowledgeForm } from '@/components/knowledge/KnowledgeForm';
import { KnowledgeImport } from '@/components/knowledge/KnowledgeImport';

export default function KnowledgePage() {
  const { isFormOpen, isImportOpen, setIsFormOpen, setIsImportOpen } = useKnowledgeStore();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">个人知识库</h2>
        <p className="mt-1 text-sm text-gray-500">
          管理你的销售知识资产，自动沉淀、智能检索、持续进化
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
    </div>
  );
}
