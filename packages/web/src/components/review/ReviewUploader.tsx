import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useReviewStore, type ConversationUpload } from '@/stores/reviewStore';
import { cn } from '@/utils/cn';

export function ReviewUploader() {
  const { uploads, addUpload, removeUpload } = useReviewStore();
  const [content, setContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && uploads.length < 3) {
      Array.from(selectedFiles).forEach((file) => {
        if (uploads.length < 3) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            addUpload({
              id: `upload-${Date.now()}-${file.name}`,
              fileName: file.name,
              content: typeof ev.target?.result === 'string' ? ev.target.result : '',
              uploadedAt: new Date(),
            });
          };
          reader.readAsText(file);
        }
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploads.length >= 3) return;
    Array.from(e.dataTransfer.files).forEach((file) => {
      if (uploads.length < 3) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          addUpload({
            id: `upload-${Date.now()}-${file.name}`,
            fileName: file.name,
            content: typeof ev.target?.result === 'string' ? ev.target.result : '',
            uploadedAt: new Date(),
          });
        };
        reader.readAsText(file);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">上传今日对话记录</h3>
        <span className="text-xs text-gray-400">{uploads.length}/3</span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-gray-50',
          uploads.length >= 3 && 'pointer-events-none opacity-50',
        )}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">拖拽对话文件到此处，或</p>
        <label className="mt-2 inline-flex cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          选择文件
          <input
            type="file"
            multiple
            accept=".txt,.json,.csv,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Manual input */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">或直接粘贴对话内容</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="粘贴今日销售对话内容..."
          rows={4}
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            disabled={!content.trim() || uploads.length >= 3}
            onClick={() => {
              if (content.trim()) {
                addUpload({
                  id: `upload-${Date.now()}-manual`,
                  fileName: '手动输入对话',
                  content: content.trim(),
                  uploadedAt: new Date(),
                });
                setContent('');
              }
            }}
          >
            添加对话
          </Button>
        </div>
      </div>

      {/* Uploaded files */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload: ConversationUpload) => (
            <div key={upload.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary-500" />
                <span className="text-sm text-gray-700">{upload.fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeUpload(upload.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
