import type { KnowledgeItem } from './types';
import { SPEECH_GEN_CONFIG } from './config';

/** 简单哈希函数，用于生成知识ID */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export class KnowledgeProcessor {
  /** 文本归一化：去除干扰字符，统一格式 */
  private static normalize(text: string): string {
    return text
      .replace(/[\s，。！？、；：""''（）\[\]【】\.,;:"'()\n\r]/g, '')
      .toLowerCase();
  }

  /** Bigram 语义相似度 */
  private static bigramSimilarity(a: string, b: string): number {
    const normA = this.normalize(a);
    const normB = this.normalize(b);
    if (!normA || !normB) return 0;

    const getBigrams = (s: string) => {
      const set = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
      return set;
    };

    const bgA = getBigrams(normA);
    const bgB = getBigrams(normB);
    let intersection = 0;
    bgA.forEach(bg => { if (bgB.has(bg)) intersection++; });
    const union = bgA.size + bgB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /** 原始知识文本结构化解析 */
  private static parseRawItem(raw: string, index: number, industry: string): KnowledgeItem {
    const sceneMatch = raw.match(/客户说[""]([^""]+)[""]/);
    const strategyMatch = raw.match(/应对策略[：:]([^\n]+)/);
    const exampleMatch = raw.match(/（[""]([^""]+)[""]）/);

    return {
      id: `kn_${industry}_${index}_${Math.abs(hashCode(raw)) % 10000}`,
      industry,
      scene: sceneMatch ? sceneMatch[1] : '通用异议',
      strategy: strategyMatch ? strategyMatch[1].split('（')[0].trim() : raw.slice(0, 100),
      example: exampleMatch ? exampleMatch[1] : '',
      rawScore: 0
    };
  }

  /**
   * 主处理流程：解析 → 异议过滤 → 语义去重 → 结构化输出
   */
  static process(
    rawList: string[],
    industry: string,
    targetObjection: string
  ): KnowledgeItem[] {
    if (!rawList?.length) return [];

    // Step1: 结构化解析
    const parsed = rawList.map((raw, idx) => this.parseRawItem(raw, idx, industry));

    // Step2: 异议类型精准过滤
    const normTarget = this.normalize(targetObjection);
    const filtered = parsed.filter(item => {
      const normScene = this.normalize(item.scene);
      return this.bigramSimilarity(normScene, normTarget) > 0.3;
    });

    // 过滤后为空则降级保留全部
    const sourceList = filtered.length > 0 ? filtered : parsed;

    // Step3: 策略级语义去重
    const deduped: KnowledgeItem[] = [];
    const seenStrategies: string[] = [];

    for (const item of sourceList) {
      const normStrategy = this.normalize(item.strategy);
      let isDuplicate = false;
      for (const seen of seenStrategies) {
        if (this.bigramSimilarity(normStrategy, seen) >= SPEECH_GEN_CONFIG.dedupSimilarityThreshold) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        seenStrategies.push(normStrategy);
        deduped.push(item);
      }
    }

    // Step4: 返回 Top3
    return deduped.slice(0, 3);
  }

  /** 将结构化知识格式化为 Prompt 可用的文本 */
  static formatForPrompt(knowledgeList: KnowledgeItem[]): string {
    if (!knowledgeList.length) return '';
    return knowledgeList.map((kn, idx) => `
${idx + 1}. 知识ID: ${kn.id}
   适用场景: 客户说"${kn.scene}"
   核心策略: ${kn.strategy}
   参考示例: ${kn.example || '无'}
    `.trim()).join('\n\n');
  }
}
