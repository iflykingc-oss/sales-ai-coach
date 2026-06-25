// 销冠AI教练 - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  // 获取状态
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];

    // 检查是否在支持的页面
    const supportedPlatforms = ['zoom.us', 'meet.google.com', 'teams.microsoft.com'];
    const isSupported = supportedPlatforms.some(platform => tab.url.includes(platform));

    if (isSupported) {
      // 向content script获取状态
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' }, function(response) {
        if (response && response.state) {
          updateUI(response.state);
        }
      });
    } else {
      document.getElementById('statusDot').classList.add('inactive');
      document.getElementById('statusText').textContent = '请在通话页面使用';
    }
  });

  // 打开数据面板
  document.getElementById('openDashboard').addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://www.aisalecoach.work/app/analytics' });
  });

  // 开始陪练
  document.getElementById('openPractice').addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://www.aisalecoach.work/app/practice' });
  });
});

// 更新UI
function updateUI(state) {
  // 更新状态
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (state.isActive) {
    statusDot.classList.remove('inactive');
    statusText.textContent = '通话中 - AI教练已激活';
  } else {
    statusDot.classList.add('inactive');
    statusText.textContent = '等待通话开始';
  }

  // 更新话轮比
  const talkRatio = document.getElementById('talkRatio');
  if (state.talkTime.user > 0 || state.talkTime.customer > 0) {
    const total = state.talkTime.user + state.talkTime.customer;
    const userPercent = Math.round((state.talkTime.user / total) * 100);
    talkRatio.textContent = userPercent + '%';
    talkRatio.className = 'metric-value';

    if (userPercent >= 35 && userPercent <= 50) {
      talkRatio.classList.add('good');
    } else if (userPercent > 55) {
      talkRatio.classList.add('warning');
    }
  }

  // 更新异议计数
  const objectionCount = document.getElementById('objectionCount');
  objectionCount.textContent = state.objections.length;

  // 更新提示列表
  if (state.currentTip) {
    const tipsList = document.getElementById('tipsList');
    const item = document.createElement('div');
    item.className = 'tip-item';

    const icon = document.createElement('span');
    icon.className = 'tip-icon';
    icon.textContent = '💡';

    const content = document.createElement('div');

    const text = document.createElement('div');
    text.className = 'tip-text';
    text.textContent = state.currentTip;

    const time = document.createElement('div');
    time.className = 'tip-time';
    time.textContent = '刚刚';

    content.appendChild(text);
    content.appendChild(time);
    item.appendChild(icon);
    item.appendChild(content);

    tipsList.innerHTML = '';
    tipsList.appendChild(item);
  }
}
