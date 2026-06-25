import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, Upload, BookOpen, DollarSign, Award, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CompanyKnowledgeImport } from '@/components/CompanyKnowledgeImport';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'course', label: '课程介绍', icon: BookOpen, color: 'blue' },
  { value: 'price', label: '价格政策', icon: DollarSign, color: 'green' },
  { value: 'policy', label: '售后政策', icon: Shield, color: 'purple' },
  { value: 'case', label: '成功案例', icon: Award, color: 'amber' },
  { value: 'general', label: '通用知识', icon: FileText, color: 'gray' },
];

export function CompanyKnowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ category: 'general', title: '', content: '' });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/company-knowledge');
      setItems(res.data || []);
    } catch (err) {
      logger.error('Failed to fetch company knowledge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast.error('请填写标题和内容');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/company-knowledge/${editingId}`, form);
        toast.success('更新成功');
      } else {
        await api.post('/company-knowledge', form);
        toast.success('添加成功');
      }
      setForm({ category: 'general', title: '', content: '' });
      setEditingId(null);
      setShowAdd(false);
      fetchItems();
    } catch (err) {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条知识？')) return;
    try {
      await api.delete(`/company-knowledge/${id}`);
      toast.success('已删除');
      fetchItems();
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setForm({ category: item.category, title: item.title, content: item.content });
    setEditingId(item.id);
    setShowAdd(true);
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[4];

  if (loading) {
    return <div className="p-4 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">公司专属知识</h3>
          <p className="text-sm text-gray-500">配置课程、价格、政策等公司信息，生成话术时会自动引用</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            导入
          </Button>
          <Button onClick={() => { setForm({ category: 'general', title: '', content: '' }); setEditingId(null); setShowAdd(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            添加知识
          </Button>
        </div>
      </div>

      {/* 导入组件 */}
      <CompanyKnowledgeImport
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={fetchItems}
      />

      {/* 知识列表 */}
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">暂无公司知识，点击上方按钮添加</p>
          <p className="mt-1 text-xs text-gray-400">添加课程介绍、价格政策等信息，生成话术时会自动引用</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cat = getCategoryInfo(item.category);
            const Icon = cat.icon;
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${cat.color}-100`}>
                      <Icon className={`h-4 w-4 text-${cat.color}-600`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.title}</span>
                        <Badge variant="default">{cat.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.content}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        更新于 {new Date(item.updated_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 添加/编辑对话框 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">{editingId ? '编辑知识' : '添加公司知识'}</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">标题</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：少儿编程进阶课程"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="如：课程共48课时，原价2999元，本周特惠2799元..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowAdd(false); setEditingId(null); }}>取消</Button>
              <Button onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                {editingId ? '更新' : '添加'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
