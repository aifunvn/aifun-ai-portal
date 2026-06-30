import { workspaceStore } from '../stores/workspace-store.js';
import { userStore } from '../stores/user-store.js';
import {
  getWorkspaceInfo, getKpis, getRecentDocumentsData, getActivityFeed,
  getInstalledBuildersData, getTokensByDayData, getAiUsageStats,
} from '../services/dashboard-service.js';
import { render as kpiCard } from '../components/kpi-card.js';
import { render as recentDocs } from '../components/recent-documents.js';
import { render as installedBuilders } from '../components/installed-builders.js';
import { render as activityTimeline } from '../components/activity-timeline.js';
import { render as quickActions, init as initQA } from '../components/quick-actions.js';
import { render as usageChart } from '../components/usage-chart.js';

let _unsub = null;

// Bumped on every loadAndRender() call (init + each workspace switch).
// Widget loaders capture the generation active when they started and skip
// revealing their result if a newer load pass has since begun — prevents a
// slow/stale fetch from one pass overwriting fresher content from the next.
let _gen = 0;

// ── Skeleton placeholders — shown instantly on mount, before any data fetch ──
function _skelLines(n) {
  return Array.from({ length: n }, () => '<div class="skel skel-line"></div>').join('');
}

function _skelKpis() {
  return Array.from({ length: 4 }, () => `
    <div class="kpi-card kpi-card--skel">
      <div class="skel skel-icon"></div>
      <div class="kpi-body">
        <div class="skel skel-value"></div>
        <div class="skel skel-label"></div>
      </div>
    </div>
  `).join('');
}

function _skelGrid(n) {
  return `<div class="builders-grid">${Array.from({ length: n }, () => '<div class="skel skel-card"></div>').join('')}</div>`;
}

function _skelChart() {
  return '<div class="skel skel-chart"></div>';
}

function _sectionHeader(title, linkLabel, navTo) {
  const link = linkLabel ? `<button class="section-link" data-nav-to="${navTo}">${linkLabel}</button>` : '';
  return `<div class="section-header"><span class="section-title">${title}</span>${link}</div>`;
}

function _renderAiStats(stats) {
  if (!stats) {
    return `
      <div class="section-header">
        <span class="section-title">AI Usage — tháng này</span>
        <button class="section-link" data-nav-to="/history">Xem lịch sử</button>
      </div>
      <p class="dash-empty-note">Chưa có dữ liệu. Tạo tài liệu đầu tiên để xem thống kê.</p>
    `;
  }
  const fmtCost = (v) => v < 0.001 ? '$0.00' : `$${v.toFixed(3)}`;
  const fmtTk   = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

  const topB = stats.topBuilders?.length
    ? stats.topBuilders.map((b) =>
        `<div class="ai-stat-row"><span>${b.name}</span><span class="ai-stat-count">${b.count} lần</span></div>`
      ).join('')
    : '<p class="dash-empty-note">Chưa có dữ liệu</p>';

  const topP = stats.topProviders?.length
    ? stats.topProviders.map((p) =>
        `<div class="ai-stat-row"><span>${p.name}</span><span class="ai-stat-count">${p.count} lần</span></div>`
      ).join('')
    : '<p class="dash-empty-note">Chưa có dữ liệu</p>';

  return `
    <div class="section-header">
      <span class="section-title">AI Usage — tháng này</span>
      <button class="section-link" data-nav-to="/history">Xem lịch sử</button>
    </div>
    <div class="ai-stats-grid">
      <div class="ai-stat-card">
        <div class="ai-stat-value">${stats.monthCount ?? 0}</div>
        <div class="ai-stat-label">Tổng yêu cầu</div>
      </div>
      <div class="ai-stat-card">
        <div class="ai-stat-value">${fmtTk(stats.monthTokens ?? 0)}</div>
        <div class="ai-stat-label">Tổng tokens</div>
      </div>
      <div class="ai-stat-card">
        <div class="ai-stat-value">${fmtCost(stats.todayCost ?? 0)}</div>
        <div class="ai-stat-label">Chi phí hôm nay</div>
      </div>
      <div class="ai-stat-card ${(stats.failedCount ?? 0) > 0 ? 'ai-stat-card--warn' : ''}">
        <div class="ai-stat-value">${stats.failedCount ?? 0}</div>
        <div class="ai-stat-label">Yêu cầu thất bại</div>
      </div>
      <div class="ai-stat-card ai-stat-card--wide">
        <div class="ai-stat-label ai-stat-label--header">Top Builders</div>
        ${topB}
      </div>
      <div class="ai-stat-card ai-stat-card--wide">
        <div class="ai-stat-label ai-stat-label--header">Top Providers</div>
        ${topP}
      </div>
    </div>
  `;
}

