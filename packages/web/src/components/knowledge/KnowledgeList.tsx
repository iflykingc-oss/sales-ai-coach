import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Search, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Badge';
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
    queryKey: ['knowledge'],
    queryFn: async () => {
      const res = await api.get('/knowledge');
      return Array.isArray(res) ? res : res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
    onSuccess: () => {
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
      deleteItem(id);
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
          <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            导入
          </Button>
          <Button size="sm" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增
          </Button>
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
        <Card className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">暂无知识条目</p>
          <p className="mt-1 text-xs text-gray-400">点击「新增」或「导入」添加知识</p>
        </Card>
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
