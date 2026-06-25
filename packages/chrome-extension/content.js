// 销冠AI教练 - Content Script
// 在视频通话页面注入实时教练助手

(function() {
  'use strict';

  // 避免重复注入
  if (window.__salesCoachInjected) return;
  window.__salesCoachInjected = true;

  // ============================================================================
  // 配置
  // ============================================================================

  const CONFIG = {
    API_BASE: 'https://www.aisalecoach.work/api',
    CHECK_INTERVAL: 5000, // 5秒检查一次
    TIP_DISPLAY_TIME: 8000, // 提示显示8秒
    ANALYSIS_INTERVAL: 10000, // 10秒分析一次对话
  };

  // ============================================================================
  // 状态管理
  // ============================================================================

  let state = {
    isActive: false,
    isInCall: false,
    currentTip: null,
    talkTime: { user: 0, customer: 0 },
    objections: [],
    persona: null,
    speakingMode: null, // null | 'user' | 'customer'
    speakingStartTime: null,
    transcriptBuffer: '',
  };

  // ============================================================================
  // 后端通信
  // ============================================================================

  // 通过background script发送消息到后端
  function sendMessageToBackend(action, data) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action, ...data }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[SalesCoach] sendMessage error:', chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          resolve(response);
        });
      } catch (err) {
        console.warn('[SalesCoach] sendMessage exception:', err);
        resolve(null);
      }
    });
  }

  // 发送状态更新到sidepanel（通过background转发）
  function broadcastStateUpdate() {
    try {
      chrome.runtime.sendMessage({
        type: 'STATE_UPDATE',
        data: {
          isActive: state.isActive,
          isInCall: state.isInCall,
          talkTime: state.talkTime,
          objections: state.objections.length,
          currentTip: state.currentTip,
          persona: state.persona,
          talkRatio: getTalkRatioText(),
        }
      });
    } catch (err) {
      // sidepanel可能未打开，忽略错误
    }
  }

  // 发送提示更新到sidepanel
  function broadcastTipUpdate(tip, type) {
    try {
      chrome.runtime.sendMessage({
        type: 'TIP_UPDATE',
        data: {
          text: tip,
          type: type,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }
      });
    } catch (err) {
      // 忽略
    }
  }

  // ============================================================================
  // UI 组件
  // ============================================================================

  // 创建浮动助手容器
  function createAssistantUI() {
    const container = document.createElement('div');
    container.id = 'sales-coach-assistant';

    // 使用DOM API构建UI，避免innerHTML XSS风险
    const header = document.createElement('div');
    header.className = 'sc-header';
    header.id = 'sc-header';

    const logo = document.createElement('div');
    logo.className = 'sc-logo';
    logo.textContent = '🎯';

    const title = document.createElement('div');
    title.className = 'sc-title';
    title.textContent = 'AI教练';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'sc-close';
    closeBtn.id = 'sc-close';
    closeBtn.textContent = '×';
    closeBtn.title = '关闭';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sc-toggle';
    toggleBtn.id = 'sc-toggle';
    toggleBtn.textContent = '▼';

    header.appendChild(logo);
    header.appendChild(title);
    header.appendChild(closeBtn);
    header.appendChild(toggleBtn);

    const content = document.createElement('div');
    content.className = 'sc-content';
    content.id = 'sc-content';

    // 提示区域
    const tip = document.createElement('div');
    tip.className = 'sc-tip';
    tip.id = 'sc-tip';

    const tipIcon = document.createElement('div');
    tipIcon.className = 'sc-tip-icon';
    tipIcon.textContent = '💡';

    const tipText = document.createElement('div');
    tipText.className = 'sc-tip-text';
    tipText.textContent = '准备就绪，开始通话后将提供实时建议';

    tip.appendChild(tipIcon);
    tip.appendChild(tipText);

    // 指标区域
    const metrics = document.createElement('div');
    metrics.className = 'sc-metrics';
    metrics.id = 'sc-metrics';

    // 发言比例指标
    const metricTalk = document.createElement('div');
    metricTalk.className = 'sc-metric';
    const metricTalkLabel = document.createElement('span');
    metricTalkLabel.className = 'sc-metric-label';
    metricTalkLabel.textContent = '发言比例';
    const metricTalkValue = document.createElement('span');
    metricTalkValue.className = 'sc-metric-value';
    metricTalkValue.id = 'sc-talk-ratio';
    metricTalkValue.textContent = '-';
    metricTalk.appendChild(metricTalkLabel);
    metricTalk.appendChild(metricTalkValue);

    // 异议次数指标
    const metricObj = document.createElement('div');
    metricObj.className = 'sc-metric';
    const metricObjLabel = document.createElement('span');
    metricObjLabel.className = 'sc-metric-label';
    metricObjLabel.textContent = '异议次数';
    const metricObjValue = document.createElement('span');
    metricObjValue.className = 'sc-metric-value';
    metricObjValue.id = 'sc-objections';
    metricObjValue.textContent = '0';
    metricObj.appendChild(metricObjLabel);
    metricObj.appendChild(metricObjValue);

    metrics.appendChild(metricTalk);
    metrics.appendChild(metricObj);

    // 说话切换按钮
    const speakToggle = document.createElement('div');
    speakToggle.className = 'sc-speak-toggle';
    speakToggle.id = 'sc-speak-toggle';

    const speakBtnUser = document.createElement('button');
    speakBtnUser.className = 'sc-speak-btn';
    speakBtnUser.id = 'sc-speak-user';
    speakBtnUser.textContent = '🗣️ 我在说';

    const speakBtnCustomer = document.createElement('button');
    speakBtnCustomer.className = 'sc-speak-btn';
    speakBtnCustomer.id = 'sc-speak-customer';
    speakBtnCustomer.textContent = '🗣️ 客户在说';

    speakToggle.appendChild(speakBtnUser);
    speakToggle.appendChild(speakBtnCustomer);

    // 客户画像区域
    const persona = document.createElement('div');
    persona.className = 'sc-persona';
    persona.id = 'sc-persona';
    persona.style.display = 'none';

    const personaTitle = document.createElement('div');
    personaTitle.className = 'sc-persona-title';
    personaTitle.textContent = '👤 客户画像';

    const personaInfo = document.createElement('div');
    personaInfo.className = 'sc-persona-info';
    personaInfo.id = 'sc-persona-info';

    persona.appendChild(personaTitle);
    persona.appendChild(personaInfo);

    content.appendChild(tip);
    content.appendChild(metrics);
    content.appendChild(speakToggle);
    content.appendChild(persona);

    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);

    return container;
  }

  // 创建提示浮窗
  function createTipOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sc-tip-overlay';

    const overlayContent = document.createElement('div');
    overlayContent.className = 'sc-tip-overlay-content';

    const overlayIcon = document.createElement('div');
    overlayIcon.className = 'sc-tip-overlay-icon';
    overlayIcon.textContent = '💡';

    const overlayText = document.createElement('div');
    overlayText.className = 'sc-tip-overlay-text';
    overlayText.id = 'sc-tip-overlay-text';

    overlayContent.appendChild(overlayIcon);
    overlayContent.appendChild(overlayText);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
    return overlay;
  }

  // ============================================================================
  // 拖拽支持
  // ============================================================================

  function initDrag() {
    const container = document.getElementById('sales-coach-assistant');
    const header = document.getElementById('sc-header');
    if (!container || !header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      // 忽略按钮点击
      if (e.target.closest('.sc-toggle') || e.target.closest('.sc-close')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      // 切换到absolute定位以支持拖拽
      container.style.position = 'fixed';
      container.style.left = startLeft + 'px';
      container.style.top = startTop + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      container.style.left = (startLeft + dx) + 'px';
      container.style.top = (startTop + dy) + 'px';
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  // ============================================================================
  // 核心功能
  // ============================================================================

  // 检测通话平台
  function detectPlatform() {
    const url = window.location.href;
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('meet.google.com')) return 'google-meet';
    if (url.includes('teams.microsoft.com') || url.includes('teams.live.com') || url.includes('teams.cloud.microsoft.com')) return 'teams';
    return null;
  }

  // 检测是否在通话中
  function isInCall() {
    const platform = detectPlatform();
    if (platform === 'zoom') {
      return !!document.querySelector('[class*="meeting"]');
    }
    if (platform === 'google-meet') {
      return !!document.querySelector('[data-allocation-index]');
    }
    if (platform === 'teams') {
      return !!document.querySelector('[data-tid="calling-screen"]');
    }
    return false;
  }

  // 显示提示
  function showTip(tip, type = 'info') {
    const tipElement = document.getElementById('sc-tip');
    const tipOverlay = document.getElementById('sc-tip-overlay');
    const tipOverlayText = document.getElementById('sc-tip-overlay-text');

    if (tipElement) {
      const iconMap = {
        info: '💡',
        warning: '⚠️',
        success: '✅',
        objection: '🛡️',
        closing: '🎯',
      };
      tipElement.querySelector('.sc-tip-icon').textContent = iconMap[type] || '💡';
      tipElement.querySelector('.sc-tip-text').textContent = tip;
      tipElement.className = 'sc-tip sc-tip-' + type;
    }

    // 显示浮窗提示
    if (tipOverlay && tipOverlayText) {
      tipOverlayText.textContent = tip;
      tipOverlay.classList.add('show');
      setTimeout(() => {
        tipOverlay.classList.remove('show');
      }, CONFIG.TIP_DISPLAY_TIME);
    }

    state.currentTip = tip;
    broadcastStateUpdate();
    broadcastTipUpdate(tip, type);
  }

  // 获取话轮比文本
  function getTalkRatioText() {
    const total = state.talkTime.user + state.talkTime.customer;
    if (total === 0) return '-';
    return Math.round((state.talkTime.user / total) * 100) + '%';
  }

  // 更新话轮比
  function updateTalkRatio() {
    const total = state.talkTime.user + state.talkTime.customer;
    if (total === 0) return;

    const userPercent = Math.round((state.talkTime.user / total) * 100);
    const ratioElement = document.getElementById('sc-talk-ratio');

    if (ratioElement) {
      ratioElement.textContent = userPercent + '%';
      ratioElement.className = 'sc-metric-value';

      if (userPercent >= 35 && userPercent <= 50) {
        ratioElement.classList.add('sc-good');
      } else if (userPercent > 55) {
        ratioElement.classList.add('sc-warning');
      } else if (userPercent < 30) {
        ratioElement.classList.add('sc-info');
      }
    }

    // 如果话轮比异常，给出提示
    if (userPercent > 60) {
      showTip('你说得太多了，多问开放性问题让客户表达', 'warning');
    } else if (userPercent < 25 && total > 30) {
      showTip('适当增加发言，展示专业性和价值', 'info');
    }
  }

  // 更新异议计数
  function updateObjections() {
    const objectionsElement = document.getElementById('sc-objections');
    if (objectionsElement) {
      objectionsElement.textContent = state.objections.length;
    }
  }

  // 显示客户画像（XSS安全 - 使用textContent）
  function showPersona(persona) {
    const personaElement = document.getElementById('sc-persona');
    const personaInfo = document.getElementById('sc-persona-info');

    if (personaElement && personaInfo && persona) {
      personaInfo.innerHTML = '';

      const name = document.createElement('div');
      const nameStrong = document.createElement('strong');
      nameStrong.textContent = persona.name || '客户';
      name.appendChild(nameStrong);
      name.appendChild(document.createTextNode(' - ' + (persona.role || '')));

      const personalityDiv = document.createElement('div');
      personalityDiv.textContent = '性格: ' + (persona.personality || persona.traits || '未知');

      const painDiv = document.createElement('div');
      painDiv.textContent = '痛点: ' + (persona.painPoints || persona.pain_points || '未知');

      personaInfo.appendChild(name);
      personaInfo.appendChild(personalityDiv);
      personaInfo.appendChild(painDiv);
      personaElement.style.display = 'block';
    }
  }

  // ============================================================================
  // 说话模式切换（手动话轮追踪）
  // ============================================================================

  function initSpeakToggle() {
    const btnUser = document.getElementById('sc-speak-user');
    const btnCustomer = document.getElementById('sc-speak-customer');
    if (!btnUser || !btnCustomer) return;

    btnUser.addEventListener('click', () => {
      setSpeakingMode('user');
    });

    btnCustomer.addEventListener('click', () => {
      setSpeakingMode('customer');
    });
  }

  function setSpeakingMode(mode) {
    const btnUser = document.getElementById('sc-speak-user');
    const btnCustomer = document.getElementById('sc-speak-customer');
    if (!btnUser || !btnCustomer) return;

    // 先结算上一段发言时间
    if (state.speakingMode && state.speakingStartTime) {
      const elapsed = (Date.now() - state.speakingStartTime) / 1000;
      state.talkTime[state.speakingMode] += elapsed;
    }

    state.speakingMode = mode;
    state.speakingStartTime = Date.now();

    // 更新按钮样式
    btnUser.classList.toggle('sc-speak-active', mode === 'user');
    btnCustomer.classList.toggle('sc-speak-active', mode === 'customer');

    updateTalkRatio();
  }

  // 定期累计发言时间
  function startTalkTimeTracking() {
    setInterval(() => {
      if (state.speakingMode && state.speakingStartTime) {
        const now = Date.now();
        const elapsed = (now - state.speakingStartTime) / 1000;
        state.talkTime[state.speakingMode] += elapsed;
        state.speakingStartTime = now;
        updateTalkRatio();
      }
    }, 1000);
  }

  // ============================================================================
  // 对话分析（连接后端API）
  // ============================================================================

  // 分析对话内容 - 通过background调用后端API
  async function analyzeConversation(transcript) {
    if (!transcript || transcript.trim().length < 5) return;

    // 发送到后端进行AI分析
    const response = await sendMessageToBackend('ANALYZE_TRANSCRIPT', {
      transcript: transcript,
      context: {
        talkRatio: getTalkRatioText(),
        objectionCount: state.objections.length,
        platform: detectPlatform(),
      }
    });

    if (response && response.analysis) {
      const analysis = response.analysis;

      // 处理异议
      if (analysis.objections && analysis.objections.length > 0) {
        analysis.objections.forEach(obj => {
          state.objections.push({ time: Date.now(), text: transcript, type: obj.type });
        });
        updateObjections();
      }

      // 显示AI建议
      if (analysis.suggestions && analysis.suggestions.length > 0) {
        showTip(analysis.suggestions[0], analysis.objections && analysis.objections.length > 0 ? 'objection' : 'info');
      }

      // 检测购买信号
      if (analysis.buyingSignals && analysis.buyingSignals.length > 0) {
        showTip('检测到购买信号！建议立即推进成交', 'closing');
      }

      // 更新客户画像
      if (analysis.persona) {
        state.persona = analysis.persona;
        showPersona(analysis.persona);
      }
    } else {
      // API调用失败，使用本地关键词匹配作为降级方案
      analyzeConversationLocal(transcript);
    }

    broadcastStateUpdate();
  }

  // 本地降级分析
  function analyzeConversationLocal(transcript) {
    const objectionKeywords = ['价格', '太贵', '预算', '考虑', '对比', '不需要', '再看看'];
    const hasObjection = objectionKeywords.some(keyword => transcript.includes(keyword));

    if (hasObjection) {
      state.objections.push({ time: Date.now(), text: transcript });
      updateObjections();

      const tips = [
        '客户提到价格异议，建议强调价值而非价格',
        '客户在对比竞品，准备差异化话术',
        '客户表示需要考虑，尝试了解具体顾虑',
      ];
      showTip(tips[Math.floor(Math.random() * tips.length)], 'objection');
    }

    const buyingSignals = ['什么时候', '怎么合作', '下一步', '签约', '付款'];
    const hasBuyingSignal = buyingSignals.some(signal => transcript.includes(signal));

    if (hasBuyingSignal) {
      showTip('检测到购买信号！建议立即推进成交', 'closing');
    }
  }

  // 定期分析页面上的对话内容
  function startPeriodicAnalysis() {
    setInterval(async () => {
      if (!state.isInCall) return;

      // 尝试从页面提取对话文本
      const transcript = extractTranscript();
      if (transcript && transcript.length > 10) {
        await analyzeConversation(transcript);
      }
    }, CONFIG.ANALYSIS_INTERVAL);
  }

  // 从页面提取对话文本（平台特定）
  function extractTranscript() {
    const platform = detectPlatform();
    let text = '';

    try {
      if (platform === 'zoom') {
        // Zoom 字幕区域
        const captions = document.querySelectorAll('[class*="caption"], [class*="subtitle"]');
        captions.forEach(el => { text += el.textContent + ' '; });
      } else if (platform === 'google-meet') {
        // Google Meet 字幕
        const captions = document.querySelectorAll('[class*="caption"], [data-message-text]');
        captions.forEach(el => { text += el.textContent + ' '; });
      } else if (platform === 'teams') {
        // Teams 字幕/聊天
        const captions = document.querySelectorAll('[data-tid="closed-captions"], [class*="caption"]');
        captions.forEach(el => { text += el.textContent + ' '; });
      }
    } catch (err) {
      console.warn('[SalesCoach] extractTranscript error:', err);
    }

    return text.trim();
  }

  // ============================================================================
  // SPA导航检测（MutationObserver）
  // ============================================================================

  function initNavigationObserver() {
    const observer = new MutationObserver(() => {
      const inCall = isInCall();
      if (inCall && !state.isInCall) {
        state.isInCall = true;
        state.isActive = true;
        showAssistant();
        showTip('通话已开始，AI教练已就绪', 'success');
      } else if (!inCall && state.isInCall) {
        state.isInCall = false;
        state.isActive = false;
        // 结算最后一段发言时间
        if (state.speakingMode && state.speakingStartTime) {
          const elapsed = (Date.now() - state.speakingStartTime) / 1000;
          state.talkTime[state.speakingMode] += elapsed;
          state.speakingMode = null;
          state.speakingStartTime = null;
        }
        hideAssistant();
        showTip('通话已结束', 'info');
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function showAssistant() {
    const container = document.getElementById('sales-coach-assistant');
    if (container) {
      container.style.display = 'block';
      container.classList.add('sc-visible');
    }
    broadcastStateUpdate();
  }

  function hideAssistant() {
    const container = document.getElementById('sales-coach-assistant');
    if (container) {
      container.classList.remove('sc-visible');
      // 不隐藏，保持可见但标记为非活跃
    }
    broadcastStateUpdate();
  }

  // ============================================================================
  // 关闭按钮
  // ============================================================================

  function initCloseButton() {
    const closeBtn = document.getElementById('sc-close');
    if (!closeBtn) return;

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const container = document.getElementById('sales-coach-assistant');
      if (container) {
        container.style.display = 'none';
      }
      // 结算发言时间
      if (state.speakingMode && state.speakingStartTime) {
        const elapsed = (Date.now() - state.speakingStartTime) / 1000;
        state.talkTime[state.speakingMode] += elapsed;
        state.speakingMode = null;
        state.speakingStartTime = null;
      }
    });
  }

  // ============================================================================
  // 初始化
  // ============================================================================

  function init() {
    const platform = detectPlatform();
    if (!platform) return;

    console.log('[SalesCoach] 销冠AI教练已加载 - 平台: ' + platform);

    // 创建UI
    createAssistantUI();
    createTipOverlay();

    // 绑定事件
    const toggleBtn = document.getElementById('sc-toggle');
    const content = document.getElementById('sc-content');

    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = content.classList.toggle('collapsed');
        toggleBtn.textContent = isCollapsed ? '▲' : '▼';
      });
    }

    // 初始化各功能模块
    initCloseButton();
    initDrag();
    initSpeakToggle();
    initNavigationObserver();

    // 开始话轮比追踪
    startTalkTimeTracking();

    // 开始定期分析对话
    startPeriodicAnalysis();

    // 定期发送状态到background
    setInterval(() => {
      broadcastStateUpdate();
    }, 5000);

    // 监听消息（从popup或sidepanel）
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_STATE') {
        sendResponse({
          state: {
            isActive: state.isActive,
            isInCall: state.isInCall,
            talkTime: state.talkTime,
            objections: state.objections,
            currentTip: state.currentTip,
            persona: state.persona,
          }
        });
      } else if (message.type === 'SHOW_TIP') {
        showTip(message.tip, message.tipType);
        sendResponse({ success: true });
      }
      return true;
    });

    // 初始状态检测
    if (isInCall()) {
      state.isInCall = true;
      state.isActive = true;
      showTip('通话进行中，AI教练已就绪', 'success');
    }
  }

  // 启动
  function safeInit() {
    try {
      init();
    } catch (err) {
      console.error('[SalesCoach] Init error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();
