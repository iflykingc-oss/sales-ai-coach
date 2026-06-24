import type { SpeechGenerateResult, EvalResult, KnowledgeItem } from './types';
import { SPEECH_GEN_CONFIG } from './config';
import { SpeechPromptBuilder } from './promptBuilder';
import { SpeechEvaluator } from './evaluator';

type GenerateFn = (
  systemPrompt: string,
  userPrompt: string,
  temperature: number
) => Promise<any>;

export class RetryEngine {
  private readonly maxRetries: number;
  private readonly passScore: number;

  constructor(customConfig?: Partial<typeof SPEECH_GEN_CONFIG>) {
    const config = { ...SPEECH_GEN_CONFIG, ...customConfig };
    this.maxRetries = config.maxRetries;
    this.passScore = config.passScore;
  }

  /**
   * 带重试的生成主流程
   */
  async runWithRetry(
    generateFn: GenerateFn,
    baseSystemPrompt: string,
    baseUserPrompt: string,
    knowledgeList: KnowledgeItem[]
  ): Promise<SpeechGenerateResult> {
    let lastResult: any = null;
    let lastEval: EvalResult | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // 计算当前温度：逐次衰减
      const temperature = Math.max(
        SPEECH_GEN_CONFIG.minTemperature,
        SPEECH_GEN_CONFIG.baseTemperature - attempt * SPEECH_GEN_CONFIG.temperatureDecay
      );

      // 构建当前轮次的用户提示
      let currentUserPrompt = baseUserPrompt;
      if (attempt > 0 && lastEval) {
        const retryInstruction = SpeechPromptBuilder.buildRetryInstruction(
          lastEval.feedback,
          lastEval.suggestions
        );
        currentUserPrompt = `${baseUserPrompt}\n\n${retryInstruction}`;
      }

      // 执行生成
      try {
        lastResult = await generateFn(baseSystemPrompt, currentUserPrompt, temperature);
      } catch (err) {
        lastResult = { error: (err as Error).message };
      }

      // 质量评估
      lastEval = SpeechEvaluator.evaluate(lastResult, knowledgeList);

      // 通过则直接返回
      if (lastEval.passed && lastEval.overallScore >= this.passScore) {
        return {
          ...lastResult,
          meta: {
            retryAttempts: attempt,
            status: 'SUCCESS',
            knowledgeCount: knowledgeList.length
          }
        };
      }

      console.info(`[SpeechGen] 第${attempt}轮生成未通过，原因：${lastEval.feedback}`);
    }

    // 重试耗尽：降级交付
    console.warn('[SpeechGen] 已达最大重试次数，降级交付');
    return {
      ...lastResult,
      meta: {
        retryAttempts: this.maxRetries,
        status: 'DEGRADED',
        knowledgeCount: knowledgeList.length
      },
      error: lastEval?.feedback || '质量未达标，降级输出'
    };
  }
}
