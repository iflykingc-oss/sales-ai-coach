import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

export function DataExportImport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importResult, setImportResult] = useState<{ scripts: number; knowledge: number; practices: number; reviews: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/compliance/export', { responseType: 'blob' });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-ai-coach-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('数据导出成功');
    } catch {
      toast.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.format !== 'sales-ai-coach-export-v1') {
        toast.error('文件格式不正确，请使用本平台导出的数据文件');
        return;
      }

      const res = await api.post('/compliance/import', data);
      const result = res.data?.data || res.data;
      setImportResult(result);
      toast.success(`导入成功：${result.scripts} 条话术，${result.knowledge} 条知识，${result.practices} 条练习`);
    } catch (err: any) {
      if (err.message?.includes('JSON')) {
        toast.error('文件格式错误，请确认是有效的 JSON 文件');
      } else {
        toast.error('导入失败，请稍后重试');
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteKnowledge = async () => {
    if (!confirm('确定要永久删除所有上传的知识库数据吗？此操作不可撤销。')) return;
    setDeleting(true);
    try {
      const res = await api.delete('/compliance/knowledge');
      const count = res.data?.data?.deleted || 0;
      toast.success(`已删除 ${count} 条知识库数据`);
    } catch {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">导出我的数据</h3>
            <p className="text-sm text-gray-500">下载所有话术、练习记录、知识库和复盘报告</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? '导出中...' : '导出全部数据'}
        </button>
      </div>

      {/* Import */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">导入历史数据</h3>
            <p className="text-sm text-gray-500">上传之前导出的数据文件，恢复话术和练习记录</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importing ? '导入中...' : '选择文件导入'}
        </button>
        {importResult && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">导入完成</p>
              <p>话术 {importResult.scripts} 条 · 知识 {importResult.knowledge} 条 · 练习 {importResult.practices} 条 · 复盘 {importResult.reviews} 条</p>
            </div>
          </div>
        )}
      </div>

      {/* One-click delete knowledge */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-red-900">清除知识库数据</h3>
            <p className="text-sm text-red-600">一键永久删除所有上传的知识库文件，平台不会保留任何副本</p>
          </div>
        </div>
        <button
          onClick={handleDeleteKnowledge}
          disabled={deleting}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {deleting ? '删除中...' : '永久删除所有知识库'}
        </button>
      </div>
    </div>
  );
}
