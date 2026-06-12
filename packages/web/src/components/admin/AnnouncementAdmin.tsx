import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Pause, Play, Clock, Users,
  CheckCircle, AlertCircle, Calendar, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useI18n, LOCALES, type Locale } from '@/i18n';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'once' | 'recurring' | 'scheduled';
  status: 'draft' | 'published' | 'paused' | 'archived';
  priority: number;
  target_audience: string;
  scheduled_at: string | null;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  readCount: number;
  translations: Array<{ locale: string; title: string; content: string }>;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: '草稿', variant: 'default' },
  published: { label: '已发布', variant: 'success' },
  paused: { label: '已暂停', variant: 'warning' },
  archived: { label: '已归档', variant: 'danger' },
};

const typeLabels: Record<string, string> = {
  once: '一次性',
  recurring: '每次展示',
  scheduled: '定时发布',
};

export function AnnouncementAdmin() {
  const { } = useI18n();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showReadsDialog, setShowReadsDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [readsData, setReadsData] = useState<any[]>([]);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'once' as 'once' | 'recurring' | 'scheduled',
    status: 'draft' as 'draft' | 'published' | 'paused' | 'archived',
    priority: 0,
    targetAudience: 'all',
    scheduledAt: '',
    expiresAt: '',
    translations: [] as Array<{ locale: string; title: string; content: string }>,
  });

  // 获取公告列表
  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/announcements');
      setAnnouncements((res as any)?.data || []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      toast.error('获取公告列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // 打开新建对话框
  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      type: 'once',
      status: 'draft',
      priority: 0,
      targetAudience: 'all',
      scheduledAt: '',
      expiresAt: '',
      translations: [],
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      status: announcement.status,
      priority: announcement.priority,
      targetAudience: announcement.target_audience,
      scheduledAt: announcement.scheduled_at ? announcement.scheduled_at.slice(0, 16) : '',
      expiresAt: announcement.expires_at ? announcement.expires_at.slice(0, 16) : '',
      translations: announcement.translations || [],
    });
    setShowDialog(true);
  };

  // 保存公告
  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('请填写标题和内容');
      return;
    }

    try {
      const payload = {
        ...formData,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      if (editingId) {
        await api.put(`/admin/announcements/${editingId}`, payload);
        toast.success('公告更新成功');
      } else {
        await api.post('/admin/announcements', payload);
        toast.success('公告创建成功');
      }

      setShowDialog(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      toast.error('保存失败');
    }
  };

  // 删除公告
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个公告吗？')) return;

    try {
      await api.delete(`/admin/announcements/${id}`);
      toast.success('公告已删除');
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      toast.error('删除失败');
    }
  };

  // 发布/暂停公告
  const handleToggleStatus = async (announcement: Announcement) => {
    const newStatus = announcement.status === 'published' ? 'paused' : 'published';
    try {
      await api.put(`/admin/announcements/${announcement.id}`, { status: newStatus });
      toast.success(newStatus === 'published' ? '公告已发布' : '公告已暂停');
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error('操作失败');
    }
  };

  // 查看阅读详情
  const handleViewReads = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    try {
      const res = await api.get(`/admin/announcements/${announcement.id}/reads`);
      setReadsData((res as any)?.data || []);
      setShowReadsDialog(true);
    } catch (err) {
      console.error('Failed to fetch reads:', err);
      toast.error('获取阅读详情失败');
    }
  };

  // 添加翻译
  const handleAddTranslation = () => {
    const usedLocales = formData.translations.map(t => t.locale);
    const availableLocales = Object.keys(LOCALES).filter(l => !usedLocales.includes(l));

    if (availableLocales.length === 0) {
      toast.warning('已添加所有支持的语言');
      return;
    }

    setFormData(prev => ({
      ...prev,
      translations: [...prev.translations, { locale: availableLocales[0], title: '', content: '' }],
    }));
  };

  // 更新翻译
  const handleUpdateTranslation = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: prev.translations.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  // 删除翻译
  const handleRemoveTranslation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      translations: prev.translations.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">公告管理</h2>
          <p className="mt-1 text-sm text-gray-500">
            创建和管理用户公告，支持多语言和定时发布
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建公告
        </Button>
      </div>

      {/* 公告列表 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-100 rounded" />
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">暂无公告</h3>
          <p className="mt-2 text-sm text-gray-500">点击上方按钮创建第一个公告</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 标题和状态 */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-medium text-gray-900">
                      {announcement.title}
                    </h3>
                    <Badge variant={statusLabels[announcement.status]?.variant}>
                      {statusLabels[announcement.status]?.label}
                    </Badge>
                    <Badge variant="default">
                      {typeLabels[announcement.type]}
                    </Badge>
                    {announcement.priority > 0 && (
                      <Badge variant="warning">
                        优先级: {announcement.priority}
                      </Badge>
                    )}
                  </div>

                  {/* 内容预览 */}
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {announcement.content}
                  </p>

                  {/* 信息栏 */}
                  <div className="mt-3 flex items-center gap-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      创建: {new Date(announcement.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    {announcement.published_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        发布: {new Date(announcement.published_at).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                    {announcement.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        定时: {new Date(announcement.scheduled_at).toLocaleString('zh-CN')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      阅读: {announcement.readCount} 人
                    </span>
                    {announcement.translations.length > 0 && (
                      <span>
                        翻译: {announcement.translations.map(t => LOCALES[t.locale as Locale]?.nativeName || t.locale).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewReads(announcement)}
                    title="查看阅读详情"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(announcement)}
                    title={announcement.status === 'published' ? '暂停' : '发布'}
                  >
                    {announcement.status === 'published' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(announcement)}
                    title="编辑"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(announcement.id)}
                    title="删除"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 新建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑公告' : '新建公告'}</DialogTitle>
            <DialogDescription>
              创建公告后可以发布给所有用户查看
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">标题 *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="公告标题"
              />
            </div>

            {/* 内容 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">内容 *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="公告内容"
                rows={4}
              />
            </div>

            {/* 类型和状态 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="once">一次性（用户可关闭）</option>
                  <option value="recurring">每次展示（登录时显示）</option>
                  <option value="scheduled">定时发布</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="draft">草稿</option>
                  <option value="published">立即发布</option>
                  <option value="paused">暂停</option>
                </select>
              </div>
            </div>

            {/* 优先级和目标 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">优先级</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">数字越大越靠前，高优先级显示红色</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">目标用户</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">所有用户</option>
                  <option value="free">免费用户</option>
                  <option value="professional">专业版用户</option>
                  <option value="team">团队版用户</option>
                </select>
              </div>
            </div>

            {/* 定时和过期 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">定时发布时间</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">过期时间</label>
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
            </div>

            {/* 多语言翻译 */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">多语言翻译（可选）</h4>
                <Button variant="ghost" size="sm" onClick={handleAddTranslation}>
                  <Plus className="mr-1 h-3 w-3" />
                  添加翻译
                </Button>
              </div>

              {formData.translations.map((translation, index) => (
                <div key={index} className="mb-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <select
                      value={translation.locale}
                      onChange={(e) => handleUpdateTranslation(index, 'locale', e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      {Object.entries(LOCALES).map(([key, value]) => (
                        <option key={key} value={key}>{value.nativeName}</option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTranslation(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={translation.title}
                    onChange={(e) => handleUpdateTranslation(index, 'title', e.target.value)}
                    placeholder="翻译标题"
                    className="mb-2"
                  />
                  <Textarea
                    value={translation.content}
                    onChange={(e) => handleUpdateTranslation(index, 'content', e.target.value)}
                    placeholder="翻译内容"
                    rows={2}
                  />
                </div>
              ))}

              {formData.translations.length === 0 && (
                <p className="text-sm text-gray-500">
                  未添加翻译时将使用中文内容作为默认显示
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave}>
              {editingId ? '保存修改' : '创建公告'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 阅读详情对话框 */}
      <Dialog open={showReadsDialog} onOpenChange={setShowReadsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>阅读详情</DialogTitle>
            <DialogDescription>
              {selectedAnnouncement?.title} - 共 {readsData.length} 人阅读
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {readsData.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无阅读记录</p>
            ) : (
              <div className="space-y-2">
                {readsData.map((read: any) => (
                  <div key={read.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{read.user?.name || '未知用户'}</p>
                      <p className="text-xs text-gray-500">{read.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        阅读: {new Date(read.read_at).toLocaleString('zh-CN')}
                      </p>
                      {read.dismissed_at && (
                        <p className="text-xs text-gray-400">
                          关闭: {new Date(read.dismissed_at).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReadsDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
