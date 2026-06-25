import { logger } from '@/utils/logger';
import { useState } from 'react';
import { FileText, Upload, Globe, Mic, FileSpreadsheet, Presentation, Edit3, Check, X, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';
import { useAdminStore, type KnowledgeItem } from '@/stores/adminStore';
import { toast } from '@/hooks/useToast';
import { api } from '@/services/api';

const sourceIcons: Record<string, React.ReactNode> = {
  Word: <FileText className="h-4 w-4 text-blue-500" />,
  PDF: <FileText className="h-4 w-4 text-red-500" />,
  PPT: <Presentation className="h-4 w-4 text-orange-500" />,
  Excel: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  Web: <Globe className="h-4 w-4 text-purple-500" />,
  Audio: <Mic className="h-4 w-4 text-yellow-500" />,
  Manual: <Edit3 className="h-4 w-4 text-gray-500" />,
};

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

type ImportMethod = 'word' | 'pdf' | 'ppt' | 'excel' | 'web' | 'manual' | 'audio';

const importMethods: { key: ImportMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'word', label: 'Word导入', icon: <FileText className="h-5 w-5 text-blue-500" />, desc: '支持 .doc/.docx' },
  { key: 'pdf', label: 'PDF导入', icon: <FileText className="h-5 w-5 text-red-500" />, desc: '支持 .pdf 文档' },
  { key: 'ppt', label: 'PPT导入', icon: <Presentation className="h-5 w-5 text-orange-500" />, desc: '支持 .ppt/.pptx' },
  { key: 'excel', label: 'Excel导入', icon: <FileSpreadsheet className="h-5 w-5 text-green-500" />, desc: '支持 .xls/.xlsx' },
  { key: 'web', label: '网页抓取', icon: <Globe className="h-5 w-5 text-purple-500" />, desc: '输入URL自动抓取' },
  { key: 'manual', label: '手动录入', icon: <Edit3 className="h-5 w-5 text-gray-500" />, desc: '手动编辑知识库' },
  { key: 'audio', label: '音频导入', icon: <Mic className="h-5 w-5 text-yellow-500" />, desc: '录音转文字后入库' },
];