export function render() {
  // Every section ships its own skeleton placeholder so the page paints
  // a full layout instantly on mount instead of empty white boxes —
  // content swaps in progressively as each piece becomes ready.
  return `
    <div id="dash-content" class="dash-page">
      <div id="dash-welcome"  class="dash-welcome">
        <div class="skel skel-greeting"></div>
        <div class="skel skel-subtitle"></div>
      </div>
      <div id="dash-qa"       class="dash-section"></div>
      <div id="dash-kpis"     class="kpi-grid">${_skelKpis()}</div>
      <div class="dash-grid">
        <div id="dash-docs"     class="dash-card">${_sectionHeader('Tài liệu gần đây')}<div class="rdoc-list">${_skelLines(4)}</div></div>
        <div id="dash-activity" class="dash-card">${_sectionHeader('Hoạt động')}<div class="activity-list">${_skelLines(4)}</div></div>
      </div>
      <div id="dash-chart"    class="dash-card">${_sectionHeader('Tokens sử dụng 7 ngày qua')}${_skelChart()}</div>
      <div id="dash-builders" class="dash-card">${_sectionHeader('AI Builders đã cài')}${_skelGrid(3)}</div>
      <div id="dash-ai-stats" class="dash-card">${_sectionHeader('AI Usage — tháng này')}${_skelGrid(4)}</div>
    </div>
  `;
}

const $ = (id) => document.getElementById(id);

// Swap skeleton → real content with a fade so each widget visibly settles
// in as its data becomes ready, instead of popping in abruptly.
function _reveal(el, html) {
  if (!el) return;
  el.innerHTML = html;
  el.classList.remove('dash-fade-in');
  // Force reflow so the animation restarts even if the class was just removed.
  void el.offsetWidth;
  el.classList.add('dash-fade-in');
}

function _wireNav(scope) {
  if (!scope) return;
  scope.querySelectorAll('[data-nav-to]').forEach((btn) => {
    btn.addEventListener('click', () => { window.location.hash = btn.dataset.navTo; });
  });
}

function _errorNote(label) {
  return `<p class="dash-empty-note">Không thể tải ${label} lúc này.</p>`;
}

// Reveal + wire nav links inside the just-revealed scope in one step.
function _revealAndWire(el, html) {
  _reveal(el, html);
  _wireNav(el);
}

// Every widget below fetches and renders independently. Each is wrapped in
// its own try/catch so a single failing query (network, RLS, missing table)
// shows an inline error note for that widget only — it never blocks or
// delays any other widget on the page.

async function _loadWelcome(workspace, gen) {
  const el = $('dash-welcome');
  const profile   = userStore.getProfile();
  const firstName = profile?.fullName?.split(' ').pop() ?? 'bạn';
  const hour      = new Date().getHours();
  const session   = hour < 12 ? 'sáng' : hour < 18 ? 'chiều' : 'tối';
  try {
    const { plan, remainingRequests } = await getWorkspaceInfo(workspace);
    if (gen !== _gen) return;
    const remainingText = remainingRequests === null
      ? ''
      : ` &middot; ${remainingRequests} AI requests còn lại hôm nay`;
    _reveal(el, `
      <h2 class="dash-greeting">Chào buổi ${session}, ${firstName}!</h2>
      <p class="dash-subtitle">${workspace?.name ?? 'Workspace'} &middot; Gói ${plan}${remainingText}</p>
    `);
  } catch {
    if (gen !== _gen) return;
    _reveal(el, `
      <h2 class="dash-greeting">Chào buổi ${session}, ${firstName}!</h2>
      <p class="dash-subtitle">${workspace?.name ?? 'Workspace'}</p>
    `);
  }
}

