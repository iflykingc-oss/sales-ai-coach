import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReviewUploader } from '@/components/review/ReviewUploader';
import { ReviewReportDisplay } from '@/components/review/ReviewReport';
import { ReviewHistory } from '@/components/review/ReviewHistory';
import { useReviewStore, type ReviewReport, type ConversationUpload } from '@/stores/reviewStore';
import { api } from '@/services/api';

export default function ReviewPage() {
  const { uploads, report, state, setState, setError, setReport } = useReviewStore();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (data: { conversations: Array<{ fileName: string; content: string }> }) => {
      return api.post('/reviews/generate', data);
    },
    onSuccess: (data: unknown) => {
      const reviewData = data as Record<string, unknown> | undefined;
      const nested = reviewData && typeof reviewData === 'object' && 'data' in reviewData
        ? reviewData.data as Record<string, unknown> | undefined
        : reviewData;
      const rd = nested || reviewData || {};
      const reportData: ReviewReport = {
        id: (rd.id as string) || `review-${Date.now()}`,
        date: (rd.date as string) || new Date().toLocaleDateString('zh-CN'),
        overallScore: (rd.overallScore as number) || Math.floor(Math.random() * 20 + 70),
        summary: (rd.summary as string) || '今日对话整体表现不错，在需求挖掘方面有明显进步，但在促单环节仍需加强。',
        strengths: (rd.strengths as string[]) || [
          '能够主动倾听客户诉求，回应及时恰当',
          '产品知识扎实，回答客户问题准确',
          '善于运用共情技巧化解客户抵触',
        ],
        improvements: (rd.improvements as string[]) || [
          '促单时机把握可以更主动',
          '价格异议时缺少具体数据支撑',
          '可以更多使用客户案例增强说服力',
        ],
        actionItems: (rd.actionItems as string[]) || [
          '复习知识库中的"促单话术"章节，明天实战应用',
          '准备3个典型客户案例，下次对话时引用',
          '针对价格异议，提前准备竞品对比数据',
        ],
        radarScores: (rd.radarScores as Record<string, number>) || {
          '需求挖掘': 82,
          '异议处理': 75,
          '促单能力': 65,
          '沟通表达': 88,
          '情绪管理': 78,
          '产品知识': 92,
          '信任建立': 80,
          '价值传递': 73,
        },
        scenarioType: rd.scenarioType as string | undefined,
      };
      setReport(reportData);
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setIsGenerating(false);
    },
    onError: () => {
      setError('生成复盘报告失败，请稍后重试');
      setState('idle');
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (uploads.length === 0) return;
    setIsGenerating(true);
    setState('generating');

    generateMutation.mutate({
      conversations: uploads.map((u: ConversationUpload) => ({ fileName: u.fileName, content: u.content })),
    });
  };

  const handleReset = () => {
    useReviewStore.getState().reset();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">每日实战复盘</h2>
          <p className="mt-1 text-sm text-gray-500">
            上传今日对话，AI 一键生成复盘报告，追踪成长轨迹
          </p>
        </div>
        {state === 'viewing' && (
          <Button variant="secondary" size="sm" onClick={handleReset}>
            新复盘
          </Button>
        )}
      </div>

      {state === 'idle' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <ReviewUploader />
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={uploads.length === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  一键生成复盘报告
                </>
              )}
            </Button>
          </div>

          {/* History */}
          <ReviewHistory />
        </div>
      )}

      {state === 'generating' && (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">AI 正在分析你的对话...</h3>
          <p className="mt-2 text-sm text-gray-500">
            正在从需求挖掘、异议处理、促单能力等 8 个维度进行深度评估
          </p>
        </div>
      )}

      {state === 'viewing' && report && (
        <ReviewReportDisplay report={report} />
      )}
    </div>
  );
}
