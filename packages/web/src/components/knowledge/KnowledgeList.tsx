import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, FileText } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { KnowledgeCard } from './KnowledgeCard';
import { useKnowledgeStore, type KnowledgeItem } from '@/stores/knowledgeStore';
import { api } from '@/services/api';

const industryOptions = ['全部', '房地产', '汽车', 'SaaS', '保险', '金融', '零售', '教育'];

export function KnowledgeList() {
  const {
    items, searchQuery, activeFilter,
    setSearchQuery, setActiveFilter,
    setEditingItem, setIsFormOpen, setIsImportOpen, deleteItem,
  } = useKnowledgeStore();
  const queryClient = useQueryClient();

  const { data: knowledgeItems, isLoading } = useQuery<KnowledgeItem[]>({
    queryKey: ['knowledge', 'public'],
    queryFn: async () => {
      const res = await api.get('/knowledge?public_only=true');
      return Array.isArray(res) ? res : res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
    onSuccess: (_: unknown, id: string) => {
      deleteItem(id);
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });

  const displayItems = knowledgeItems || items;

  const filteredItems = displayItems.filter((item: KnowledgeItem) => {
    const matchesSearch = !searchQuery ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'all' || item.industry === activeFilter || item.tags.includes(activeFilter);
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该知识条目吗？')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="搜索知识内容或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="rounded-lg border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {industryOptions.map((opt) => (
                <option key={opt} value={opt === '全部' ? 'all' : opt}>{opt}</option>
              ))}
            </select>
          </div>
          {/* 通用知识由管理员维护，用户只能查看和搜索 */}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="暂无通用知识"
          description="管理员尚未导入行业知识，请联系管理员"
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item: KnowledgeItem) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
