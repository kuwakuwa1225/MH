const STORAGE_KEY = 'mh-artia-nav-v2';
const ATTRIBUTES = ['火', '水', '雷', '氷', '龍'];

let state = loadState();
let activeAttribute = ATTRIBUTES[0];

function defaultState() {
  return {
    mode: 'setup',
    startMaterial: null,
    currentCount: 0,
    results: Object.fromEntries(ATTRIBUTES.map(a => [a, {}]))
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      results: {
        ...defaultState().results,
        ...(parsed.results || {})
      }
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function show(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hide(id) {
  document.getElementById(id).classList.add('hidden');
}

function renderApp() {
  hide('setup-view');
  hide('survey-view');
  hide('play-view');

  if (state.mode === 'setup' || state.startMaterial === null) {
    state.mode = 'setup';
    show('setup-view');
    return;
  }

  if (state.mode === 'survey') {
    show('survey-view');
    document.getElementById('survey-count').textContent = state.currentCount;
    document.getElementById('current-material').value = Math.max(0, state.startMaterial - state.currentCount * 3);
    renderAttributeTabs();
    renderSurveyEditor();
    updateMaterialStatus();
    return;
  }

  show('play-view');
  renderPlayView();
}

function startSurvey() {
  const input = document.getElementById('start-material');
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 0) {
    alert('開始素材数を0以上の整数で入力してください。');
    return;
  }

  state = defaultState();
  state.mode = 'survey';
  state.startMaterial = value;
  state.currentCount = 0;
  saveState();
  renderApp();
}

function updateCountFromMaterial() {
  const input = document.getElementById('current-material');
  const current = Number(input.value);
  if (!Number.isFinite(current) || current < 0 || current > state.startMaterial) {
    document.getElementById('material-status').textContent = '開始素材数以下の値を入力してください。';
    return;
  }

  const used = state.startMaterial - current;
  const count = Math.floor(used / 3);
  state.currentCount = count;
  saveState();
  document.getElementById('survey-count').textContent = count;
  updateMaterialStatus(used);
  renderSurveyEditor();
}

function updateMaterialStatus(usedArg) {
  if (state.startMaterial === null) return;
  const current = Number(document.getElementById('current-material')?.value ?? state.startMaterial);
  const used = usedArg ?? Math.max(0, state.startMaterial - current);
  const remainder = used % 3;
  const el = document.getElementById('material-status');
  if (!el) return;
  el.textContent = remainder === 0
    ? `使用 ${used}個 / 復元 ${Math.floor(used / 3)}回`
    : `使用 ${used}個。3の倍数ではないため、現在位置は ${Math.floor(used / 3)}回目として扱います。`;
}

function renderAttributeTabs() {
  const tabs = document.getElementById('attribute-tabs');
  tabs.innerHTML = ATTRIBUTES.map(attr => `
    <button class="attribute-tab ${activeAttribute === attr ? 'active' : ''}" onclick="setActiveAttribute('${attr}')">${attr}</button>
  `).join('');
}

function setActiveAttribute(attr) {
  activeAttribute = attr;
  renderAttributeTabs();
  renderSurveyEditor();
}

function renderSurveyEditor() {
  const wrap = document.getElementById('survey-editor');
  if (!wrap) return;
  const count = state.currentCount;
  const rows = [];
  const start = Math.max(1, count - 5);
  const end = Math.max(10, count + 5);

  for (let i = start; i <= end; i++) {
    const saved = getSkills(activeAttribute, i).join(' / ');
    rows.push(`
      <div class="survey-row ${i === count ? 'current-row' : ''}">
        <div class="roll-number">${i}回目</div>
        <input
          type="text"
          value="${escapeHtml(saved)}"
          placeholder="例: 黒蝕一体 / 主砲"
          oninput="saveSkills('${activeAttribute}', ${i}, this.value)"
        >
      </div>
    `);
  }

  wrap.innerHTML = `
    <div class="editor-title"><strong>${activeAttribute}属性</strong><span>${count}回目を基準に表示</span></div>
    <div class="survey-rows">${rows.join('')}</div>
  `;
}

function parseSkills(value) {
  return value
    .split(/[\/／,，、]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function saveSkills(attr, count, value) {
  const skills = parseSkills(value);
  if (!state.results[attr]) state.results[attr] = {};
  if (skills.length) state.results[attr][count] = skills;
  else delete state.results[attr][count];
  saveState();
}

function getSkills(attr, count) {
  const value = state.results?.[attr]?.[count];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return parseSkills(value);
  return [];
}

function finishSurvey() {
  if (!hasAnyRecordedSkill()) {
    if (!confirm('まだスキル記録がありません。このまま運用モードへ進みますか？')) return;
  }
  state.mode = 'play';
  saveState();
  renderApp();
}

function returnToSurvey() {
  state.mode = 'survey';
  saveState();
  renderApp();
}

function stepPlay(delta) {
  state.currentCount = Math.max(0, state.currentCount + delta);
  saveState();
  renderPlayView();
}

function findUpcoming() {
  const found = [];

  for (const attr of ATTRIBUTES) {
    const table = state.results[attr] || {};
    const counts = Object.keys(table)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > state.currentCount && getSkills(attr, n).length)
      .sort((a, b) => a - b);

    if (counts.length) {
      const nextCount = counts[0];
      found.push({
        attr,
        count: nextCount,
        distance: nextCount - state.currentCount,
        skills: getSkills(attr, nextCount)
      });
    }
  }

  return found.sort((a, b) => a.distance - b.distance || ATTRIBUTES.indexOf(a.attr) - ATTRIBUTES.indexOf(b.attr));
}

function renderPlayView() {
  document.getElementById('play-count').textContent = state.currentCount;
  const upcoming = findUpcoming();
  const nextResult = document.getElementById('next-result');
  const list = document.getElementById('upcoming-list');

  if (!upcoming.length) {
    nextResult.innerHTML = `
      <p class="next-label">次の候補</p>
      <h2>記録済みの次候補がありません</h2>
      <p class="muted">「記録を修正」から先の結果を追加してください。</p>
    `;
    list.innerHTML = '<p class="muted empty-state">次候補なし</p>';
    return;
  }

  const first = upcoming[0];
  nextResult.innerHTML = `
    <p class="next-label">次は</p>
    <h2>${first.attr}属性</h2>
    <p class="skill-main">${first.skills.map(escapeHtml).join(' / ')}</p>
    <p class="distance">あと <strong>${first.distance}</strong> 回</p>
  `;

  list.innerHTML = upcoming.map(item => `
    <div class="upcoming-item ${item === first ? 'best' : ''}">
      <div>
        <span class="attribute-badge">${item.attr}</span>
        <strong>${item.skills.map(escapeHtml).join(' / ')}</strong>
      </div>
      <div class="distance-small">あと ${item.distance}回</div>
    </div>
  `).join('');
}

function hasAnyRecordedSkill() {
  return ATTRIBUTES.some(attr => Object.values(state.results[attr] || {}).some(v => Array.isArray(v) ? v.length : Boolean(v)));
}

function resetAllData() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    alert('削除する記録はありません。');
    return;
  }
  if (!confirm('この端末に保存されているアーティア厳選記録をすべて削除します。元には戻せません。')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  activeAttribute = ATTRIBUTES[0];
  renderApp();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

renderApp();
