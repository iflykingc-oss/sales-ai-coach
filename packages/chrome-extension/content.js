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
  };

  // ============================================================================
  // 状态管理
  // ============================================================================

  let state = {
    isActive: false,
    currentTip: null,
    talkTime: { user: 0, customer: 0 },
    objections: [],
    persona: null,
  };

  // ============================================================================
  // UI 组件
  // ============================================================================

  // 创建浮动助手容器
  function createAssistantUI() {
    const container = document.createElement('div');
    container.id = 'sales-coach-assistant';
    container.innerHTML = `
      <div class="sc-header">
        <div class="sc-logo">🎯</div>
        <div class="sc-title">AI教练</div>
        <button class="sc-toggle" id="sc-toggle">▼</button>
      </div>
      <div class="sc-content" id="sc-content">
        <div class="sc-tip" id="sc-tip">
          <div class="sc-tip-icon">💡</div>
          <div class="sc-tip-text">准备就绪，开始通话后将提供实时建议</div>
        </div>
        <div class="sc-metrics" id="sc-metrics">
          <div class="sc-metric">
            <span class="sc-metric-label">发言比例</span>
            <span class="sc-metric-value" id="sc-talk-ratio">-</span>
          </div>
          <div class="sc-metric">
            <span class="sc-metric-label">异议次数</span>
            <span class="sc-metric-value" id="sc-objections">0</span>
          </div>
        </div>
        <div class="sc-persona" id="sc-persona" style="display:none">
          <div class="sc-persona-title">👤 客户画像</div>
          <div class="sc-persona-info" id="sc-persona-info"></div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    return container;
  }

  // 创建提示浮窗
  function createTipOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sc-tip-overlay';
    overlay.innerHTML = `
      <div class="sc-tip-overlay-content">
        <div class="sc-tip-overlay-icon">💡</div>
        <div class="sc-tip-overlay-text" id="sc-tip-overlay-text"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // ============================================================================
  // 核心功能
  // ============================================================================

  // 检测通话平台
  function detectPlatform() {
    const url = window.location.href;
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('meet.google.com')) return 'google-meet';
    if (url.includes('teams.microsoft.com')) return 'teams';
    return null;
  }

  // 检测是否在通话中
  function isInCall() {
    const platform = detectPlatform();
    if (platform === 'zoom') {
      return document.querySelector('[class*="meeting"]');
    }
    if (platform === 'google-meet') {
      return document.querySelector('[data-allocation-index]');
    }
    if (platform === 'teams') {
      return document.querySelector('[data-tid="calling-screen"]');
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
      tipElement.className = `sc-tip sc-tip-${type}`;
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
  }

  // 更新话轮比
  function updateTalkRatio() {
    const total = state.talkTime.user + state.talkTime.customer;
    if (total === 0) return;

    const userPercent = Math.round((state.talkTime.user / total) * 100);
    const ratioElement = document.getElementById('sc-talk-ratio');

    if (ratioElement) {
      ratioElement.textContent = `${userPercent}%`;
      ratioElement.className = 'sc-metric-value';

      if (userPercent >= 35 && userPercent <= 50) {
        ratioElement.classList.add('sc-good');
      } else if (userPercent > 55) {
        ratioElement.classList.add('sc-warning');
      } else if (userPercent < 30) {
        ratioElement.classList.add('sc-info');
      }
    }
  }

  // 更新异议计数
  function updateObjections() {
    const objectionsElement = document.getElementById('sc-objections');
    if (objectionsElement) {
      objectionsElement.textContent = state.objections.length;
    }
  }

  // 显示客户画像
  function showPersona(persona) {
    const personaElement = document.getElementById('sc-persona');
    const personaInfo = document.getElementById('sc-persona-info');

    if (personaElement && personaInfo && persona) {
      const name = document.createElement('div');
      name.innerHTML = `<strong>${persona.name || '客户'}</strong> - ${persona.role || ''}`;

      const personalityDiv = document.createElement('div');
      personalityDiv.textContent = `性格: ${persona.personality || persona.traits || '未知'}`;

      const painDiv = document.createElement('div');
      painDiv.textContent = `痛点: ${persona.painPoints || persona.pain_points || '未知'}`;

      personaInfo.innerHTML = '';
      personaInfo.appendChild(name);
      personaInfo.appendChild(personalityDiv);
      personaInfo.appendChild(painDiv);
      personaElement.style.display = 'block';
    }
  }

  // ============================================================================
  // 模拟AI分析（实际应调用后端API）
  // ============================================================================

  // 分析对话内容
  function analyzeConversation(transcript) {
    // 检测异议关键词
    const objectionKeywords = ['价格', '太贵', '预算', '考虑', '对比', '不需要', '再看看'];
    const hasObjection = objectionKeywords.some(keyword => transcript.includes(keyword));

    if (hasObjection) {
      state.objections.push({ time: Date.now(), text: transcript });
      updateObjections();

      // 提供异议处理建议
      const tips = [
        '客户提到价格异议，建议强调价值而非价格',
        '客户在对比竞品，准备差异化话术',
        '客户表示需要考虑，尝试了解具体顾虑',
      ];
      showTip(tips[Math.floor(Math.random() * tips.length)], 'objection');
    }

    // 检测购买信号
    const buyingSignals = ['什么时候', '怎么合作', '下一步', '签约', '付款'];
    const hasBuyingSignal = buyingSignals.some(signal => transcript.includes(signal));

    if (hasBuyingSignal) {
      showTip('检测到购买信号！建议立即推进成交', 'closing');
    }
  }

  // 模拟话轮比追踪
  function startTalkTimeTracking() {
    // 这里应该使用语音识别API来追踪发言
    // 简化版本：随机模拟
    setInterval(() => {
      if (isInCall()) {
        // 模拟发言时间累计
        state.talkTime.user += Math.random() * 2;
        state.talkTime.customer += Math.random() * 2;
        updateTalkRatio();
      }
    }, 1000);
  }

  // ============================================================================
  // 初始化
  // ============================================================================

  function init() {
    const platform = detectPlatform();
    if (!platform) return;

    console.log(`销冠AI教练已加载 - 平台: ${platform}`);

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

    // 开始话轮比追踪
    startTalkTimeTracking();

    // 定期检查通话状态
    setInterval(() => {
      if (isInCall() && !state.isActive) {
        state.isActive = true;
        showTip('通话已开始，AI教练已就绪', 'success');
      } else if (!isInCall() && state.isActive) {
        state.isActive = false;
        showTip('通话已结束', 'info');
      }
    }, CONFIG.CHECK_INTERVAL);

    // 监听消息（从popup或sidepanel）
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_STATE') {
        sendResponse({ state });
      } else if (message.type === 'SHOW_TIP') {
        showTip(message.tip, message.tipType);
        sendResponse({ success: true });
      }
    });
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
