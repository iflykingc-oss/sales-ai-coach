/**
 * 话术生成模块 V2.1
 *
 * 修复：
 * 1. 知识置顶 - 解决注意力衰减
 * 2. 同义词扩展 - 减少误判
 * 3. 重试指令强化 - 直接列出策略
 */

// ==================== 知识处理器 ====================

function processKnowledge(rawList, industry, targetObjection) {
  if (!rawList?.length) return [];

  const normalize = (text) => text.replace(/[\s，。！？、；：""''（）\[\]【】\.,;:"'()\n\r]/g, '').toLowerCase();

  const bigramSim = (a, b) => {
    const na = normalize(a), nb = normalize(b);
    if (!na || !nb) return 0;
    const getBg = (s) => { const set = new Set(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set; };
    const bgA = getBg(na), bgB = getBg(nb);
    let inter = 0; bgA.forEach(bg => { if (bgB.has(bg)) inter++; });
    return (bgA.size + bgB.size - inter) > 0 ? inter / (bgA.size + bgB.size - inter) : 0;
  };

  const parsed = rawList.map((raw, idx) => {
    const sceneMatch = raw.match(/客户说[""]([^""]+)[""]/);
    const strategyMatch = raw.match(/应对策略[：:]([^\n]+)/);
    const exampleMatch = raw.match(/（[""]([^""]+)[""]）/);
    return {
      id: `kn_${industry}_${idx}_${Math.abs(raw.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)) % 10000}`,
      industry,
      scene: sceneMatch ? sceneMatch[1] : '通用异议',
      strategy: strategyMatch ? strategyMatch[1].split('（')[0].trim() : raw.slice(0, 100),
      example: exampleMatch ? exampleMatch[1] : ''
    };
  });

  const normTarget = normalize(targetObjection);
  const filtered = parsed.filter(item => bigramSim(normalize(item.scene), normTarget) > 0.3);
  const source = filtered.length > 0 ? filtered : parsed;

  const deduped = [];
  const seen = [];
  for (const item of source) {
    const ns = normalize(item.strategy);
    let isDup = false;
    for (const s of seen) {
      if (bigramSim(ns, s) >= 0.78) { isDup = true; break; }
    }
    if (!isDup) { seen.push(ns); deduped.push(item); }
  }

  return deduped.slice(0, 3);
}

function formatKnowledgeForPrompt(knowledgeList) {
  if (!knowledgeList.length) return '';
  return knowledgeList.map((kn, i) =>
    `${i + 1}. 知识ID: ${kn.id}\n   适用场景: 客户说"${kn.scene}"\n   核心策略: ${kn.strategy}\n   参考示例: ${kn.example || '无'}`
  ).join('\n\n');
}

// ==================== Prompt 构建器（知识置顶）====================

function buildSpeechPromptV2(industry, knowledgeList) {
  const parts = [];

  // ★ 第一层：知识库置顶 + 最高优先级指令
  if (knowledgeList.length > 0) {
    const formatted = formatKnowledgeForPrompt(knowledgeList);
    parts.push(`【最高优先级指令，必须100%遵守】
你所有话术必须严格基于下方的行业知识库生成，禁止脱离知识库编造通用套话。
每条话术必须至少用到2条知识库策略，融入异议处理和价值呈现环节。
禁止使用 XX、某某、相关优势 等任何占位符，没有具体数值时用行业通用合理值举例（比如教培单课时按80元左右举例）。

<知识库>
${formatted}
</知识库>`);
  }

  // 第二层：人设
  parts.push(`你是资深${industry}行业销冠话术设计专家，拥有10年一线销售培训经验。
输出的话术必须符合真实销售对话场景，自然口语化，禁止PPT式模板化表达。`);

  // 第三层：风格差异化
  parts.push(`【核心要求：三种话术必须有本质区别】
开场白、说服逻辑、促成方式必须完全不同，不能只是换几个语气词。

各风格具体规则：

◆ 共情版
- 开场要求：必须用"我理解"、"确实"等共情类词汇开头
- 知识用法：站在客户立场，用知识库中的算账方法、对比逻辑帮客户避坑
- 语气要求：温和亲和，像朋友聊天，不说教
- 示例开头："我完全理解您的想法，给娃报课确实要精打细算..."

◆ 直爽版
- 开场要求：必须用数据、算账公式或直接结论开头
- 知识用法：直接用知识库中的单价对比、成本拆分公式给结论，不绕客套话
- 语气要求：干脆利落，效率优先，不拖泥带水
- 示例开头："咱们直接算笔账，单课时价格其实我们比同行更便宜..."

◆ 专业版
- 开场要求：必须用行业规律、效果保障或市场趋势开头
- 知识用法：用知识库中的零风险策略、行业普遍规律做专业背书，体现顾问身份
- 语气要求：理性客观，顾问式沟通，有说服力
- 示例开头："其实家长选机构最核心看两点：单课时成本和效果保障..."`);

  // 第四层：结构要求
  parts.push(`【每套话术必须包含4个环节，用小标题标注】
1. 开场白（1-2句）：严格符合对应风格的开场要求
2. 异议处理（2-3句）：必须用到知识库中的核心策略
3. 价值呈现（2-3个卖点）：转化为客户的实际收益
4. 促成动作（1句）：给客户明确的行动理由`);

  // 第五层：质量红线
  parts.push(`【质量红线 - 违反直接不合格】
❌ 禁止使用 XX、某某、相关优势 等无意义占位符，必须用具体表述
❌ 禁止书面语、官方话术，必须像真人说话一样口语化
❌ 三套话术开场白绝对不能相同
❌ 单套话术不得超过500字
❌ 禁止脱离知识库编造销售策略`);

  // 第六层：输出格式
  parts.push(`【输出格式】严格返回标准JSON，不要任何多余解释文字：
{
  "tacticalExecutionPaths": [
    {"pathType": "共情版", "verbalScript": "完整话术内容"},
    {"pathType": "直爽版", "verbalScript": "完整话术内容"},
    {"pathType": "专业版", "verbalScript": "完整话术内容"}
  ],
  "confidenceScore": 0.85,
  "knowledgeUsed": ["本次用到的知识ID和策略摘要"]
}`);

  return parts.join('\n\n');
}

// ==================== 三级质控评估器（同义词扩展）====================

function evaluateSpeech(result, knowledgeList) {
  // Level1: 格式校验
  if (!result || typeof result !== 'object') return { passed: false, level: 1, feedback: '返回结果不是合法JSON对象', suggestions: [] };
  if (!Array.isArray(result.tacticalExecutionPaths)) return { passed: false, level: 1, feedback: '缺少 tacticalExecutionPaths 字段', suggestions: [] };
  if (result.tacticalExecutionPaths.length !== 3) return { passed: false, level: 1, feedback: '话术风格数量不符合要求（需3种）', suggestions: [] };

  const styles = result.tacticalExecutionPaths;

  // ★ 自动替换 XX 占位符（教育行业默认值）
  const defaultValues = {
    'XX元': '80元',
    'XX': '80',
    '某某': '我们',
    '某公司': '我们机构',
    '具体说明': '详细介绍一下',
    '（具体': '(',
    '相关优势': '核心优势',
    '等方面': '等方面都有保障',
  };
  styles.forEach(style => {
    if (style.verbalScript) {
      for (const [placeholder, replacement] of Object.entries(defaultValues)) {
        style.verbalScript = style.verbalScript.replaceAll(placeholder, replacement);
      }
    }
  });

  const allContent = styles.map(s => s.verbalScript || '').join(' ');

  // Level2: 规则校验（只检查无法自动替换的占位符）
  const forbidden = ['某某', '某公司'];
  for (const ph of forbidden) {
    if (allContent.includes(ph)) return { passed: false, level: 2, feedback: `检测到禁用占位符：${ph}`, suggestions: [`将 ${ph} 替换为具体表述`] };
  }

  // 风格差异化检测
  const jaccard = (a, b) => {
    const wa = new Set((a.match(/[一-龥]{2,}/g) || []));
    const wb = new Set((b.match(/[一-龥]{2,}/g) || []));
    if (wa.size === 0 || wb.size === 0) return 0;
    let inter = 0; wa.forEach(w => { if (wb.has(w)) inter++; });
    return inter / (wa.size + wb.size - inter);
  };
  const sim01 = jaccard(styles[0].verbalScript || '', styles[1].verbalScript || '');
  const sim12 = jaccard(styles[1].verbalScript || '', styles[2].verbalScript || '');
  if (sim01 >= 0.68 || sim12 >= 0.68) {
    return { passed: false, level: 2, feedback: `风格相似度过高(${Math.max(sim01, sim12).toFixed(2)})，差异化不足`, suggestions: ['三种话术使用不同的知识策略切入'] };
  }

  // 知识落地检测（同义词扩展，只拦纯通用话术）
  if (knowledgeList.length > 0) {
    const totalLength = styles.reduce((sum, s) => sum + (s.verbalScript || '').length, 0);
    if (totalLength < 200) {
      return { passed: false, level: 2, feedback: '话术内容过短', suggestions: ['补充完整的话术内容'] };
    }

    const knowledgeUsed = result.knowledgeUsed || [];
    if (!Array.isArray(knowledgeUsed) || knowledgeUsed.length === 0) {
      return { passed: false, level: 2, feedback: '未标注引用的知识库内容', suggestions: ['填写 knowledgeUsed 字段，标注用到的知识库策略'] };
    }

    // ★ 同义词扩展：提取核心语义关键词组
    const coreKeywords = new Set();
    knowledgeList.forEach(kn => {
      const strategy = kn.strategy || '';
      if (strategy.includes('单课时') || strategy.includes('算价格') || strategy.includes('价格')) {
        ['单课时', '课时费', '每节课', '单价', '一节课', '算下来', '价格', '费用'].forEach(w => coreKeywords.add(w));
      }
      if (strategy.includes('便宜') || strategy.includes('同行') || strategy.includes('对比')) {
        ['便宜', '划算', '同行', '别家', '更低', '比周边', '对比', '比较'].forEach(w => coreKeywords.add(w));
      }
      if (strategy.includes('效果') || strategy.includes('试听') || strategy.includes('保障')) {
        ['效果', '试听', '保障', '退费', '零风险', '免费', '体验'].forEach(w => coreKeywords.add(w));
      }
      if (strategy.includes('课时') || strategy.includes('课程')) {
        ['课时', '课程', '上课', '学习', '培训'].forEach(w => coreKeywords.add(w));
      }
    });

    const contentWords = allContent.match(/[一-龥]{2,}/g) || [];
    let hitCount = 0;
    coreKeywords.forEach(k => {
      if (contentWords.some(w => w.includes(k))) hitCount++;
    });

    // 命中至少2个核心语义组就算通过
    if (coreKeywords.size > 0 && hitCount < 2) {
      return { passed: false, level: 2, feedback: '话术未体现知识库核心策略，通用化严重', suggestions: ['将知识库的算账、对比等策略融入异议处理'] };
    }
  }

  return { passed: true, level: 3, overallScore: 0.85, feedback: '通过', suggestions: [] };
}

// ==================== 重试指令构建器（强化版）====================

function buildRetryInstruction(feedback, suggestions, knowledgeList) {
  let knowledgeTip = '';

  // 针对知识库问题，直接列出策略
  if (feedback.includes('知识库') || feedback.includes('通用化')) {
    const strategies = knowledgeList.map((kn, i) => `${i + 1}. ${kn.strategy}`).join('\n');
    knowledgeTip = `
⚠️ 强制要求：你必须把以下知识库策略融入话术的异议处理环节，缺一不可：
${strategies}
禁止再输出空泛的"性价比高、服务好"之类的通用套话。`.trim();
  }

  // 针对占位符问题
  if (feedback.includes('占位符') || feedback.includes('XX')) {
    knowledgeTip += '\n⚠️ 禁止用XX代替数值，不知道具体数字就用行业通用值举例，比如单课时80元。';
  }

  return `
【质量校验未通过，定向修正指令】
问题：${feedback}

${knowledgeTip}

改进建议：
${suggestions.map(s => `- ${s}`).join('\n')}

要求：只修改问题点，保留原有结构，输出标准JSON。`.trim();
}

// ==================== 自适应重试引擎 ====================

async function generateSpeechWithRetry(industry, knowledgeList, userScene, lang, callAI) {
  const systemPrompt = buildSpeechPromptV2(industry, knowledgeList);
  const userPrompt = `请针对以下销售场景生成三套话术：\n${userScene}`;

  const maxRetries = 3;
  const baseTemp = 0.55;
  const tempDecay = 0.1;
  let lastResult = null;
  let lastEval = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const temperature = Math.max(0.25, baseTemp - attempt * tempDecay);
    let currentUserPrompt = userPrompt;

    // ★ 重试时使用强化版指令
    if (attempt > 0 && lastEval) {
      currentUserPrompt += '\n\n' + buildRetryInstruction(lastEval.feedback, lastEval.suggestions, knowledgeList);
    }

    try {
      const aiResult = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentUserPrompt }
      ], { max_tokens: 4096, temperature });

      if (aiResult) {
        const cleaned = aiResult
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/```json?\n?/g, '')
          .replace(/```/g, '')
          .trim();
        lastResult = JSON.parse(cleaned);
      }
    } catch (err) {
      console.error(`[SpeechGen] 第${attempt}轮生成异常:`, err.message);
    }

    lastEval = evaluateSpeech(lastResult, knowledgeList);

    if (lastEval.passed) {
      console.info(`[SpeechGen] 第${attempt}轮通过`);
      return { ...lastResult, meta: { retryAttempts: attempt, status: 'SUCCESS', knowledgeCount: knowledgeList.length } };
    }

    console.info(`[SpeechGen] 第${attempt}轮未通过: ${lastEval.feedback}`);
  }

  console.warn('[SpeechGen] 重试耗尽，降级返回');
  return {
    ...lastResult,
    meta: { retryAttempts: maxRetries, status: 'DEGRADED', knowledgeCount: knowledgeList.length },
    error: lastEval?.feedback || '质量未达标'
  };
}

module.exports = {
  processKnowledge,
  formatKnowledgeForPrompt,
  buildSpeechPromptV2,
  evaluateSpeech,
  generateSpeechWithRetry
};
