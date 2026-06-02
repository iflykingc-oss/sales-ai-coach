// 销冠AI教练 - Background Service Worker

// 安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('销冠AI教练扩展已安装');

  // 设置默认配置
  chrome.storage.local.set({
    enabled: true,
    autoShow: true,
    tipDuration: 8000,
  });
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_TRANSCRIPT') {
    // 分析对话内容
    const analysis = analyzeTranscript(message.transcript);
    sendResponse({ analysis });
  }

  if (message.type === 'GET_COACHING_TIPS') {
    // 获取教练建议
    const tips = getCoachingTips(message.context);
    sendResponse({ tips });
  }

  return true; // 保持消息通道开放
});

// 分析对话内容
function analyzeTranscript(transcript) {
  const result = {
    objections: [],
    buyingSignals: [],
    sentiment: 'neutral',
    suggestions: [],
  };

  // 检测异议
  const objectionPatterns = [
    { pattern: /价格|太贵|便宜/, type: 'price', tip: '客户关注价格，强调价值而非成本' },
    { pattern: /预算|没钱|资金/, type: 'budget', tip: '客户预算有限，提供灵活付款方案' },
    { pattern: /考虑|想想|再看/, type: 'hesitation', tip: '客户犹豫，了解具体顾虑' },
    { pattern: /对比|比较|竞品/, type: 'competition', tip: '客户在对比，准备差异化话术' },
    { pattern: /不需要|没兴趣/, type: 'rejection', tip: '客户拒绝，尝试重新定位价值' },
  ];

  objectionPatterns.forEach(({ pattern, type, tip }) => {
    if (pattern.test(transcript)) {
      result.objections.push({ type, tip });
      result.suggestions.push(tip);
    }
  });

  // 检测购买信号
  const buyingPatterns = [
    { pattern: /什么时候|何时/, signal: 'timing' },
    { pattern: /怎么合作|如何开始/, signal: 'process' },
    { pattern: /下一步|接下来/, signal: 'next_step' },
    { pattern: /签约|合同|付款/, signal: 'closing' },
  ];

  buyingPatterns.forEach(({ pattern, signal }) => {
    if (pattern.test(transcript)) {
      result.buyingSignals.push(signal);
    }
  });

  // 情感分析（简化版）
  const positiveWords = ['好', '不错', '可以', '满意', '喜欢'];
  const negativeWords = ['不好', '差', '失望', '不满', '问题'];

  const positiveCount = positiveWords.filter(w => transcript.includes(w)).length;
  const negativeCount = negativeWords.filter(w => transcript.includes(w)).length;

  if (positiveCount > negativeCount) {
    result.sentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    result.sentiment = 'negative';
  }

  return result;
}

// 获取教练建议
function getCoachingTips(context) {
  const tips = [];

  // 基于话轮比的建议
  if (context.talkRatio > 60) {
    tips.push({
      type: 'warning',
      text: '你说得太多，多问开放性问题让客户表达',
    });
  } else if (context.talkRatio < 30) {
    tips.push({
      type: 'info',
      text: '适当增加发言，展示专业性和价值',
    });
  }

  // 基于异议的建议
  if (context.objectionCount > 3) {
    tips.push({
      type: 'objection',
      text: '客户异议较多，先建立信任再推进',
    });
  }

  // 基于通话时长的建议
  if (context.duration > 30 * 60) {
    tips.push({
      type: 'closing',
      text: '通话已超过30分钟，考虑推进到下一步',
    });
  }

  return tips;
}