async function _loadKpis(workspaceId, gen) {
  const el = $('dash-kpis');
  try {
    const kpis = await getKpis(workspaceId);
    if (gen !== _gen) return;
    _reveal(el, kpis.map(kpiCard).join(''));
  } catch {
    if (gen !== _gen) return;
    _reveal(el, _errorNote('chỉ số'));
  }
}

async function _loadDocs(workspaceId, gen) {
  const el = $('dash-docs');
  try {
    const docs = await getRecentDocumentsData(workspaceId);
    if (gen !== _gen) return;
    _revealAndWire(el, `
      ${_sectionHeader('Tài liệu gần đây', 'Xem tất cả', '/documents')}
      ${recentDocs(docs)}
    `);
  } catch {
    if (gen !== _gen) return;
    _revealAndWire(el, `${_sectionHeader('Tài liệu gần đây', 'Xem tất cả', '/documents')}${_errorNote('tài liệu')}`);
  }
}

async function _loadActivity(workspaceId, gen) {
  const el = $('dash-activity');
  try {
    const log = await getActivityFeed(workspaceId);
    if (gen !== _gen) return;
    _reveal(el, `${_sectionHeader('Hoạt động')}${activityTimeline(log)}`);
  } catch {
    if (gen !== _gen) return;
    _reveal(el, `${_sectionHeader('Hoạt động')}${_errorNote('hoạt động')}`);
  }
}

async function _loadChart(workspaceId, gen) {
  const el = $('dash-chart');
  try {
    const days = await getTokensByDayData(workspaceId);
    if (gen !== _gen) return;
    _reveal(el, `${_sectionHeader('Tokens sử dụng 7 ngày qua')}${usageChart(days)}`);
  } catch {
    if (gen !== _gen) return;
    _reveal(el, `${_sectionHeader('Tokens sử dụng 7 ngày qua')}${_errorNote('biểu đồ')}`);
  }
}

async function _loadBuilders(workspaceId, gen) {
  const el = $('dash-builders');
  try {
    const builders = await getInstalledBuildersData(workspaceId);
    if (gen !== _gen) return;
    _revealAndWire(el, `
      ${_sectionHeader('AI Builders đã cài', 'Khám phá thêm', '/marketplace')}
      <div class="builders-grid">${installedBuilders(builders)}</div>
    `);
  } catch {
    if (gen !== _gen) return;
    _revealAndWire(el, `${_sectionHeader('AI Builders đã cài', 'Khám phá thêm', '/marketplace')}${_errorNote('builders')}`);
  }
}

async function _loadAiStats(workspaceId, gen) {
  const el = $('dash-ai-stats');
  try {
    const stats = await getAiUsageStats(workspaceId);
    if (gen !== _gen) return;
    _revealAndWire(el, _renderAiStats(stats));
  } catch {
    if (gen !== _gen) return;
    _revealAndWire(el, `${_sectionHeader('AI Usage — tháng này', 'Xem lịch sử', '/history')}${_errorNote('thống kê AI')}`);
  }
}

function loadAndRender(workspace) {
  if (!document.getElementById('dash-content')) return;

  // New generation — any in-flight loaders from a previous pass (e.g. the
  // subscribe() firing immediately with no workspace yet, then again with
  // the real one) will see their result is stale and skip rendering it.
  const gen = ++_gen;

  // Quick Actions need no remote data — paint immediately, no skeleton wait.
  const qa = $('dash-qa');
  if (qa) { qa.innerHTML = quickActions(); initQA(); }

  const workspaceId = workspace?.id;

  // Every widget fetches independently — none awaits another, so one slow
  // or failing query never delays or blocks the rest of the page.
  _loadWelcome(workspace, gen);
  _loadKpis(workspaceId, gen);
  _loadDocs(workspaceId, gen);
  _loadActivity(workspaceId, gen);
  _loadChart(workspaceId, gen);
  _loadBuilders(workspaceId, gen);
  _loadAiStats(workspaceId, gen);
}

export function init() {
  if (_unsub) _unsub();
  // subscribe fires immediately — handles both initial render and workspace switch
  _unsub = workspaceStore.subscribe(({ workspace }) => { loadAndRender(workspace); });
}
