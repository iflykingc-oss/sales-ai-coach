import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, File, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';
import { useKnowledgeStore, type KnowledgeItem } from '@/stores/knowledgeStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface KnowledgeImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const industryOptions = ['房地产', '汽车', 'SaaS', '保险', '金融', '零售', '教育', '其他'];

export function KnowledgeImport({ open, onOpenChange }: KnowledgeImportProps) {
  const { addItem } = useKnowledgeStore();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importIndustry, setImportIndustry] = useState('');
  const [importTags, setImportTags] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (ext === 'pdf') return <File className="h-5 w-5 text-red-600" />;
    if (ext === 'doc' || ext === 'docx') return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const importMutation = useMutation({
    mutationFn: async (fileList: File[]) => {
      const formData = new FormData();
      fileList.forEach((f) => formData.append('files', f));
      if (importIndustry) formData.append('industry', importIndustry);
      if (importTags) formData.append('tags', importTags);
      return api.post('/knowledge/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      files.forEach((f) => {
        addItem({
          id: `imp-${Date.now()}-${f.name}`,
          content: `已导入文件: ${f.name}`,
          source: 'import',
          tags: importTags ? importTags.split(',').map((t) => t.trim()).filter(Boolean) : ['导入'],
          industry: importIndustry,
          weight: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      onOpenChange(false);
      setFiles([]);
    },
  });

  const handleImport = () => {
    if (files.length === 0) return;
    importMutation.mutate(files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>导入知识</DialogTitle>
          <DialogDescription>
            支持 Excel、CSV、PDF、Word 格式文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-gray-50',
            )}
          >
            <Upload className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">拖拽文件到此处，或</p>
            <label className="mt-2 inline-flex cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              选择文件
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file)}
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">行业</label>
              <select
                value={importIndustry}
                onChange={(e) => setImportIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">选择行业</option>
                {industryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">标签 (逗号分隔)</label>
              <Input
                value={importTags}
                onChange={(e) => setImportTags(e.target.value)}
                placeholder="如: 话术, 房地产"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={files.length === 0 || importMutation.isPending}>
            {importMutation.isPending ? '导入中...' : `导入 ${files.length} 个文件`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
