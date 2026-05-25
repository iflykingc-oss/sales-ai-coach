import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Upload, FileText, X, CheckCircle, Calendar,
  Target, Wrench, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge, Card } from '@/components/ui/Badge';
import { RadarChart } from '@/components/ui/RadarChart';
import type { RadarDimension } from '@/components/ui/RadarChart';
import {
  useReviewStore,
  type ReviewReport,
} from '@/stores/reviewStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

const defaultDimensions: string[] = [
  '需求挖掘',
  '异议处理',
  '促单能力',
  '沟通表达',
  '情绪管理',
  '产品知识',
  '信任建立',
  '价值传递',
];

// --------------- ReviewUploader ---------------

export function ReviewUploader() {
  const { uploads, addUpload, removeUpload } = useReviewStore();
  const [content, setContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        if (uploads.length < 3) {
          addUpload({
            id: `upload-${Date.now()}-${file.name}`,
            fileName: file.name,
            content: '',
            uploadedAt: new Date(),
          });
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
        addUpload({
          id: `upload-${Date.now()}-${file.name}`,
          fileName: file.name,
          content: '',
          uploadedAt: new Date(),
        });
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
            accept=".txt,.json,.csv,.docx"
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
            disabled={!content.trim()}
            onClick={() => {
              if (uploads.length < 3 && content.trim()) {
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
          {uploads.map((upload) => (
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

// --------------- ReviewReport ---------------

interface ReviewReportProps {
  report: ReviewReport;
}

export function ReviewReportDisplay({ report }: ReviewReportProps) {
  const [expanded, setExpanded] = useState(false);

  const radarDimensions: RadarDimension[] = defaultDimensions.map((label) => ({
    label,
    score: report.radarScores[label] ?? Math.floor(Math.random() * 30 + 60),
  }));

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-l-4 border-l-primary-500">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">{report.date}</span>
              {report.scenarioType && (
                <Badge variant="info">{report.scenarioType}</Badge>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className={cn('text-4xl font-bold', getScoreColor(report.overallScore))}>
                {report.overallScore}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">综合评分</div>
                <div className="text-xs text-gray-500">满分 100</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{report.summary}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <RadarChart dimensions={radarDimensions} size={180} />
          </div>
        </div>
      </Card>

      {/* Radar Chart (expanded) */}
      {expanded && (
        <Card>
          <h4 className="mb-3 text-sm font-medium text-gray-700">能力维度详情</h4>
          <div className="flex justify-center">
            <RadarChart dimensions={radarDimensions} size={300} />
          </div>
        </Card>
      )}

      {/* Strengths */}
      <Card className="border-l-4 border-l-green-500">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle className="h-4 w-4" />
          今日亮点
        </h4>
        <ul className="space-y-2">
          {report.strengths.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-green-500">&#10004;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Improvements */}
      <Card className="border-l-4 border-l-amber-500">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-700">
          <Wrench className="h-4 w-4" />
          需要改进
        </h4>
        <ul className="space-y-2">
          {report.improvements.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-amber-500">&#128295;</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Action Items */}
      <Card className="border-l-4 border-l-blue-500">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700">
          <Target className="h-4 w-4" />
          明日行动计划
        </h4>
        <ul className="space-y-2">
          {report.actionItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-blue-500">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {/* Toggle full radar */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              收起详情 <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              展开雷达图 <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// --------------- ReviewHistory ---------------

export function ReviewHistory() {
  const { history, selectedDate, selectedScenario, setSelectedDate, setSelectedScenario } = useReviewStore();

  const { data: reviewHistory } = useQuery<Array<{
    id: string;
    date: string;
    overallScore: number;
    scenarioType?: string;
    summary: string;
  }>>({
    queryKey: ['reviews'],
    queryFn: async () => {
      const res = await api.get('/reviews');
      return Array.isArray(res) ? res : res.data || [];
    },
  });

  const displayHistory = reviewHistory || history;

  const filteredHistory = displayHistory.filter((item: { id: string; date: string; overallScore: number; scenarioType?: string; summary: string }) => {
    const matchesDate = !selectedDate || item.date === selectedDate;
    const matchesScenario = !selectedScenario || item.scenarioType === selectedScenario;
    return matchesDate && matchesScenario;
  });

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'success' as const, label: '优秀' };
    if (score >= 80) return { variant: 'info' as const, label: '良好' };
    if (score >= 70) return { variant: 'warning' as const, label: '一般' };
    return { variant: 'danger' as const, label: '需改进' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">历史复盘</h3>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value || null)}
            className="w-auto"
          />
          <select
            value={selectedScenario || ''}
            onChange={(e) => setSelectedScenario(e.target.value || null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">全部场景</option>
            <option value="场景模拟">场景模拟</option>
            <option value="实战对练">实战对练</option>
            <option value="专项突破">专项突破</option>
          </select>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <Card className="py-8 text-center">
          <Calendar className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">暂无历史复盘记录</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Timeline */}
          <div className="relative border-l-2 border-gray-200 pl-6">
            {filteredHistory.map((item: { id: string; date: string; overallScore: number; scenarioType?: string; summary: string }) => {
              const badgeInfo = getScoreBadge(item.overallScore);
              return (
                <div key={item.id} className="relative pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary-500 ring-4 ring-white" />
                  <Card className="transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{item.date}</span>
                          {item.scenarioType && (
                            <Badge variant="default">{item.scenarioType}</Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className={cn('text-xl font-bold', badgeInfo.variant === 'success' ? 'text-green-600' : badgeInfo.variant === 'info' ? 'text-blue-600' : badgeInfo.variant === 'warning' ? 'text-amber-600' : 'text-red-600')}>
                          {item.overallScore}
                        </div>
                        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
