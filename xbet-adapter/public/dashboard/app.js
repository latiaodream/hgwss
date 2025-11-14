const DATASETS = ['matches', 'odds', 'live'];
const ID_FIELDS = ['id', 'gid', 'matchId', 'mid', 'eventId', 'gameId', 'fixtureId', 'oid', 'uuid', 'key', 'code'];
const TEAM_FIELDS = {
  home: [
    'home',
    'homeTeam',
    'home_name',
    'homeName',
    'teamHome',
    'teamA',
    'participants.0',
    'teams.0',
    'competitors.0',
    'players.0',
    'sides.home',
    'contestants.0',
  ],
  away: [
    'away',
    'awayTeam',
    'away_name',
    'awayName',
    'teamAway',
    'teamB',
    'participants.1',
    'teams.1',
    'competitors.1',
    'players.1',
    'sides.away',
    'contestants.1',
  ],
};

const storeMaps = DATASETS.reduce((acc, kind) => {
  acc[kind] = new Map();
  return acc;
}, {});

const state = {
  filterText: '',
  liveOnly: false,
  visibleKinds: new Set(DATASETS),
  counts: {
    matches: 0,
    odds: 0,
    live: 0,
  },
  lastUpdateTs: null,
  connection: 'disconnected',
};

let eventSource = null;

document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  Promise.all([loadMeta(), fetchSnapshot()]).finally(() => initEventStream());
});

function bindUI() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (evt) => {
    state.filterText = evt.target.value.trim().toLowerCase();
    renderAll();
  });

  document.getElementById('liveOnly').addEventListener('change', (evt) => {
    state.liveOnly = evt.target.checked;
    renderMatches();
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await fetchSnapshot();
  });

  document.getElementById('datasetToggles').addEventListener('change', (evt) => {
    if (evt.target.matches('input[type="checkbox"][data-kind]')) {
      const kind = evt.target.dataset.kind;
      if (evt.target.checked) {
        state.visibleKinds.add(kind);
      } else {
        state.visibleKinds.delete(kind);
      }
      renderAll();
    }
  });
}

async function loadMeta() {
  try {
    const res = await fetch('/api/meta');
    if (!res.ok) throw new Error(`meta status ${res.status}`);
    const meta = await res.json();
    if (meta?.title) {
      document.getElementById('appTitle').textContent = meta.title;
      document.title = `${meta.title} · 智投监控`;
    }
    updateCounts(meta?.counts || {});
    updateLastUpdate(meta?.lastUpdateTs);
  } catch (err) {
    console.warn('加载 meta 失败', err);
  }
}

async function fetchSnapshot() {
  try {
    const res = await fetch('/api/snapshot');
    if (!res.ok) throw new Error(`snapshot status ${res.status}`);
    const data = await res.json();
    applySnapshot(data);
    updateConnection('connected');
  } catch (err) {
    console.warn('请求快照失败', err);
  }
}

