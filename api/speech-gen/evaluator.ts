import type { SpeechGenerateResult, EvalResult, KnowledgeItem } from './types';
import { SPEECH_GEN_CONFIG } from './config';

export class SpeechEvaluator {
  /** Level1：格式硬校验 */
  private static level1FormatCheck(result: any): EvalResult {
    const defaultFail: EvalResult = {
      passed: false,
      level: 1,
      overallScore: 0,
      feedback: '',
      suggestions: []
    };

    if (!result || typeof result !== 'object') {
      return { ...defaultFail, feedback: '返回结果不是合法JSON对象' };
    }
    if (!Array.isArray(result.tacticalExecutionPaths)) {
      return { ...defaultFail, feedback: '缺少 tacticalExecutionPaths 字段' };
    }
    if (result.tacticalExecutionPaths.length !== 3) {
      return { ...defaultFail, feedback: '话术风格数量不符合要求（需3种）' };
    }

    const requiredFields = ['pathType', 'verbalScript'];
    for (const item of result.tacticalExecutionPaths) {
      if (!requiredFields.every(f => f in item)) {
        return { ...defaultFail, feedback: '话术条目缺少必填字段' };
      }
    }

    return {
      passed: true,
      level: 1,
      overallScore: 1,
      feedback: '格式校验通过',
      suggestions: []
    };
  }

  /** 计算Jaccard文本相似度 */
  private static jaccardSimilarity(a: string, b: string): number {
    const getWords = (s: string) => new Set(s.match(/[一-龥]{2,}/g) || []);
    const wa = getWords(a);
    const wb = getWords(b);
    if (wa.size === 0 || wb.size === 0) return 0;
    let intersection = 0;
    wa.forEach(w => { if (wb.has(w)) intersection++; });
    return intersection / (wa.size + wb.size - intersection);
  }

  /** Level2：业务规则硬拦截 */
  private static level2RuleCheck(
    result: SpeechGenerateResult,
    knowledgeList: KnowledgeItem[]
  ): EvalResult {
    const styles = result.tacticalExecutionPaths;
    const allContent = styles.map(s => s.verbalScript).join(' ');
    const defaultFail: EvalResult = {
      passed: false,
      level: 2,
      overallScore: 0.3,
      feedback: '',
      suggestions: []
    };

    // 1. 占位符检测
    for (const ph of SPEECH_GEN_CONFIG.forbiddenPlaceholders) {
      if (allContent.includes(ph)) {
        return {
          ...defaultFail,
          feedback: `检测到禁用占位符：${ph}`,
          suggestions: [`将所有 ${ph} 替换为具体的行业表述`]
        };
      }
    }

    // 2. 话术环节完整性检测
    const sections = SPEECH_GEN_CONFIG.requiredSections;
    for (const style of styles) {
      const missing = sections.filter(s => !style.verbalScript.includes(s));
      if (missing.length > 0) {
        return {
          ...defaultFail,
          feedback: `${style.pathType}缺少环节：${missing.join('、')}`,
          suggestions: [`补充 ${missing.join('、')} 环节，并用小标题标注`]
        };
      }
    }

    // 3. 风格差异化检测
    const sim01 = this.jaccardSimilarity(styles[0].verbalScript, styles[1].verbalScript);
    const sim12 = this.jaccardSimilarity(styles[1].verbalScript, styles[2].verbalScript);
    const threshold = SPEECH_GEN_CONFIG.styleSimilarityThreshold;
    if (sim01 >= threshold || sim12 >= threshold) {
      return {
        ...defaultFail,
        feedback: `三种风格内容相似度超过 ${threshold * 100}%，差异化不足`,
        suggestions: [
          '调整每套话术的核心说服逻辑，不要只是换语气词',
          '不同风格使用不同的知识库策略切入'
        ]
      };
    }

    // 4. 知识落地度检测
    if (knowledgeList.length > 0) {
      const strategyWords = new Set<string>();
      knowledgeList.forEach(kn => {
        (kn.strategy.match(/[一-龥]{2,}/g) || []).forEach(w => strategyWords.add(w));
      });
      const contentWords = new Set(allContent.match(/[一-龥]{2,}/g) || []);
      let overlap = 0;
      strategyWords.forEach(w => { if (contentWords.has(w)) overlap++; });
      const overlapRate = strategyWords.size > 0 ? overlap / strategyWords.size : 0;
      if (overlapRate < SPEECH_GEN_CONFIG.knowledgeOverlapThreshold) {
        return {
          ...defaultFail,
          feedback: '话术未有效引用知识库内容，通用化严重',
          suggestions: [
            '将知识库中的核心策略融入异议处理环节',
            '用知识库中的算账方法、对比逻辑替代空泛表述'
          ]
        };
      }
    }

    return {
      passed: true,
      level: 2,
      overallScore: 0.8,
      feedback: '规则校验通过',
      suggestions: []
    };
  }

  /** 主评估入口：三级校验串联 */
  static evaluate(
    result: any,
    knowledgeList: KnowledgeItem[] = []
  ): EvalResult {
    // Level 1
    const level1 = this.level1FormatCheck(result);
    if (!level1.passed) return level1;

    // Level 2
    const level2 = this.level2RuleCheck(result as SpeechGenerateResult, knowledgeList);
    if (!level2.passed) return level2;

    // Level 3：通过
    return {
      passed: true,
      level: 3,
      overallScore: 0.85,
      feedback: '全量校验通过',
      suggestions: []
    };
  }
}
