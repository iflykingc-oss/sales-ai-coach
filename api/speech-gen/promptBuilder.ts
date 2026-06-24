import type { KnowledgeItem, SpeechStyleType } from './types';
import { SPEECH_GEN_CONFIG } from './config';
import { KnowledgeProcessor } from './knowledgeProcessor';

export class SpeechPromptBuilder {
  /**
   * 构建系统提示词（叠加式：基础人设 → 知识强约束 → 风格规则 → 质量红线 → 输出格式）
   */
  static buildSystemPrompt(
    industry: string,
    knowledgeList: KnowledgeItem[]
  ): string {
    const parts: string[] = [];

    // ===== 第一层：基础人设 =====
    parts.push(`你是资深${industry}行业销冠话术设计专家，拥有10年一线销售培训经验。
输出的话术必须符合真实销售对话场景，自然口语化，禁止PPT式模板化表达。`);

    // ===== 第二层：知识库强约束 =====
    if (knowledgeList.length > 0) {
      const formattedKnowledge = KnowledgeProcessor.formatForPrompt(knowledgeList);
      parts.push(`
【最高优先级指令：必须强制使用知识库】
以下是经过行业验证的专属销售策略，你必须将这些策略融入话术的异议处理、价值呈现环节。
禁止脱离知识库凭空编造说服逻辑，禁止用通用套话替代知识策略。

<知识库>
${formattedKnowledge}
</知识库>

要求：每条话术必须至少引用2条以上知识库策略，转化为自然口语表达。
      `.trim());
    }

    // ===== 第三层：风格差异化规则 =====
    parts.push(`
【核心要求：三种话术必须有本质区别】
开场白、说服逻辑、促成方式必须完全不同，不能只是换几个语气词。

各风格具体规则：
    `.trim());

    const styleKeys = Object.keys(SPEECH_GEN_CONFIG.styleRules) as SpeechStyleType[];
    for (const style of styleKeys) {
      const rule = SPEECH_GEN_CONFIG.styleRules[style];
      parts.push(`
◆ ${style}
- 开场要求：${rule.openingRule}
- 知识用法：${rule.strategyUsage}
- 语气要求：${rule.tone}
- 示例开头："${rule.example}"
      `.trim());
    }

    // ===== 第四层：话术结构要求 =====
    parts.push(`
【每套话术必须包含4个环节，用小标题标注】
1. 开场白（1-2句）：严格符合对应风格的开场要求
2. 异议处理（2-3句）：必须用到知识库中的核心策略
3. 价值呈现（2-3个卖点）：转化为客户的实际收益
4. 促成动作（1句）：给客户明确的行动理由
    `.trim());

    // ===== 第五层：质量红线 =====
    parts.push(`
【质量红线 - 违反直接不合格】
❌ 禁止使用 XX、某某、相关优势 等无意义占位符，必须用具体表述
❌ 禁止书面语、官方话术，必须像真人说话一样口语化
❌ 三套话术开场白绝对不能相同
❌ 单套话术不得超过500字
❌ 禁止脱离知识库编造销售策略
    `.trim());

    // ===== 第六层：输出格式 =====
    parts.push(`
【输出格式】严格返回标准JSON，不要任何多余解释文字：
{
  "tacticalExecutionPaths": [
    {"pathType": "共情版", "verbalScript": "完整话术内容"},
    {"pathType": "直爽版", "verbalScript": "完整话术内容"},
    {"pathType": "专业版", "verbalScript": "完整话术内容"}
  ],
  "confidenceScore": 0.85,
  "knowledgeUsed": ["本次用到的知识ID和策略摘要"]
}
    `.trim());

    return parts.join('\n\n');
  }

  /** 构建用户提示词 */
  static buildUserPrompt(userScene: string): string {
    return `请针对以下销售场景生成三套话术：\n${userScene}`;
  }

  /** 构建重试修正指令 */
  static buildRetryInstruction(evalFeedback: string, suggestions: string[]): string {
    return `
【质量校验未通过，定向修正指令】
上一版话术存在的问题：${evalFeedback}

修正要求：
1. 严格保留原有话术的整体框架和核心策略，禁止重新生成全新内容
2. 只针对上述问题点做精准修改，其余内容保持不变
3. 修改后仍然必须遵守知识库使用规则和风格差异化要求
4. 维持标准JSON格式输出，结构与上一版完全一致

改进建议：
${suggestions.map(s => `- ${s}`).join('\n')}
    `.trim();
  }
}
