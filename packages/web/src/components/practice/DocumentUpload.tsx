import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/useToast';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  summary?: string;
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  progress: number;
}

interface DocumentUploadProps {
  onDocumentsReady: (documents: UploadedDocument[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'text/plain': '文本',
  'text/markdown': 'Markdown',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
};

export function DocumentUpload({ onDocumentsReady, maxFiles = 5, maxSizeMB = 10 }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processFile = useCallback(async (file: File) => {
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`文件 ${file.name} 超过 ${maxSizeMB}MB 限制`);
      return null;
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error(`不支持的文件类型: ${file.name}`);
      return null;
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create document entry
    const newDoc: UploadedDocument = {
      id: docId,
      name: file.name,
      type: file.type || 'text/plain',
      size: file.size,
      content: '',
      status: 'uploading',
      progress: 0,
    };

    setDocuments(prev => [...prev, newDoc]);

    try {
      // Read file content
      const content = await readFileContent(file);

      // Update progress
      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, progress: 50, content, status: 'analyzing' } : d
      ));

      // Analyze document with AI
      const summary = await analyzeDocument(file.name, content);

      // Update to ready
      const readyDoc: UploadedDocument = {
        ...newDoc,
        content,
        summary,
        status: 'ready',
        progress: 100,
      };

      setDocuments(prev => prev.map(d =>
        d.id === docId ? readyDoc : d
      ));

      return readyDoc;
    } catch (error) {
      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, status: 'error', progress: 0 } : d
      ));
      toast.error(`处理 ${file.name} 失败`);
      return null;
    }
  }, [maxSizeMB]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          // For binary files like PDF, we'll send to backend for extraction
          resolve('');
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const analyzeDocument = async (fileName: string, content: string): Promise<string> => {
    // Call backend API to analyze document
    const response = await fetch('/api/practices/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fileName, content: content.slice(0, 5000) }), // Limit content size
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    const data = await response.json();
    return data.data?.summary || '文档已分析';
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const currentCount = documents.length;
    const newFiles = Array.from(files).slice(0, maxFiles - currentCount);

    if (newFiles.length === 0) {
      toast.error(`最多上传 ${maxFiles} 个文件`);
      return;
    }

    const results = await Promise.all(newFiles.map(processFile));
    const validDocs = results.filter((d): d is UploadedDocument => d !== null);

    if (validDocs.length > 0) {
      const allDocs = [...documents, ...validDocs];
      setDocuments(allDocs);
      onDocumentsReady(allDocs.filter(d => d.status === 'ready'));
    }
  }, [documents, maxFiles, processFile, onDocumentsReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeDocument = (id: string) => {
    setDocuments(prev => {
      const newDocs = prev.filter(d => d.id !== id);
      onDocumentsReady(newDocs.filter(d => d.status === 'ready'));
      return newDocs;
    });
  };

  const readyCount = documents.filter(d => d.status === 'ready').length;

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          isDragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/50'
        )}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-700">
          上传企业培训资料、产品文档
        </p>
        <p className="mt-1 text-xs text-gray-500">
          支持 PDF、Word、PPT、TXT、Markdown，最多 {maxFiles} 个文件，每个 {maxSizeMB}MB
        </p>
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                doc.status === 'ready' ? 'border-green-200 bg-green-50' :
                doc.status === 'error' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-white'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                doc.status === 'ready' ? 'bg-green-100' :
                doc.status === 'error' ? 'bg-red-100' :
                'bg-gray-100'
              )}>
                {doc.status === 'uploading' || doc.status === 'analyzing' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                ) : doc.status === 'ready' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : doc.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <FileText className="h-4 w-4 text-gray-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{FILE_TYPE_LABELS[doc.type] || '文档'}</span>
                  <span>·</span>
                  <span>{formatFileSize(doc.size)}</span>
                  {doc.status === 'analyzing' && (
                    <>
                      <span>·</span>
                      <span className="text-primary-500">AI分析中...</span>
                    </>
                  )}
                  {doc.status === 'ready' && doc.summary && (
                    <>
                      <span>·</span>
                      <span className="text-green-600">{doc.summary.slice(0, 30)}...</span>
                    </>
                  )}
                </div>
                {/* Progress bar */}
                {(doc.status === 'uploading' || doc.status === 'analyzing') && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-gray-200">
                    <div
                      className="h-1 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${doc.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeDocument(doc.id)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {readyCount > 0 && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          <p className="font-medium">已上传 {readyCount} 个文档</p>
          <p className="mt-1 text-xs text-blue-600">
            AI将基于这些文档内容进行针对性陪练，模拟了解这些资料的客户
          </p>
        </div>
      )}
    </div>
  );
}
