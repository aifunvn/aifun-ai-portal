import { workspaceStore } from '../stores/workspace-store.js';
import { userStore } from '../stores/user-store.js';
import { getDashboardData } from '../services/dashboard-service.js';
import { render as kpiCard } from '../components/kpi-card.js';
import { render as recentDocs } from '../components/recent-documents.js';
import { render as installedBuilders } from '../components/installed-builders.js';
import { render as activityTimeline } from '../components/activity-timeline.js';
import { render as quickActions, init as initQA } from '../components/quick-actions.js';
import { render as usageChart } from '../components/usage-chart.js';

let _unsub = null;

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
  return `
    <div id="dash-content" class="dash-page">
      <div id="dash-welcome"  class="dash-welcome"></div>
      <div id="dash-qa"       class="dash-section"></div>
      <div id="dash-kpis"     class="kpi-grid"></div>
      <div class="dash-grid">
        <div id="dash-docs"     class="dash-card"></div>
        <div id="dash-activity" class="dash-card"></div>
      </div>
      <div id="dash-chart"    class="dash-card"></div>
      <div id="dash-builders" class="dash-card"></div>
      <div id="dash-ai-stats" class="dash-card"></div>
    </div>
  `;
}

async function loadAndRender(workspace) {
  if (!document.getElementById('dash-content')) return;

  const profile   = userStore.getProfile();
  const firstName = profile?.fullName?.split(' ').pop() ?? 'bạn';
  const hour      = new Date().getHours();
  const session   = hour < 12 ? 'sáng' : hour < 18 ? 'chiều' : 'tối';
  const data      = await getDashboardData(workspace?.id);

  const $ = (id) => document.getElementById(id);

  const welcome = $('dash-welcome');
  if (welcome) welcome.innerHTML = `
    <h2 class="dash-greeting">Chào buổi ${session}, ${firstName}!</h2>
    <p class="dash-subtitle">
      ${workspace?.name ?? 'Workspace'} &middot; Gói ${data.plan}
      &middot; ${data.remainingRequests} AI requests còn lại tháng này
    </p>
  `;

  const qa = $('dash-qa');
  if (qa) { qa.innerHTML = quickActions(); initQA(); }

  const kpis = $('dash-kpis');
  if (kpis) kpis.innerHTML = data.kpis.map(kpiCard).join('');

  const docs = $('dash-docs');
  if (docs) docs.innerHTML = `
    <div class="section-header">
      <span class="section-title">Tài liệu gần đây</span>
      <button class="section-link" data-nav-to="/documents">Xem tất cả</button>
    </div>
    ${recentDocs(data.recentDocuments)}
  `;

  const act = $('dash-activity');
  if (act) act.innerHTML = `
    <div class="section-header">
      <span class="section-title">Hoạt động</span>
    </div>
    ${activityTimeline(data.activityLog)}
  `;

  const chart = $('dash-chart');
  if (chart) chart.innerHTML = `
    <div class="section-header">
      <span class="section-title">Tokens sử dụng 7 ngày qua</span>
    </div>
    ${usageChart(data.tokensByDay)}
  `;

  const builders = $('dash-builders');
  if (builders) builders.innerHTML = `
    <div class="section-header">
      <span class="section-title">AI Builders đã cài</span>
      <button class="section-link" data-nav-to="/marketplace">Khám phá thêm</button>
    </div>
    <div class="builders-grid">${installedBuilders(data.installedBuilders)}</div>
  `;

  const aiStats = $('dash-ai-stats');
  if (aiStats) aiStats.innerHTML = _renderAiStats(data.aiStats);

  // Wire internal nav buttons (builder cards + section links)
  document.querySelectorAll('#dash-content [data-nav-to]').forEach((btn) => {
    btn.addEventListener('click', () => { window.location.hash = btn.dataset.navTo; });
  });
}

export function init() {
  if (_unsub) _unsub();
  // subscribe fires immediately — handles both initial render and workspace switch
  _unsub = workspaceStore.subscribe(({ workspace }) => { loadAndRender(workspace); });
}
