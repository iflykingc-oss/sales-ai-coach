// Side panel script - receives updates from content script
const state = {
  talkTime: 0,
  talkRatio: '-',
  objections: 0,
  tips: [],
  persona: null,
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATE_UPDATE') {
    Object.assign(state, message.data);
    updateUI();
  }
  if (message.type === 'TIP_UPDATE') {
    state.tips.unshift(message.data);
    if (state.tips.length > 10) state.tips.pop();
    updateTips();
  }
});

function updateUI() {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('content').style.display = 'block';

  document.getElementById('talkTime').textContent = formatTime(state.talkTime);
  document.getElementById('talkRatio').textContent = state.talkRatio;
  document.getElementById('objectionCount').textContent = state.objections;

  if (state.persona) {
    const section = document.getElementById('personaSection');
    const info = document.getElementById('personaInfo');
    section.style.display = 'block';

    info.innerHTML = '';
    const name = document.createElement('div');
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = state.persona.name || '客户';
    name.appendChild(nameStrong);
    name.appendChild(document.createTextNode(' - ' + (state.persona.role || '')));
    info.appendChild(name);

    if (state.persona.personality) {
      const p = document.createElement('div');
      p.textContent = `性格: ${state.persona.personality}`;
      info.appendChild(p);
    }
    if (state.persona.painPoints) {
      const pp = document.createElement('div');
      pp.textContent = `痛点: ${state.persona.painPoints}`;
      info.appendChild(pp);
    }
  }
}

function updateTips() {
  const list = document.getElementById('tipsList');
  list.innerHTML = '';

  state.tips.forEach(tip => {
    const item = document.createElement('div');
    item.className = 'tip-item';

    const icon = document.createElement('span');
    icon.className = 'tip-icon';
    icon.textContent = '💡';

    const content = document.createElement('div');

    const text = document.createElement('div');
    text.className = 'tip-text';
    text.textContent = tip.text || tip;

    const time = document.createElement('div');
    time.className = 'tip-time';
    time.textContent = tip.time || '刚刚';

    content.appendChild(text);
    content.appendChild(time);
    item.appendChild(icon);
    item.appendChild(content);
    list.appendChild(item);
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
