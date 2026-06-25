import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation() as { state?: { practiceSessionId?: string; autoReview?: boolean } };

  // Auto-review from practice if state is passed
  useEffect(() => {
    const state = location.state as { practiceSessionId?: string; autoReview?: boolean } | null;
    if (state?.practiceSessionId && state?.autoReview) {
      const loadPracticeAndReview = async () => {
        try {
          const res = await api.get(`/practices/${state.practiceSessionId}`) as { data?: { transcript?: Array<{ role: string; content: string }>; scenario?: string } };
          if (res?.data?.transcript) {
            const conversations = [{
              fileName: `practice-${state.practiceSessionId}.txt`,
              content: res.data.transcript.map((t: { role: string; content: string }) => `${t.role === 'user' ? '销售' : '客户'}：${t.content}`).join('\n'),
            }];
            generateMutation.mutate({ conversations });
          }
        } catch (err) {
          logger.error('Failed to load practice for review:', err);
        }
      };
      loadPracticeAndReview();
    }
  }, [location.state]);

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
      const radarScores = (rd.radarScores as Record<string, number>) || {};

      // Compute overallScore from radarScores if not provided
      const scoreValues = Object.values(radarScores).filter((v) => typeof v === 'number' && v > 0);
      const computedScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
        : 0;

      // Normalize recommendations: handle both string[] and object[]
      const rawRecommendations = rd.recommendations || [];
      const recommendations = Array.isArray(rawRecommendations)
        ? rawRecommendations.map((r: unknown) => {
            if (typeof r === 'string') return r;
            if (typeof r === 'object' && r !== null) {
              const obj = r as Record<string, unknown>;
              const parts = [obj.dimension, obj.advice, obj.practice].filter(Boolean);
              return parts.join('：');
            }
            return String(r);
          })
        : [];

      const reportData: ReviewReport = {
        id: (rd.id as string) || `review-${Date.now()}`,
        date: (rd.date as string) || new Date().toLocaleDateString('zh-CN'),
        overallScore: (rd.overallScore as number) || computedScore,
        summary: (rd.summary as string) || 'AI 分析完成，请查看以下维度评分。',
        strengths: (rd.strengths as string[]) || [],
        improvements: (rd.improvements as string[]) || [],
        actionItems: (rd.actionItems as string[]) || [],
        recommendations,
        radarScores,
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