function initEventStream() {
  if (eventSource) {
    eventSource.close();
  }
  eventSource = new EventSource('/api/events');
  eventSource.addEventListener('open', () => updateConnection('connected'));
  eventSource.addEventListener('error', () => updateConnection('disconnected'));
  eventSource.addEventListener('snapshot', (evt) => {
    const payload = safeParse(evt.data);
    if (payload) {
      applySnapshot(payload);
    }
  });
  eventSource.addEventListener('update', (evt) => {
    const payload = safeParse(evt.data);
    if (payload?.kind) {
      applyUpdate(payload.kind, payload.payload);
    }
  });
  eventSource.addEventListener('ping', (evt) => {
    const payload = safeParse(evt.data);
    if (payload?.ts) {
      updateConnection('connected', payload.ts);
    }
  });
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function applySnapshot(snapshot = {}) {
  for (const kind of DATASETS) {
    const map = storeMaps[kind];
    map.clear();
    const list = Array.isArray(snapshot[kind]) ? snapshot[kind] : [];
    for (const item of list) {
      const key = buildEntityKey(kind, item);
      map.set(key, item);
    }
    state.counts[kind] = map.size;
  }
  if (snapshot.counts) {
    updateCounts(snapshot.counts);
  } else {
    updateCounts(state.counts);
  }
  state.lastUpdateTs = snapshot.lastUpdateTs || Date.now();
  updateLastUpdate(state.lastUpdateTs);
  renderAll();
}

function applyUpdate(kind, data) {
  const map = storeMaps[kind];
  if (!map || !data) return;
  const list = Array.isArray(data) ? data : [data];
  for (const item of list) {
    const key = buildEntityKey(kind, item);
    map.set(key, item);
  }
  state.counts[kind] = map.size;
  state.lastUpdateTs = Date.now();
  updateCounts(state.counts);
  updateLastUpdate(state.lastUpdateTs);
  switch (kind) {
    case 'matches':
      renderMatches();
      break;
    case 'odds':
      renderOdds();
      break;
    case 'live':
      renderLive();
      break;
    default:
      renderAll();
  }
}

function renderAll() {
  renderStats();
  renderMatches();
  renderOdds();
  renderLive();
}

function renderStats() {
  document.getElementById('statMatches').textContent = state.counts.matches ?? 0;
  document.getElementById('statOdds').textContent = state.counts.odds ?? 0;
  document.getElementById('statLive').textContent = state.counts.live ?? 0;
}

function renderMatches() {
  const section = document.querySelector('.dataset[data-kind="matches"]');
  const visible = state.visibleKinds.has('matches');
  section.classList.toggle('hidden', !visible);
  if (!visible) return;
  const container = document.getElementById('matchesContainer');
  container.innerHTML = '';
  const list = filterList([...storeMaps.matches.values()], 'matches')
    .sort((a, b) => (parseTimestamp(extractStartTime(a)) || 0) - (parseTimestamp(extractStartTime(b)) || 0));
  document.getElementById('matchesCount').textContent = `${list.length} 条`;
  if (!list.length) {
    appendEmpty(container);
    return;
  }
  list.slice(0, 120).forEach((match) => container.appendChild(createMatchCard(match)));
}

function renderOdds() {
  const section = document.querySelector('.dataset[data-kind="odds"]');
  const visible = state.visibleKinds.has('odds');
  section.classList.toggle('hidden', !visible);
  if (!visible) return;
  const container = document.getElementById('oddsContainer');
  container.innerHTML = '';
  const list = filterList([...storeMaps.odds.values()], 'odds')
    .sort((a, b) => (parseTimestamp(pickValue(a, ['ts', 'timestamp', 'updatedAt'])) || 0) - (parseTimestamp(pickValue(b, ['ts', 'timestamp', 'updatedAt'])) || 0));
  document.getElementById('oddsCount').textContent = `${list.length} 条`;
  if (!list.length) {
    appendEmpty(container);
    return;
  }
  list.slice(0, 150).forEach((odd) => container.appendChild(createOddsCard(odd)));
}

function renderLive() {
  const section = document.querySelector('.dataset[data-kind="live"]');
  const visible = state.visibleKinds.has('live');
  section.classList.toggle('hidden', !visible);
  if (!visible) return;
  const container = document.getElementById('liveContainer');
  container.innerHTML = '';
  const list = filterList([...storeMaps.live.values()], 'live')
    .sort((a, b) => (parseTimestamp(pickValue(b, ['ts', 'timestamp'])) || 0) - (parseTimestamp(pickValue(a, ['ts', 'timestamp'])) || 0));
  document.getElementById('liveCount').textContent = `${list.length} 条`;
  if (!list.length) {
    appendEmpty(container);
    return;
  }
  list.slice(0, 120).forEach((item) => container.appendChild(createLiveCard(item)));
}

function appendEmpty(container) {
  const tpl = document.getElementById('noDataTemplate');
  container.appendChild(tpl.content.cloneNode(true));
}

function createMatchCard(match) {
  const card = document.createElement('article');
  card.className = 'match-card';
  const league = extractLeague(match);
  const sport = pickValue(match, ['sport', 'sportName', 'gameType', 'category']);
  const start = extractStartTime(match);
  const kickoff = formatDate(start);
  const statusText = extractStatus(match);
  const statusClass = isLive(match) ? 'badge badge--success' : statusText ? 'badge badge--warn' : 'badge';
  const teams = extractTeams(match);
  const score = extractScore(match);
  card.innerHTML = `
    <div class="match-card__top">
      <strong>${league || '未分类'}${sport ? ` · ${sport}` : ''}</strong>
      <span>${kickoff || '--'}</span>
      <span class="${statusClass}">${statusText || (isLive(match) ? '进行中' : '待开赛')}</span>
    </div>
    <div class="match-card__teams">
      <span>${teams.home || '主队'}</span>
      <span>${score || 'VS'}</span>
      <span>${teams.away || '客队'}</span>
    </div>
    <div class="match-card__meta">
      <span>ID: ${getEntityId(match) ?? '--'}</span>
      <span>轮次: ${pickValue(match, ['round', 'period', 'stage']) ?? '--'}</span>
      <span>更新时间: ${formatDate(pickValue(match, ['ts', 'timestamp', 'updatedAt'])) || '--'}</span>
    </div>
  `;
  const preview = document.createElement('div');
  preview.className = 'odds-preview';
  const chips = extractChips(match);
  if (chips.length) {
    chips.forEach((chip) => {
      const chipEl = document.createElement('div');
      chipEl.className = 'odd-chip';
      chipEl.textContent = `${chip.label}: ${chip.value}`;
      preview.appendChild(chipEl);
    });
    card.appendChild(preview);
  }
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'JSON 数据';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(match, null, 2);
  details.append(summary, pre);
  card.appendChild(details);
  return card;
}

function createOddsCard(item) {
  const card = document.createElement('article');
  card.className = 'odds-card';
  const market = pickValue(item, ['market', 'marketName', 'rtype', 'play', 'betType']);
  const selection = pickValue(item, ['selection', 'team', 'pick', 'option', 'choice', 'side']);
  const price = pickValue(item, ['odd', 'odds', 'price', 'value', 'payout']);
  const handicap = pickValue(item, ['handicap', 'line', 'spread']);
  const ts = formatDate(pickValue(item, ['ts', 'timestamp', 'updatedAt']));
  const matchId = pickValue(item, ['matchId', 'gid', 'gameId']);
  card.innerHTML = `
    <div class="match-card__top">
      <strong>${market || '未命名市场'}</strong>
      <span>${selection || '--'}</span>
      <span class="badge badge--warn">${ts || '--'}</span>
    </div>
    <div class="match-card__meta">
      <span>赔率: ${price ?? '--'}</span>
      <span>盘口: ${handicap ?? '--'}</span>
      <span>关联赛事: ${matchId ?? '--'}</span>
    </div>
  `;
  const preview = document.createElement('div');
  preview.className = 'odds-preview';
  extractChips(item).forEach((chip) => {
    const chipEl = document.createElement('div');
    chipEl.className = 'odd-chip';
    chipEl.textContent = `${chip.label}: ${chip.value}`;
    preview.appendChild(chipEl);
  });
  if (preview.childElementCount) {
    card.appendChild(preview);
  }
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'JSON 数据';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(item, null, 2);
  details.append(summary, pre);
  card.appendChild(details);
  return card;
}

function createLiveCard(item) {
  const card = document.createElement('article');
  card.className = 'live-card';
  const teams = extractTeams(item);
  const score = extractScore(item);
  const clock = pickValue(item, ['timer', 'clock', 'time', 'matchTime', 'currentTime']);
  const ts = formatDate(pickValue(item, ['ts', 'timestamp']));
  card.innerHTML = `
    <div class="match-card__top">
      <strong>${extractLeague(item) || '滚球'}</strong>
      <span>${ts || '--'}</span>
    </div>
    <div class="match-card__teams">
      <span>${teams.home || '主队'}</span>
      <span class="live-card__score">${score || '--'}</span>
      <span>${teams.away || '客队'}</span>
    </div>
    <div class="match-card__meta">
      <span class="live-card__status">时间：${clock ?? '--'}</span>
      <span>状态：${extractStatus(item) || '进行中'}</span>
      <span>ID: ${getEntityId(item) ?? '--'}</span>
    </div>
  `;
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'JSON 数据';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(item, null, 2);
  details.append(summary, pre);
  card.appendChild(details);
  return card;
}

function filterList(list, kind) {
  let filtered = list;
  if (state.filterText) {
    filtered = filtered.filter((item) => {
      try {
        return JSON.stringify(item).toLowerCase().includes(state.filterText);
      } catch {
        return false;
      }
    });
  }
  if (state.liveOnly && kind === 'matches') {
    filtered = filtered.filter((item) => isLive(item));
  }
  return filtered;
}

function extractTeams(entity) {
  const homeRaw = pickValue(entity, TEAM_FIELDS.home);
  const awayRaw = pickValue(entity, TEAM_FIELDS.away);
  return {
    home: formatName(homeRaw),
    away: formatName(awayRaw),
  };
}

function extractLeague(entity) {
  return formatName(pickValue(entity, ['league', 'leagueName', 'competition', 'tournament', 'cup', 'group', 'categoryName']));
}

function extractStartTime(entity) {
  return pickValue(entity, ['startTime', 'start_ts', 'startTs', 'kickoff', 'matchTime', 'time', 'datetime']);
}

function extractStatus(entity) {
  return formatName(pickValue(entity, ['status', 'state', 'matchStatus', 'phase', 'liveStatus']));
}

function extractScore(entity) {
  const home = pickValue(entity, ['score.home', 'scoreHome', 'homeScore', 'result.home', 'liveScore.home', 'scoreboard.home', 'score.0']);
  const away = pickValue(entity, ['score.away', 'scoreAway', 'awayScore', 'result.away', 'liveScore.away', 'scoreboard.away', 'score.1']);
  if (home !== undefined || away !== undefined) {
    return `${home ?? 0} - ${away ?? 0}`;
  }
  const raw = pickValue(entity, ['score', 'result', 'liveScore', 'currentScore']);
  if (raw && typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'object' && raw !== null) {
    return `${raw.home ?? raw.h ?? raw[0] ?? '-'} - ${raw.away ?? raw.a ?? raw[1] ?? '-'}`;
  }
  return '';
}

function extractChips(entity) {
  const sources = [entity.odds, entity.markets, entity.lines, entity.prices, entity.metrics];
  for (const source of sources) {
    const chips = collectNumericPairs(source);
    if (chips.length) return chips;
  }
  return collectNumericPairs(entity, 4);
}

function collectNumericPairs(input, limit = 6, prefix = '', depth = 0) {
  const chips = [];
  if (!input || typeof input !== 'object' || depth > 3) return chips;
  const skipKeys = new Set([...ID_FIELDS, 'ts', 'timestamp', 'updatedAt', 'matchId', 'gid', 'time', 'score', 'state']);
  for (const [key, value] of Object.entries(input)) {
    if (chips.length >= limit) break;
    if (skipKeys.has(key)) continue;
    const label = prefix ? `${prefix}${key}` : key;
    if (typeof value === 'number' && Number.isFinite(value)) {
      chips.push({ label, value: Number(value.toFixed(3)) });
      continue;
    }
    if (typeof value === 'string' && value.trim() && value.length <= 12 && /\d/.test(value)) {
      chips.push({ label, value });
      continue;
    }
    if (typeof value === 'object') {
      collectNumericPairs(value, limit - chips.length, `${label}.`, depth + 1).forEach((child) => chips.push(child));
    }
  }
  return chips;
}

function updateConnection(status, ts) {
  state.connection = status;
  const badge = document.getElementById('connectionState');
  badge.textContent = status === 'connected' ? '已连接' : '未连接';
  badge.classList.toggle('badge--success', status === 'connected');
  badge.classList.toggle('badge--danger', status !== 'connected');
  if (ts) {
    updateLastUpdate(ts);
  }
}

function updateLastUpdate(ts) {
  if (!ts) return;
  const text = formatDate(ts, true);
  document.getElementById('lastUpdate').textContent = text || '--';
}

function updateCounts(counts) {
  DATASETS.forEach((kind) => {
    state.counts[kind] = counts?.[kind] ?? state.counts[kind] ?? 0;
  });
  renderStats();
}

function buildEntityKey(kind, item) {
  const id = getEntityId(item);
  if (id !== undefined && id !== null && id !== '') {
    return String(id);
  }
  const ts = pickValue(item, ['ts', 'timestamp']) || Date.now();
  return `${kind}-${ts}-${Math.random().toString(36).slice(2, 7)}`;
}

function getEntityId(item) {
  if (!item || typeof item !== 'object') return undefined;
  for (const field of ID_FIELDS) {
    const value = pickValue(item, [field]);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function pickValue(obj, paths) {
  if (!obj) return undefined;
  for (const path of paths) {
    const value = getByPath(obj, path);
    if (value === undefined || value === null || value === '') continue;
    return value;
  }
  return undefined;
}

function getByPath(obj, path) {
  const segments = path.split('.');
  let current = obj;
  for (const segment of segments) {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (Number.isNaN(idx)) return undefined;
      current = current[idx];
    } else {
      current = current[segment];
    }
  }
  return current;
}

function formatName(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value.name || value.title || value.display || value.code || '';
  }
  return '';
}

function parseTimestamp(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric > 1e12 ? numeric : numeric * 1000;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function formatDate(value, includeSeconds = false) {
  const ts = parseTimestamp(value);
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (num) => String(num).padStart(2, '0');
  const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${includeSeconds ? `:${pad(d.getSeconds())}` : ''}`;
  return `${date} ${time}`;
}

function isLive(entity) {
  if (!entity || typeof entity !== 'object') return false;
  if (entity.isLive || entity.live === true) return true;
  const statusText = (extractStatus(entity) || '').toLowerCase();
  const keywords = ['live', 'running', 'playing', '滚球', '进行', 'inplay'];
  if (keywords.some((word) => statusText.includes(word))) return true;
  const timer = pickValue(entity, ['timer', 'clock', 'time', 'matchTime']);
  return typeof timer === 'number' && timer > 0;
}
