// 销冠AI教练 - Background Service Worker

const CONFIG = {
  API_BASE: 'https://www.aisalecoach.work/api',
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
};

// 安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SalesCoach] 扩展已安装');

  // 设置默认配置
  chrome.storage.local.set({
    enabled: true,
    autoShow: true,
    tipDuration: 8000,
  });
});

// ============================================================================
// API调用（带重试）
// ============================================================================

async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // 流式响应 - 读取全部文本
        const text = await response.text();
        return { ok: true, data: text, stream: true };
      }

      const data = await response.json();
      return { ok: true, data: data };
    } catch (err) {
      console.warn('[SalesCoach] API attempt ' + (attempt + 1) + ' failed:', err.message);

      if (attempt < retries) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (attempt + 1)));
      } else {
        return { ok: false, error: err.message };
      }
    }
  }
}

// 调用后端分析API
async function callAnalysisAPI(transcript, context) {
  const url = CONFIG.API_BASE + '/practices/message/stream';

  const body = {
    message: transcript,
    context: context || {},
    timestamp: Date.now(),
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  const result = await fetchWithRetry(url, options);

  if (!result.ok) {
    console.error('[SalesCoach] API call failed:', result.error);
    return null;
  }

  // 解析响应
  if (result.stream) {
    // 流式响应 - 尝试解析最后一行JSON
    return parseStreamResponse(result.data);
  }

  return result.data;
}

// 解析流式响应（SSE格式或纯文本）
function parseStreamResponse(text) {
  try {
    // 尝试直接解析为JSON
    return JSON.parse(text);
  } catch (e) {
    // 尝试从SSE格式中提取最后一个data块
    const lines = text.split('\n');
    let lastData = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload && payload !== '[DONE]') {
          lastData = payload;
        }
      }
    }

    if (lastData) {
      try {
        return JSON.parse(lastData);
      } catch (e2) {
        // 返回原始文本作为建议
        return { suggestions: [lastData] };
      }
    }

    // 如果文本非空，作为建议返回
    if (text.trim()) {
      // 提取有意义的文本行
      const meaningfulLines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('data:') && !l.startsWith(':') && l !== '[DONE]');

      if (meaningfulLines.length > 0) {
        return { suggestions: [meaningfulLines.join(' ')] };
      }
    }

    return null;
  }
}

// 本地分析（降级方案）
function analyzeTranscriptLocal(transcript) {
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

  objectionPatterns.forEach(function(ref) {
    if (ref.pattern.test(transcript)) {
      result.objections.push({ type: ref.type, tip: ref.tip });
      result.suggestions.push(ref.tip);
    }
  });

  // 检测购买信号
  const buyingPatterns = [
    { pattern: /什么时候|何时/, signal: 'timing' },
    { pattern: /怎么合作|如何开始/, signal: 'process' },
    { pattern: /下一步|接下来/, signal: 'next_step' },
    { pattern: /签约|合同|付款/, signal: 'closing' },
  ];

  buyingPatterns.forEach(function(ref) {
    if (ref.pattern.test(transcript)) {
      result.buyingSignals.push(ref.signal);
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

// 获取教练建议（基于上下文）
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

// ============================================================================
// 消息监听
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // content.js 请求分析对话
  if (message.action === 'ANALYZE_TRANSCRIPT') {
    handleAnalyzeTranscript(message, sendResponse);
    return true; // 异步响应
  }

  // content.js 请求教练建议
  if (message.action === 'GET_COACHING_TIPS' || message.type === 'GET_COACHING_TIPS') {
    const tips = getCoachingTips(message.context || {});
    sendResponse({ tips: tips });
    return true;
  }

  // content.js 发送状态更新 -> 转发到所有监听者（sidepanel等）
  if (message.type === 'STATE_UPDATE') {
    // 广播给所有扩展页面
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATE',
      data: message.data
    }).catch(() => {
      // 没有接收者时忽略
    });
    return false;
  }

  // content.js 发送提示更新 -> 转发
  if (message.type === 'TIP_UPDATE') {
    chrome.runtime.sendMessage({
      type: 'TIP_UPDATE',
      data: message.data
    }).catch(() => {
      // 忽略
    });
    return false;
  }

  // 本地分析（作为ANALYZE_TRANSCRIPT的降级）
  if (message.type === 'ANALYZE_TRANSCRIPT') {
    const analysis = analyzeTranscriptLocal(message.transcript || '');
    sendResponse({ analysis: analysis });
    return true;
  }

  return false;
});

// 处理对话分析请求
async function handleAnalyzeTranscript(message, sendResponse) {
  const transcript = message.transcript;
  const context = message.context;

  if (!transcript || transcript.trim().length < 3) {
    sendResponse({ analysis: null, error: 'Transcript too short' });
    return;
  }

  // 先尝试调用后端API
  const apiResult = await callAnalysisAPI(transcript, context);

  if (apiResult) {
    // API调用成功
    sendResponse({ analysis: apiResult });
  } else {
    // API调用失败，使用本地分析降级
    console.log('[SalesCoach] API unavailable, using local analysis');
    const localResult = analyzeTranscriptLocal(transcript);
    sendResponse({ analysis: localResult, fallback: true });
  }
}
