import { logger } from '@/utils/logger';
import { useState } from 'react';
import { FileText, Upload, Globe, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

type ImportMethod = 'manual' | 'file' | 'web' | 'batch';

interface CompanyKnowledgeImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const importMethods = [
  { key: 'manual' as ImportMethod, label: '手动录入', icon: <Edit3 className="h-5 w-5 text-gray-500" />, desc: '逐条添加知识' },
  { key: 'file' as ImportMethod, label: '文件导入', icon: <FileText className="h-5 w-5 text-blue-500" />, desc: '支持 Word/PDF/Excel' },
  { key: 'web' as ImportMethod, label: '网页抓取', icon: <Globe className="h-5 w-5 text-purple-500" />, desc: '输入URL自动抓取' },
  { key: 'batch' as ImportMethod, label: '批量导入', icon: <Upload className="h-5 w-5 text-green-500" />, desc: 'JSON格式批量导入' },
];

export function CompanyKnowledgeImport({ open, onOpenChange, onSuccess }: CompanyKnowledgeImportProps) {
  const [method, setMethod] = useState<ImportMethod | null>(null);
  const [loading, setLoading] = useState(false);

  // 手动录入状态
  const [manualCategory, setManualCategory] = useState('general');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  // 网页抓取状态
  const [webUrl, setWebUrl] = useState('');

  // 批量导入状态
  const [batchJson, setBatchJson] = useState('');

  // 文件上传状态
  const [file, setFile] = useState<File | null>(null);

  const resetForm = () => {
    setMethod(null);
    setManualCategory('general');
    setManualTitle('');
    setManualContent('');
    setWebUrl('');
    setBatchJson('');
    setFile(null);
  };

  const handleManualSubmit = async () => {
    if (!manualTitle || !manualContent) {
      toast.error('请填写标题和内容');
      return;
    }

    setLoading(true);
    try {
      await api.post('/company-knowledge', {
        category: manualCategory,
        title: manualTitle,
        content: manualContent,
      });
      toast.success('添加成功');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error('添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('请选择文件');
      return;
    }

    setLoading(true);
    try {
      // 读取文件内容
      const text = await file.text();

      // 解析文件内容（简单实现，提取文本）
      const content = text.replace(/\s+/g, ' ').trim();

      if (content.length < 10) {
        toast.error('文件内容过少');
        return;
      }

      // 自动提取标题（取第一行或文件名）
      const title = content.split('\n')[0].slice(0, 50) || file.name.replace(/\.[^/.]+$/, '');

      await api.post('/company-knowledge', {
        category: 'general',
        title,
        content: content.slice(0, 5000), // 限制内容长度
      });

      toast.success('文件导入成功');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error('文件导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWebScrape = async () => {
    if (!webUrl) {
      toast.error('请输入网页URL');
      return;
    }

    setLoading(true);
    try {
      // 调用后端API进行网页抓取
      const res = await api.post('/company-knowledge/scrape', { url: webUrl }) as any;

      if (res?.success) {
        toast.success('网页抓取成功');
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res?.error || '抓取失败');
      }
    } catch (err) {
      toast.error('网页抓取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchImport = async () => {
    if (!batchJson) {
      toast.error('请输入JSON数据');
      return;
    }

    try {
      const items = JSON.parse(batchJson);
      if (!Array.isArray(items)) {
        toast.error('JSON格式错误，需要数组格式');
        return;
      }

      setLoading(true);
      let successCount = 0;

      for (const item of items) {
        try {
          await api.post('/company-knowledge', {
            category: item.category || 'general',
            title: item.title || '未命名',
            content: item.content || '',
          });
          successCount++;
        } catch (err) {
          logger.error('Failed to import item:', err);
        }
      }

      toast.success(`成功导入 ${successCount}/${items.length} 条知识`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error('JSON格式错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    switch (method) {
      case 'manual':
        return handleManualSubmit();
      case 'file':
        return handleFileUpload();
      case 'web':
        return handleWebScrape();
      case 'batch':
        return handleBatchImport();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入公司知识</DialogTitle>
          <DialogDescription>
            选择导入方式，添加课程、价格、政策等公司专属信息
          </DialogDescription>
        </DialogHeader>

        {!method ? (
          // 选择导入方式
          <div className="grid grid-cols-2 gap-3 py-4">
            {importMethods.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <div className="mt-0.5">{m.icon}</div>
                <div>
                  <div className="font-medium text-gray-900">{m.label}</div>
                  <div className="text-sm text-gray-500">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          // 导入表单
          <div className="space-y-4 py-4">
            {/* 手动录入 */}
            {method === 'manual' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">分类</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="course">课程介绍</option>
                    <option value="price">价格政策</option>
                    <option value="policy">售后政策</option>
                    <option value="case">成功案例</option>
                    <option value="general">通用知识</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">标题 *</label>
                  <Input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="如：少儿编程进阶课程"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">内容 *</label>
                  <textarea
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    placeholder="详细描述课程内容、价格、政策等..."
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            {/* 文件导入 */}
            {method === 'file' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">选择文件</label>
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    支持 Word (.doc/.docx)、PDF、Excel (.xls/.xlsx)
                  </p>
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,.xls,.xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mt-4"
                  />
                  {file && (
                    <p className="mt-2 text-sm text-primary-600">
                      已选择: {file.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 网页抓取 */}
            {method === 'web' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">网页URL</label>
                <Input
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://example.com/course-info"
                />
                <p className="mt-1 text-xs text-gray-500">
                  输入课程介绍、价格政策等页面的URL，系统会自动抓取内容
                </p>
              </div>
            )}

            {/* 批量导入 */}
            {method === 'batch' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">JSON数据</label>
                <textarea
                  value={batchJson}
                  onChange={(e) => setBatchJson(e.target.value)}
                  placeholder={`[
  {"category": "price", "title": "课程价格", "content": "48课时，2999元"},
  {"category": "course", "title": "课程介绍", "content": "AI互动教学..."}
]`}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  JSON数组格式，每项包含 category、title、content 字段
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {method ? (
            <>
              <Button variant="ghost" onClick={() => setMethod(null)}>返回</Button>
              <Button variant="ghost" onClick={() => { resetForm(); onOpenChange(false); }}>取消</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '导入中...' : '导入'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
