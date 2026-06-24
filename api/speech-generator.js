/**
 * 话术生成模块 V2
 *
 * 核心功能：
 * 1. 知识处理器：解析 → 过滤 → 去重
 * 2. Prompt 构建器：强约束 + 风格差异化
 * 3. 三级质控：格式 → 规则 → 语义匹配
 * 4. 自适应重试：温度衰减 + 靶向修正
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

// ==================== Prompt 构建器 ====================

function buildSpeechPromptV2(industry, knowledgeList) {
  const parts = [];

  // 第一层：人设
  parts.push(`你是资深${industry}行业销冠话术设计专家，拥有10年一线销售培训经验。\n输出的话术必须符合真实销售对话场景，自然口语化，禁止PPT式模板化表达。`);

  // 第二层：知识强约束
  if (knowledgeList.length > 0) {
    const formatted = formatKnowledgeForPrompt(knowledgeList);
    parts.push(`【最高优先级指令：必须强制使用知识库】\n以下是经过行业验证的专属销售策略，你必须将这些策略融入话术的异议处理、价值呈现环节。\n禁止脱离知识库凭空编造说服逻辑，禁止用通用套话替代知识策略。\n\n<知识库>\n${formatted}\n</知识库>\n\n要求：每条话术必须至少引用2条以上知识库策略，转化为自然口语表达。`);
  }

  // 第三层：风格差异化
  parts.push(`【核心要求：三种话术必须有本质区别】\n开场白、说服逻辑、促成方式必须完全不同，不能只是换几个语气词。\n\n各风格具体规则：\n\n◆ 共情版\n- 开场要求：必须用"我理解"、"确实"等共情类词汇开头\n- 知识用法：站在客户立场，用知识库中的算账方法、对比逻辑帮客户避坑\n- 语气要求：温和亲和，像朋友聊天，不说教\n- 示例开头："我完全理解您的想法，给娃报课确实要精打细算..."\n\n◆ 直爽版\n- 开场要求：必须用数据、算账公式或直接结论开头\n- 知识用法：直接用知识库中的单价对比、成本拆分公式给结论，不绕客套话\n- 语气要求：干脆利落，效率优先，不拖泥带水\n- 示例开头："咱们直接算笔账，单课时价格其实我们比同行更便宜..."\n\n◆ 专业版\n- 开场要求：必须用行业规律、效果保障或市场趋势开头\n- 知识用法：用知识库中的零风险策略、行业普遍规律做专业背书，体现顾问身份\n- 语气要求：理性客观，顾问式沟通，有说服力\n- 示例开头："其实家长选机构最核心看两点：单课时成本和效果保障..."`);

  // 第四层：结构要求
  parts.push(`【每套话术必须包含4个环节，用小标题标注】\n1. 开场白（1-2句）：严格符合对应风格的开场要求\n2. 异议处理（2-3句）：必须用到知识库中的核心策略\n3. 价值呈现（2-3个卖点）：转化为客户的实际收益\n4. 促成动作（1句）：给客户明确的行动理由`);

  // 第五层：质量红线
  parts.push(`【质量红线 - 违反直接不合格】\n❌ 禁止使用 XX、某某、相关优势 等无意义占位符，必须用具体表述\n❌ 禁止书面语、官方话术，必须像真人说话一样口语化\n❌ 三套话术开场白绝对不能相同\n❌ 单套话术不得超过500字\n❌ 禁止脱离知识库编造销售策略`);

  // 第六层：输出格式
  parts.push(`【输出格式】严格返回标准JSON，不要任何多余解释文字：\n{\n  "tacticalExecutionPaths": [\n    {"pathType": "共情版", "verbalScript": "完整话术内容"},\n    {"pathType": "直爽版", "verbalScript": "完整话术内容"},\n    {"pathType": "专业版", "verbalScript": "完整话术内容"}\n  ],\n  "confidenceScore": 0.85,\n  "knowledgeUsed": ["本次用到的知识ID和策略摘要"]\n}`);

  return parts.join('\n\n');
}

// ==================== 三级质控评估器 ====================

function evaluateSpeech(result, knowledgeList) {
  // Level1: 格式校验
  if (!result || typeof result !== 'object') return { passed: false, level: 1, feedback: '返回结果不是合法JSON对象', suggestions: [] };
  if (!Array.isArray(result.tacticalExecutionPaths)) return { passed: false, level: 1, feedback: '缺少 tacticalExecutionPaths 字段', suggestions: [] };
  if (result.tacticalExecutionPaths.length !== 3) return { passed: false, level: 1, feedback: '话术风格数量不符合要求（需3种）', suggestions: [] };

  const styles = result.tacticalExecutionPaths;
  const allContent = styles.map(s => s.verbalScript || '').join(' ');

  // Level2: 规则校验
  const forbidden = ['XX', '某某', '某公司', '具体说明', '（具体', '相关优势', '等方面'];
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

  // 知识落地三层校验
  if (knowledgeList.length > 0) {
    const totalLength = styles.reduce((sum, s) => sum + (s.verbalScript || '').length, 0);
    if (totalLength < 200) {
      return { passed: false, level: 2, feedback: '话术内容过短', suggestions: ['补充完整的话术内容'] };
    }

    const knowledgeUsed = result.knowledgeUsed || [];
    if (!Array.isArray(knowledgeUsed) || knowledgeUsed.length === 0) {
      return { passed: false, level: 2, feedback: '未标注引用的知识库内容', suggestions: ['填写 knowledgeUsed 字段，标注用到的知识库策略'] };
    }

    const strategyKeywords = new Set();
    knowledgeList.forEach(kn => {
      const phrases = kn.strategy.match(/[一-龥]{2,}(?:价格|成本|效果|算|对比|便宜|试听|退费|课时)/g) || [];
      phrases.forEach(p => strategyKeywords.add(p));
    });
    const contentWords = new Set(allContent.match(/[一-龥]{2,}/g) || []);
    let overlap = 0;
    strategyKeywords.forEach(k => { if (contentWords.has(k)) overlap++; });
    const overlapRate = strategyKeywords.size > 0 ? overlap / strategyKeywords.size : 1;

    if (strategyKeywords.size > 0 && overlapRate < 0.1) {
      return { passed: false, level: 2, feedback: '话术未体现知识库核心策略，通用化严重', suggestions: ['将知识库的核心策略融入异议处理环节'] };
    }
  }

  return { passed: true, level: 3, overallScore: 0.85, feedback: '通过', suggestions: [] };
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

    if (attempt > 0 && lastEval) {
      currentUserPrompt += `\n\n【质量校验未通过，定向修正指令】\n上一版问题：${lastEval.feedback}\n\n修正要求：\n1. 保留原有框架，只修改问题点\n2. 三种话术开场白必须不同\n3. 必须使用知识库策略\n4. 必须填写 knowledgeUsed 字段\n\n改进建议：\n${lastEval.suggestions.map(s => `- ${s}`).join('\n')}`;
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