export function KnowledgeAdmin() {
  const { knowledgeItems, setKnowledgeItems, approveKnowledge, rejectKnowledge, updateKnowledge, deleteKnowledge } = useAdminStore();

  const pendingItems = knowledgeItems.filter((item) => item.status === 'pending');
  const approvedItems = knowledgeItems.filter((item) => item.status === 'approved');
  const rejectedItems = knowledgeItems.filter((item) => item.status === 'rejected');

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualCategory, setManualCategory] = useState('');

  // Edit state
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditContent(item.content || '');
    setEditCategory(item.category);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editTitle || !editContent) return;
    updateKnowledge(editingItem.id, {
      title: editTitle,
      content: editContent,
      category: editCategory || '其他',
    });
    setEditingItem(null);
    toast.success('知识条目已更新');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条知识条目吗？此操作不可撤销。')) return;

    try {
      await api.delete(`/knowledge/${id}`);
      deleteKnowledge(id);
      toast.success('知识条目已删除');
    } catch (err) {
      logger.error('Failed to delete knowledge:', err);
      toast.error('删除失败');
    }
  };

  const handleImport = async () => {
    if (importMethod === 'web' && !importUrl) return;
    if (importMethod === 'manual' && (!manualTitle || !manualContent)) return;

    if (importMethod === 'manual') {
      try {
        // Save to database
        const res = await api.post('/knowledge', {
          title: manualTitle,
          content: manualContent,
          category: manualCategory || '其他',
          source: 'manual',
          tags: [],
          industry: manualCategory || '其他',
          weight: 1,
        });

        const savedItem = res.data || res;

        // Update frontend state
        const newItem: KnowledgeItem = {
          id: savedItem?.id || `k${Date.now()}`,
          title: manualTitle,
          category: manualCategory || '其他',
          source: 'Manual',
          status: 'approved',
          createdAt: new Date().toISOString().split('T')[0],
          content: manualContent,
        };
        setKnowledgeItems([...knowledgeItems, newItem]);
        setManualTitle('');
        setManualContent('');
        setManualCategory('');
        toast.success('知识条目已添加');
      } catch (err) {
        logger.error('Failed to add knowledge:', err);
        toast.error('添加失败');
      }
    }

    setImportMethod(null);
    setShowImportDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">知识库导入</h3>
          <Button size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            导入知识
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {importMethods.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setImportMethod(m.key);
                setShowImportDialog(true);
              }}
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 text-center transition-colors hover:border-primary-200 hover:bg-primary-50/30"
            >
              {m.icon}
              <span className="text-xs font-medium text-gray-700">{m.label}</span>
              <span className="text-[10px] text-gray-400">{m.desc}</span>
            </button>
          ))}
        </div>
        {/* AI Auto-classification */}
        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-700">
            AI 自动分类：导入的内容将由 AI 自动识别类别、提取关键信息并归类到相应知识库分组。
          </p>
        </div>
      </Card>

      {/* Review Queue */}
      {pendingItems.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-yellow-500" />
            <h3 className="text-base font-semibold text-gray-900">审核队列</h3>
            <Badge variant="warning">{pendingItems.length} 条待审</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-center gap-3">
                  {sourceIcons[item.source] ?? <FileText className="h-4 w-4" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.category} · {item.source} · {item.createdAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => approveKnowledge(item.id)}>
                    <Check className="mr-1 h-3.5 w-3.5 text-green-600" />
                    通过
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => rejectKnowledge(item.id)}>
                    <X className="mr-1 h-3.5 w-3.5 text-red-600" />
                    拒绝
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Knowledge Items */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900">全部知识条目</h3>
        <p className="mt-1 text-sm text-gray-500">
          已审核 {approvedItems.length} 条 · 待审 {pendingItems.length} 条 · 已拒绝 {rejectedItems.length} 条
        </p>
        <div className="mt-4 divide-y divide-gray-100">
          {knowledgeItems.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="暂无知识条目"
              description="通过上方导入方式添加行业知识"
              className="py-8"
            />
          ) : (
            knowledgeItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {sourceIcons[item.source] ?? <FileText className="h-4 w-4" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.category} · {item.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{item.createdAt}</span>
                  <Badge variant={statusVariants[item.status]}>{statusLabels[item.status]}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入知识库</DialogTitle>
            <DialogDescription>选择导入方式，将知识内容添加到知识库</DialogDescription>
          </DialogHeader>

          {importMethod === 'web' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">网页URL</label>
                <Input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/article"
                />
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                AI 将自动抓取网页内容并提取关键信息入库。
              </div>
            </div>
          )}

          {importMethod === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">标题</label>
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="知识条目标题"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">分类</label>
                <Input
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  placeholder="如：销售技巧、产品知识"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">内容</label>
                <Textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="输入知识内容..."
                  rows={6}
                />
              </div>
            </div>
          )}

          {importMethod && !['web', 'manual'].includes(importMethod) && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                {sourceIcons[importMethods.find((m) => m.key === importMethod)?.label.split('导入')[0] ?? ''] ?? <Upload className="h-6 w-6 text-gray-400" />}
              </div>
              <p className="text-sm text-gray-600">
                点击或拖拽上传 {importMethods.find((m) => m.key === importMethod)?.label} 文件
              </p>
              <p className="mt-1 text-xs text-gray-400">AI 将自动解析并分类入库</p>
              <Button variant="secondary" size="sm" className="mt-4">
                选择文件
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowImportDialog(false); setImportMethod(null); }}>取消</Button>
            <Button onClick={handleImport}>确认导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑知识条目</DialogTitle>
            <DialogDescription>修改知识条目的标题、分类和内容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">标题</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="知识条目标题"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">分类</label>
              <Input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="如：销售技巧、产品知识"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">内容</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="输入知识内容..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingItem(null)}>取消</Button>
            <Button onClick={handleSaveEdit}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
