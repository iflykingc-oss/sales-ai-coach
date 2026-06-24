import type { GenerateParams, SpeechGenerateResult } from './types';
import { KnowledgeProcessor } from './knowledgeProcessor';
import { SpeechPromptBuilder } from './promptBuilder';
import { RetryEngine } from './retryEngine';

/**
 * 企业级话术生成主入口
 * 可直接替换现有 /api/scripts/generate 中的生成逻辑
 */
export async function generateSalesSpeech(
  params: GenerateParams,
  llmCallFn: (system: string, user: string, temp: number) => Promise<any>
): Promise<SpeechGenerateResult> {
  const { userScene, industry, objectionType, rawKnowledge } = params;
  const startTime = Date.now();

  try {
    // Step1: 知识清洗处理
    const knowledgeList = KnowledgeProcessor.process(rawKnowledge, industry, objectionType);
    console.info(`[SpeechGen] 知识处理完成：原始${rawKnowledge.length}条 → 清洗后${knowledgeList.length}条`);

    // Step2: 构建 Prompt
    const systemPrompt = SpeechPromptBuilder.buildSystemPrompt(industry, knowledgeList);
    const userPrompt = SpeechPromptBuilder.buildUserPrompt(userScene);

    // Step3: 重试引擎驱动生成 + 质控闭环
    const retryEngine = new RetryEngine();
    const result = await retryEngine.runWithRetry(
      llmCallFn,
      systemPrompt,
      userPrompt,
      knowledgeList
    );

    // Step4: 埋点日志
    const duration = Date.now() - startTime;
    console.info(`[SpeechGen] 生成完成，耗时${duration}ms，状态：${result.meta?.status}，重试次数：${result.meta?.retryAttempts}`);

    return result;

  } catch (err) {
    // 全局异常降级
    console.error('[SpeechGen] 生成流程异常，降级输出', err);
    return {
      tacticalExecutionPaths: [
        {
          pathType: '共情版',
          verbalScript: '开场白：我特别理解您的顾虑，毕竟这不是小事。异议处理：咱们的性价比其实很高，我给您详细说说。价值呈现：首先是质量有保障，其次是服务全程跟进。促成：要不您先体验一次，感受下效果？'
        },
        {
          pathType: '直爽版',
          verbalScript: '开场白：咱们直接说重点，价格其实很划算。异议处理：算下来比同行平均水平低不少。价值呈现：而且包含配套服务，不用额外花钱。促成：今天还有优惠，您看要不要定下来？'
        },
        {
          pathType: '专业版',
          verbalScript: '开场白：从行业普遍情况来看，选产品核心看三点：质量、服务、保障。异议处理：我们在这三点上都有明确的标准。价值呈现：从长期来看，投入产出比是很高的。促成：我建议您可以先做个评估，再决定。'
        }
      ],
      confidenceScore: 0.6,
      knowledgeUsed: [],
      meta: { retryAttempts: 0, status: 'DEGRADED', knowledgeCount: 0 },
      error: (err as Error).message
    };
  }
}

// 导出所有模块供外部使用
export { KnowledgeProcessor } from './knowledgeProcessor';
export { SpeechPromptBuilder } from './promptBuilder';
export { SpeechEvaluator } from './evaluator';
export { RetryEngine } from './retryEngine';
export type { KnowledgeItem, SpeechItem, SpeechGenerateResult, EvalResult, GenerateParams } from './types';
