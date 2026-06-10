// AIFUN AI Portal V2.0 — script.js
import {
  AI_TOOLS,
  PROMPTS      as _PROMPTS,
  SKILLS       as _SKILLS,
  PROJECTS     as _PROJECTS,
  SOPS         as _SOPS,
  AUTOMATIONS  as _AUTOMATIONS,
  COURSES,
  getDashboardStats,
  loadData,
  testConnection,
  getSheetsStatus,
  startAutoRefresh,
  invalidateSheetsCache,
} from './data.js';

// Mutable data — replaced by loadData() (Sheets → JSON → static)
let PROMPTS     = _PROMPTS;
let SKILLS      = _SKILLS;
let PROJECTS    = _PROJECTS;
let SOPS        = _SOPS;
let AUTOMATIONS = _AUTOMATIONS;

// Theo dõi tier data đang dùng
let _dataSource = 'static';

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function toast(msg, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = `${icons[type] || ''} ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

/* ═══════════════════════════════════════════
   DARK MODE
═══════════════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem('aifun-theme');
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (preferDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('darkToggle') || document.getElementById('themeToggle');
  if (!btn) return;
  const sun  = btn.querySelector('.icon-sun');
  const moon = btn.querySelector('.icon-moon');
  if (sun && moon) {
    sun.style.display  = theme === 'dark'  ? 'block' : 'block';
    moon.style.display = theme === 'dark'  ? 'none'  : 'none';
  }
  btn.title = theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('aifun-theme', next);
  updateThemeIcon(next);
}

/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
function nav(pageId) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  qsa('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navEl) navEl.classList.add('active');

  const renders = {
    home:        renderHome,
    'ai-tools':  renderTools,
    prompts:     renderPrompts,
    skills:      renderSkills,
    'sop-library': renderSOPs,
    crm:         renderCRM,
    automation:  renderAutomations,
    projects:    renderProjects,
    training:    renderTraining,
    dashboard:   renderDashboard,
  };
  if (renders[pageId]) renders[pageId]();

  if (window.innerWidth <= 768) closeSidebar();
}

/* ═══════════════════════════════════════════
   SIDEBAR TOGGLE
═══════════════════════════════════════════ */
function openSidebar() {
  qs('.sidebar').classList.add('open');
  qs('.sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  qs('.sidebar').classList.remove('open');
  qs('.sidebar-overlay').classList.remove('open');
}

/* ═══════════════════════════════════════════
   HOME
═══════════════════════════════════════════ */
function renderHome() {
  const stats = getDashboardStats({ skills: SKILLS, projects: PROJECTS, sops: SOPS, prompts: PROMPTS });
  const activeProjects = PROJECTS.filter(p => p.status === 'inprogress').length;
  const totalPromptUses = PROMPTS.reduce((s,p) => s + p.uses, 0);
  const activeAuto = AUTOMATIONS.filter(a => a.active).length;

  const statCards = [
    { icon: iconBriefcase(), color: 'blue',   label: 'AI Skills',   value: stats.totalSkills,    change: '+2 tháng này',                    pos: true },
    { icon: iconFolderOpen(), color: 'purple', label: 'Projects',   value: stats.totalProjects,  change: `${activeProjects} đang chạy`,      pos: true },
    { icon: iconDoc(),        color: 'green',  label: 'SOP Docs',   value: stats.totalSOPs,      change: `${stats.activeSOPs} active`,        pos: true },
    { icon: iconPrompt(),     color: 'orange', label: 'Prompts',    value: stats.totalPrompts,   change: `${totalPromptUses}+ lượt dùng`,    pos: true },
    { icon: iconBot(),        color: 'teal',   label: 'AI Tools',   value: AI_TOOLS.length,      change: 'All connected',                    pos: true },
    { icon: iconAuto(),       color: 'indigo', label: 'Workflows',  value: AUTOMATIONS.length,   change: `${activeAuto} active`,              pos: true },
    { icon: iconBook(),       color: 'pink',   label: 'Courses',    value: COURSES.length,       change: 'Free access',                      pos: true },
    { icon: iconCheck(),      color: 'green',  label: 'SOPs Active',value: stats.activeSOPs,     change: `${stats.totalSOPs - stats.activeSOPs} updating`, pos: false },
  ];

  setHTML('homeStats', statCards.map(s => `
    <div class="stat-card">
      <div class="stat-icon ${s.color}">${s.icon}</div>
      <div class="stat-info">
        <span class="stat-value">${s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>
      <span class="stat-change ${s.pos ? 'pos' : 'neg'}">${s.change}</span>
    </div>
  `).join(''));

  setHTML('homeToolsRow', AI_TOOLS.map(t => `
    <a href="${escHtml(t.url)}" target="_blank" rel="noopener" class="tool-chip">
      <span class="tool-chip-emoji">${t.icon}</span> ${escHtml(t.name)}
    </a>
  `).join(''));
}

/* ═══════════════════════════════════════════
   AI TOOLS
═══════════════════════════════════════════ */
function renderTools() {
  setHTML('toolsGrid', AI_TOOLS.map(t => `
    <div class="tool-card" onclick="window.open('${escHtml(t.url)}','_blank','noopener')">
      <div class="tool-card-header">
        <div class="tool-logo ${t.color}">${t.icon}</div>
        <span class="tool-status ${t.status}">${t.status === 'active' ? '● Active' : '○ Inactive'}</span>
      </div>
      <div class="tool-name">${escHtml(t.name)}</div>
      <div class="tool-desc">${escHtml(t.desc)}</div>
      <div class="tool-tags">${t.tags.map(g => `<span class="tag">${escHtml(g)}</span>`).join('')}</div>
      <div class="tool-footer">
        <span class="tool-uses">⚡ ${t.uses.toLocaleString()} uses</span>
        <a href="${escHtml(t.url)}" target="_blank" rel="noopener" class="tool-open" onclick="event.stopPropagation()">Mở ↗</a>
      </div>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   PROMPTS
═══════════════════════════════════════════ */
const promptFilter = { search: '', cat: 'all' };

function renderPrompts() {
  const cats = ['all', ...new Set(PROMPTS.map(p => p.category))];
  setHTML('promptCats', cats.map(c => `
    <button class="cat-btn ${promptFilter.cat === c ? 'active' : ''}"
      onclick="App.setPromptCat('${c}')">${c === 'all' ? 'Tất cả' : escHtml(c)}</button>
  `).join(''));

  const q = promptFilter.search.toLowerCase();
  const filtered = PROMPTS.filter(p => {
    const matchCat = promptFilter.cat === 'all' || p.category === promptFilter.cat;
    const matchQ   = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (!filtered.length) {
    setHTML('promptsGrid', `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Không tìm thấy prompt</h3><p>Thử từ khóa khác hoặc chọn danh mục khác</p></div>`);
    return;
  }

  setHTML('promptsGrid', filtered.map(p => `
    <div class="prompt-card">
      <div class="prompt-meta">
        <span class="prompt-cat ${p.category}">${escHtml(p.category)}</span>
        <span class="prompt-tool">${escHtml(p.tool)}</span>
      </div>
      <div class="prompt-title">${escHtml(p.title)}</div>
      <div class="prompt-preview">${escHtml(p.content)}</div>
      <div class="prompt-stars" title="${p.rating}/5">${stars(p.rating)} ${p.rating}</div>
      <div class="prompt-actions">
        <button class="prompt-copy" onclick="App.copyPrompt('${p.id}')">📋 Copy</button>
        <button class="prompt-use"  onclick="App.usePrompt('${p.id}')">🚀 Dùng ngay</button>
      </div>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   SKILLS
═══════════════════════════════════════════ */
let skillSearch = '';

function renderSkills() {
  const skillCountEl = document.getElementById('skillCount');
  if (skillCountEl) skillCountEl.textContent = SKILLS.length;
  const q = skillSearch.toLowerCase();
  const filtered = SKILLS.filter(s => !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));

  if (!filtered.length) {
    setHTML('skillsGrid', `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Không tìm thấy skill</h3><p>Thử từ khóa khác</p></div>`);
    return;
  }

  setHTML('skillsGrid', filtered.map(s => `
    <div class="skill-card">
      <div class="skill-header">
        <div class="skill-icon" style="background:${s.gradient}">${s.icon}</div>
        <div class="skill-meta">
          <div class="skill-category">${escHtml(s.category)}</div>
          <div class="skill-rating">${stars(s.rating)}</div>
        </div>
      </div>
      <div class="skill-name">${escHtml(s.name)}</div>
      <div class="skill-desc">${escHtml(s.desc)}</div>
      <div class="skill-stats">
        <span>⚡ ${s.uses} uses</span>
        <span>⏱ ${escHtml(s.time)}</span>
      </div>
      <button class="skill-launch-btn" onclick="App.launchSkill('${s.id}')">🚀 Khởi chạy Skill</button>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   SOP
═══════════════════════════════════════════ */
const sopFilter = { search: '', dept: 'all' };

function renderSOPs() {
  const depts = ['all', ...new Set(SOPS.map(s => s.dept))];
  const total    = SOPS.length;
  const active   = SOPS.filter(s => s.status === 'active').length;
  const updating = SOPS.filter(s => s.status === 'updating').length;

  setHTML('sopStatsRow', `
    <button class="sop-stat-pill blue ${sopFilter.dept === 'all' ? 'active' : ''}" onclick="App.setSopDept('all')">📋 Tất cả: ${total}</button>
    <span class="sop-stat-pill green">✅ Active: ${active}</span>
    <span class="sop-stat-pill orange">🔄 Updating: ${updating}</span>
    ${depts.filter(d => d !== 'all').map(d => `
      <button class="sop-stat-pill gray ${sopFilter.dept === d ? 'active' : ''}" onclick="App.setSopDept('${escHtml(d)}')">${escHtml(d)}</button>
    `).join('')}
  `);

  const q = sopFilter.search.toLowerCase();
  const filtered = SOPS.filter(s => {
    const matchDept = sopFilter.dept === 'all' || s.dept === sopFilter.dept;
    const matchQ    = !q || s.name.toLowerCase().includes(q);
    return matchDept && matchQ;
  });

  setHTML('sopTableBody', filtered.map(s => `
    <tr>
      <td><span class="sop-name">${escHtml(s.name)}</span></td>
      <td><span class="sop-dept-badge">${escHtml(s.dept)}</span></td>
      <td><span class="sop-status ${s.status}">${s.status === 'active' ? '✅ Active' : '🔄 Updating'}</span></td>
      <td>${escHtml(s.updated)}</td>
      <td><button class="sop-action" onclick="App.viewSOP('${s.id}')">Xem →</button></td>
    </tr>
  `).join(''));
}

/* ═══════════════════════════════════════════
   CRM
═══════════════════════════════════════════ */
function renderCRM() {
  // KPI cards are static in HTML — only render dynamic pipeline

  const stages = [
    { name: 'Prospecting', color: '#3b82f6', count: 45, pct: 88, val: '₫1.2B' },
    { name: 'Qualified',   color: '#8b5cf6', count: 28, pct: 55, val: '₫980M' },
    { name: 'Proposal',    color: '#f59e0b', count: 16, pct: 31, val: '₫760M' },
    { name: 'Negotiation', color: '#06b6d4', count: 9,  pct: 18, val: '₫540M' },
    { name: 'Closed Won',  color: '#10b981', count: 6,  pct: 12, val: '₫720M' },
  ];
  setHTML('crmPipeline', `<div class="pipeline">${stages.map(s => `
    <div class="pipeline-stage">
      <div class="pipeline-header">
        <span class="pipeline-dot" style="background:${s.color}"></span>
        <span class="pipeline-name">${s.name}</span>
        <span class="pipeline-count">${s.count} deals</span>
      </div>
      <div class="pipeline-bar"><div class="pipeline-fill" style="width:${s.pct}%;background:${s.color}"></div></div>
      <div class="pipeline-val">${s.val}</div>
    </div>
  `).join('')}</div>`);

}

/* ═══════════════════════════════════════════
   AUTOMATION
═══════════════════════════════════════════ */
function renderAutomations() {
  const active = AUTOMATIONS.filter(a => a.active).length;
  setHTML('autoStatsRow', `
    <div class="auto-stat"><div class="auto-stat-icon" style="background:#dbeafe">⚙️</div><div><div class="auto-stat-val">${AUTOMATIONS.length}</div><div class="auto-stat-lbl">Tổng Workflows</div></div></div>
    <div class="auto-stat"><div class="auto-stat-icon" style="background:#dcfce7">✅</div><div><div class="auto-stat-val">${active}</div><div class="auto-stat-lbl">Active</div></div></div>
    <div class="auto-stat"><div class="auto-stat-icon" style="background:#fef3c7">🔁</div><div><div class="auto-stat-val">12,480</div><div class="auto-stat-lbl">Runs / tháng</div></div></div>
    <div class="auto-stat"><div class="auto-stat-icon" style="background:#f3e8ff">⏱</div><div><div class="auto-stat-val">98.2%</div><div class="auto-stat-lbl">Success Rate</div></div></div>
  `);

  setHTML('workflowsGrid', AUTOMATIONS.map(a => `
    <div class="workflow-card ${!a.active ? 'paused' : ''}" id="wf-${a.id}">
      <div class="workflow-header">
        <div class="workflow-icon" style="background:${a.iconBg || '#e0e7ff'}">${a.icon}</div>
        <div class="workflow-meta">
          <span class="workflow-name">${escHtml(a.name)}</span>
          <span class="workflow-tool">${escHtml(a.tools || '')}</span>
        </div>
        <div class="workflow-toggle ${a.active ? 'on' : ''}" onclick="App.toggleWorkflow('${a.id}', this)"></div>
      </div>
      <div class="workflow-desc">${escHtml(a.desc)}</div>
      <div class="workflow-stats">
        <span>🔁 ${a.runs || '—'}</span>
        ${a.saved ? `<span>⏱ ${escHtml(a.saved)}</span>` : ''}
      </div>
      <div class="workflow-tags">${(a.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   PROJECTS
═══════════════════════════════════════════ */
const projectFilter = { search: '', status: 'all' };

function renderProjects() {
  const statuses = [
    { val: 'all', label: 'Tất cả' },
    { val: 'inprogress', label: 'Đang chạy' },
    { val: 'review', label: 'Review' },
    { val: 'planning', label: 'Lên kế hoạch' },
    { val: 'done', label: 'Hoàn thành' },
  ];
  setHTML('projectStatusFilter', statuses.map(s => `
    <button class="cat-btn ${projectFilter.status === s.val ? 'active' : ''}"
      onclick="App.setProjectStatus('${s.val}')">${s.label}</button>
  `).join(''));

  const q = projectFilter.search.toLowerCase();
  const filtered = PROJECTS.filter(p => {
    const matchStatus = projectFilter.status === 'all' || p.status === projectFilter.status;
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  if (!filtered.length) {
    setHTML('projectsList', `<div class="empty-state"><div class="empty-icon">📂</div><h3>Không tìm thấy dự án</h3><p>Thử tìm kiếm khác</p></div>`);
    return;
  }

  setHTML('projectsList', filtered.map(p => `
    <div class="project-row">
      <div class="project-color ${p.color}"></div>
      <div class="project-main">
        <div class="project-name">${escHtml(p.name)}</div>
        <div class="project-sub">${escHtml(p.description)}</div>
      </div>
      <div class="project-progress">
        <div class="progress-bar sm"><div class="progress-fill" style="width:${p.progress}%"></div></div>
        <span class="progress-label">${p.progress}%</span>
      </div>
      <span class="project-status ${p.status}">${escHtml(p.statusLabel)}</span>
      <span class="project-date">📅 ${escHtml(p.deadline)}</span>
      <span class="project-updated">🕐 ${escHtml(p.updatedAt)}</span>
      <div class="project-team">${(p.team || []).slice(0,3).map((t,i) => `
        <div class="team-avatar" style="background:hsl(${i*80+200},65%,45%)">${t.charAt(0)}</div>
      `).join('')}</div>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   TRAINING
═══════════════════════════════════════════ */
function renderTraining() {
  setHTML('trainingGrid', COURSES.map(c => `
    <div class="course-card">
      ${c.badge ? `<div class="course-badge">${escHtml(c.badge)}</div>` : ''}
      <div class="course-thumb ${c.thumb || ''}"></div>
      <div class="course-body">
        <span class="course-level ${c.level}">${escHtml(c.levelLabel)}</span>
        <div class="course-title">${escHtml(c.title)}</div>
        <div class="course-desc">${escHtml(c.desc)}</div>
        <div class="course-meta">
          <span>📖 ${c.modules} modules</span>
          <span>⏱ ${c.hours}h</span>
          <span>👥 ${c.students.toLocaleString()} học viên</span>
        </div>
        <a href="#" class="course-btn" onclick="App.startCourse('${c.id}');return false">▶ Bắt đầu học</a>
      </div>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════ */
function renderDashboard() {
  const stats = getDashboardStats({ skills: SKILLS, projects: PROJECTS, sops: SOPS, prompts: PROMPTS });
  const dashDate = document.getElementById('dashDate');
  if (dashDate) dashDate.textContent = new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const kpis = [
    { label: 'Doanh thu tháng',   value: '₫2.4B',  trend: '+18% so tháng trước', up: true,  spark: [4,6,5,7,8,6,9,8,10,9,11,10] },
    { label: 'Leads mới',         value: '348',     trend: '+24% so tháng trước', up: true,  spark: [3,5,4,6,5,7,8,6,9,8,10,9]  },
    { label: 'Tỷ lệ chuyển đổi', value: '23.6%',   trend: '+3.2% so tháng trước', up: true, spark: [5,6,4,7,6,8,7,9,8,10,9,11] },
    { label: 'Customer Churn',    value: '1.8%',    trend: '-0.4% so tháng trước', up: false, spark: [7,8,6,7,5,6,4,5,3,4,2,3]  },
  ];
  setHTML('dashKpi', kpis.map(k => {
    const mx = Math.max(...k.spark);
    return `
      <div class="kpi-card">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-trend ${k.up ? 'up' : 'down'}">${k.up ? '↑' : '↓'} ${k.trend}</div>
        <div class="kpi-sparkline">
          ${k.spark.map((v,i) => `<div class="spark ${i >= k.spark.length-3 ? 'active' : ''}" style="height:${Math.round(v/mx*100)}%"></div>`).join('')}
        </div>
      </div>
    `;
  }).join(''));

  const counts = [
    { icon: '🎯', val: stats.totalSkills,  lbl: 'AI Skills', badge: 'ACTIVE',   bg: '#dbeafe', bc: '#1d4ed8' },
    { icon: '📂', val: stats.totalProjects, lbl: 'Projects',  badge: 'RUNNING',  bg: '#f3e8ff', bc: '#7c3aed' },
    { icon: '📋', val: stats.totalSOPs,     lbl: 'SOP Docs',  badge: 'DOCS',     bg: '#dcfce7', bc: '#15803d' },
    { icon: '💡', val: stats.totalPrompts,  lbl: 'Prompts',   badge: 'LIBRARY',  bg: '#fef3c7', bc: '#b45309' },
  ];
  setHTML('dashCountRow', counts.map(c => `
    <div class="dash-count-card">
      <div class="dash-count-icon">${c.icon}</div>
      <div class="dash-count-val">${c.val}</div>
      <div class="dash-count-lbl">${c.lbl}</div>
      <span class="dash-count-badge" style="background:${c.bg};color:${c.bc}">${c.badge}</span>
    </div>
  `).join(''));

  const goals = [
    { name: 'Doanh thu Q2',    curr: 7.2,               target: 10,              unit: 'B₫',    color: 'blue'   },
    { name: 'Lead Generation', curr: 1248,               target: 2000,            unit: 'leads', color: 'purple' },
    { name: 'Skills Deployed', curr: SKILLS.length,      target: 15,              unit: 'skills',color: 'green'  },
    { name: 'SOP Coverage',    curr: stats.activeSOPs,   target: stats.totalSOPs, unit: 'docs',  color: 'orange' },
  ];
  setHTML('dashGoals', `<div class="goals-list">${goals.map(g => {
    const pct = Math.min(Math.round((g.curr / g.target) * 100), 100);
    return `
      <div class="goal-item">
        <div class="goal-info">
          <span class="goal-name">${g.name}</span>
          <span class="goal-value">${g.curr}/${g.target} ${g.unit}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress-bar thick"><div class="progress-fill ${g.color}" style="width:${pct}%"></div></div>
          <span class="goal-pct">${pct}%</span>
        </div>
      </div>
    `;
  }).join('')}</div>`);

  const topSkills = [...SKILLS].sort((a,b) => b.uses - a.uses).slice(0,5);
  const maxUses   = topSkills[0]?.uses || 1;
  setHTML('dashTopSkills', `<div class="top-skills">${topSkills.map((s,i) => `
    <div class="top-skill-row">
      <span class="top-skill-rank">#${i+1}</span>
      <span class="top-skill-name">${escHtml(s.name)}</span>
      <div class="progress-bar sm"><div class="progress-fill" style="width:${Math.round(s.uses/maxUses*100)}%"></div></div>
      <span class="top-skill-val">${s.uses}</span>
    </div>
  `).join('')}</div>`);

  setHTML('dashProjects', PROJECTS.slice(0,4).map(p => `
    <div class="project-row">
      <div class="project-color ${p.color}"></div>
      <div class="project-main" style="flex:1">
        <div class="project-name">${escHtml(p.name)}</div>
        <div class="project-sub">${escHtml(p.description)}</div>
      </div>
      <div class="project-progress">
        <div class="progress-bar sm"><div class="progress-fill" style="width:${p.progress}%"></div></div>
        <span class="progress-label">${p.progress}%</span>
      </div>
      <span class="project-status ${p.status}">${escHtml(p.statusLabel)}</span>
    </div>
  `).join(''));
}

/* ═══════════════════════════════════════════
   SVG ICONS
═══════════════════════════════════════════ */
function svgIcon(path) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
const iconBriefcase = () => svgIcon('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>');
const iconFolderOpen= () => svgIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>');
const iconDoc       = () => svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
const iconPrompt    = () => svgIcon('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
const iconBot       = () => svgIcon('<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>');
const iconAuto      = () => svgIcon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>');
const iconBook      = () => svgIcon('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>');
const iconCheck     = () => svgIcon('<polyline points="20 6 9 17 4 12"/>');

/* ═══════════════════════════════════════════
   SKILL LAUNCH MODAL
═══════════════════════════════════════════ */
function launchSkill(id) {
  const skill = SKILLS.find(s => s.id === id || s.id === String(id));
  if (!skill) return;
  const overlay = document.getElementById('skillModal');
  if (!overlay) return;
  qs('#skillModalTitle', overlay).textContent = `🚀 ${skill.name}`;
  qs('#skillModalDesc',  overlay).textContent = skill.desc;
  const progress = qs('#skillModalProgress', overlay);
  const status   = qs('#skillModalStatus',   overlay);
  if (progress) progress.style.width = '0%';
  if (status)   status.textContent   = 'Khởi tạo AI...';
  overlay.classList.add('open');

  const steps = ['Khởi tạo AI...', 'Nạp dữ liệu...', 'Chuẩn bị Skill...', 'Sẵn sàng!'];
  let pct = 0; let step = 0;
  const iv = setInterval(() => {
    pct = Math.min(pct + Math.random() * 28, 100);
    if (progress) progress.style.width = pct + '%';
    if (status && steps[step]) { status.textContent = steps[step]; step++; }
    if (pct >= 100) {
      clearInterval(iv);
      if (status) status.textContent = '✅ Skill đã sẵn sàng!';
      setTimeout(() => {
        overlay.classList.remove('open');
        toast(`${skill.name} đã được khởi chạy!`, 'success');
      }, 900);
    }
  }, 380);
}

function closeSkillModal() {
  const overlay = document.getElementById('skillModal');
  if (overlay) overlay.classList.remove('open');
}

/* ═══════════════════════════════════════════
   PROMPT ACTIONS
═══════════════════════════════════════════ */
async function copyPrompt(id) {
  const p = PROMPTS.find(p => p.id === id || p.id === String(id));
  if (!p) return;
  try {
    await navigator.clipboard.writeText(p.content);
    toast('Đã copy prompt!', 'success');
  } catch {
    toast('Copy thất bại!', 'error');
  }
}

function usePrompt(id) {
  const p = PROMPTS.find(p => p.id === id || p.id === String(id));
  if (!p) return;
  const toolUrls = { ChatGPT: 'https://chat.openai.com', Claude: 'https://claude.ai', Gemini: 'https://gemini.google.com' };
  const url = toolUrls[p.tool];
  navigator.clipboard.writeText(p.content).catch(() => {});
  if (url) {
    window.open(url, '_blank', 'noopener');
    toast(`Đã copy & mở ${p.tool}!`, 'success');
  } else {
    toast('Đã copy prompt!', 'success');
  }
}

/* ═══════════════════════════════════════════
   ADD PROMPT MODAL
═══════════════════════════════════════════ */
function openAddPromptModal() {
  const overlay = document.getElementById('addPromptModal');
  if (!overlay) return;
  const form = document.getElementById('addPromptForm');
  if (form) form.reset();
  const statusEl = document.getElementById('apSheetsStatus');
  if (statusEl) statusEl.style.display = 'none';
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('apTitle')?.focus(), 80);
}

function closeAddPromptModal() {
  const overlay = document.getElementById('addPromptModal');
  if (overlay) overlay.classList.remove('open');
}

async function submitAddPrompt(e) {
  e.preventDefault();

  const title    = document.getElementById('apTitle')?.value.trim()    || '';
  const category = document.getElementById('apCategory')?.value        || '';
  const tool     = document.getElementById('apTool')?.value            || '';
  const tagsRaw  = document.getElementById('apTags')?.value.trim()     || '';
  const content  = document.getElementById('apContent')?.value.trim()  || '';

  if (!title || !category || !tool || !content) {
    toast('Vui lòng điền đầy đủ các trường bắt buộc!', 'error');
    return;
  }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const id   = 'p' + Date.now();
  const newPrompt = { id, title, category, tool, content, tags, uses: 0, rating: 5 };

  const btn      = document.getElementById('apSubmitBtn');
  const statusEl = document.getElementById('apSheetsStatus');

  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }

  // ── 1. Lưu local ────────────────────────────────────────────────
  PROMPTS.unshift(newPrompt);
  _updateNavBadges();

  // ── 2. Thử ghi vào Google Sheets qua Apps Script ────────────────
  let sheetsResult = 'skipped'; // 'ok' | 'error' | 'skipped'
  try {
    const { SHEETS_CONFIG } = await import('./config.js');
    if (SHEETS_CONFIG.APPS_SCRIPT_URL) {
      const row = [id, title, category, tool, content, tags.join(','), 0, 5];
      const resp = await fetch(SHEETS_CONFIG.APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'addRow', sheet: 'PROMPTS', row }),
      });
      sheetsResult = resp.ok ? 'ok' : 'error';
    }
  } catch {
    sheetsResult = 'error';
  }

  // ── 3. Đóng modal & re-render ───────────────────────────────────
  closeAddPromptModal();
  renderPrompts();

  // ── 4. Thông báo kết quả ────────────────────────────────────────
  if (sheetsResult === 'ok') {
    toast(`✅ Đã lưu "${title}" vào Prompt Library & Google Sheets!`, 'success', 4000);
  } else if (sheetsResult === 'error') {
    toast(`⚠️ Đã thêm "${title}" nhưng ghi Sheets thất bại. Kiểm tra Apps Script URL.`, 'info', 5000);
  } else {
    toast(`✅ Đã thêm "${title}" vào Prompt Library!`, 'success', 3000);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Lưu Prompt'; }
}

/* ═══════════════════════════════════════════
   AUTOMATION TOGGLE
═══════════════════════════════════════════ */
function toggleWorkflow(id, el) {
  const wf = AUTOMATIONS.find(a => a.id === id);
  if (!wf) return;
  const isOn = el.classList.toggle('on');
  wf.active = isOn;
  const card = el.closest('.workflow-card');
  if (card) card.classList.toggle('paused', !isOn);
  toast(`${wf.name} ${isOn ? 'đã kích hoạt' : 'đã tạm dừng'}`, isOn ? 'success' : 'info');
}

/* ═══════════════════════════════════════════
   EXPORT REPORT
═══════════════════════════════════════════ */
function exportReport() {
  const stats = getDashboardStats({ skills: SKILLS, projects: PROJECTS, sops: SOPS, prompts: PROMPTS });
  const date  = new Date().toLocaleDateString('vi-VN');
  const report = [
    'AIFUN AI Portal — Báo cáo hệ thống',
    `Ngày xuất: ${date}`,
    '',
    '=== TỔNG QUAN ===',
    `AI Skills: ${stats.totalSkills}`,
    `Projects: ${stats.totalProjects} (${stats.activeProjects} đang chạy)`,
    `SOP Docs: ${stats.totalSOPs} (${stats.activeSOPs} active)`,
    `Prompts: ${stats.totalPrompts} (${stats.promptUses} lượt dùng)`,
    `AI Tools: ${stats.totalTools}`,
    `Workflows: ${stats.totalAuto} (${stats.activeAuto} active)`,
    '',
    '=== PROJECTS ===',
    ...PROJECTS.map(p => `[${p.statusLabel}] ${p.name} — ${p.progress}% — ${p.updatedAt}`),
    '',
    '=== AI TOOLS ===',
    ...AI_TOOLS.map(t => `${t.name}: ${t.url} (${t.uses.toLocaleString()} uses)`),
    '',
    '© AIFUN — AI Optimal Solution — aifun.ai.vn',
  ].join('\n');

  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `AIFUN-Report-${date.replace(/\//g,'-')}.txt`;
  a.click();
  toast('Đã xuất báo cáo!', 'success');
}

function viewSOP(id) {
  const sop = SOPS.find(s => s.id === String(id) || s.id === id);
  if (sop) toast(`Đang mở SOP: ${sop.name}`, 'info');
}

function startCourse(id) {
  const course = COURSES.find(c => c.id === String(id) || c.id === id);
  if (course) toast(`Bắt đầu: ${course.title}`, 'info');
}

/* ═══════════════════════════════════════════
   SHEETS MANAGEMENT PANEL
═══════════════════════════════════════════ */
function openSheetsPanel() {
  const overlay = document.getElementById('sheetsPanelOverlay');
  if (!overlay) return;

  // Điền sẵn config đã lưu
  _fillSheetsPanelInputs();

  // Cập nhật bảng trạng thái
  _renderSheetStatusTable();

  // Cập nhật status row
  _updateSheetsPanelStatus();

  overlay.classList.add('open');
}

function closeSheetsPanel() {
  const overlay = document.getElementById('sheetsPanelOverlay');
  if (overlay) overlay.classList.remove('open');
}

function _fillSheetsPanelInputs() {
  const idInput  = document.getElementById('spSheetId');
  const keyInput = document.getElementById('spApiKey');

  // 1. Ưu tiên localStorage (đã lưu bởi user)
  try {
    const saved = localStorage.getItem('aifun-sheets-config');
    if (saved) {
      const { sheetId, apiKey } = JSON.parse(saved);
      if (idInput  && sheetId) idInput.value  = sheetId;
      if (keyInput && apiKey)  keyInput.value  = apiKey;
    }
  } catch {}

  // 2. Nếu input vẫn rỗng → dùng config.js (SPREADSHEET_ID đã hardcode)
  import('./config.js').then(({ SHEETS_CONFIG }) => {
    if (idInput  && !idInput.value  && SHEETS_CONFIG.SPREADSHEET_ID)
      idInput.value  = SHEETS_CONFIG.SPREADSHEET_ID;
    if (keyInput && !keyInput.value && SHEETS_CONFIG.API_KEY)
      keyInput.value = SHEETS_CONFIG.API_KEY;
  }).catch(() => {});
}

function _updateSheetsPanelStatus() {
  const status = getSheetsStatus();
  const dot    = document.getElementById('spStatusDot');
  const text   = document.getElementById('spStatusText');
  const time   = document.getElementById('spStatusTime');

  // Label theo _dataSource (trạng thái thực của UI) — ưu tiên hơn sheets.js status
  const srcLabels = {
    sheets:  status.status === 'partial' ? '⚡ Sheets — kết nối một phần' : '✅ Đã kết nối Google Sheets',
    partial: '⚡ Google Sheets — một số bảng lỗi',
    json:    '📁 JSON cục bộ (chưa kết nối Sheets)',
    static:  '💾 Static data (offline)',
    connecting: '🔄 Đang kết nối Google Sheets...',
    error:   '❌ Lỗi kết nối — dùng fallback',
    local:   '💾 Static data (offline)',
  };

  const dotClass = {
    sheets:     'connected',
    partial:    'partial',
    json:       'cached',
    static:     '',
    connecting: 'connecting',
    error:      'error',
    local:      '',
  };

  if (dot)  dot.className  = `sp-status-dot ${dotClass[_dataSource] || ''}`;
  if (text) text.textContent = srcLabels[_dataSource] || 'Local Mode';
  if (time) {
    if (status.lastFetchAt) time.textContent = `Cập nhật: ${status.lastFetchAt}`;
    else if (_dataSource === 'json' || _dataSource === 'static') time.textContent = 'Dữ liệu cục bộ';
    else time.textContent = '';
  }
}

function _renderSheetStatusTable() {
  const el = document.getElementById('spSheetTable');
  if (!el) return;

  const status = getSheetsStatus();
  const sheets = [
    { key: 'prompts',   label: 'PROMPTS',   count: PROMPTS.length },
    { key: 'skills',    label: 'SKILLS',    count: SKILLS.length },
    { key: 'sops',      label: 'SOPS',      count: SOPS.length },
    { key: 'projects',  label: 'PROJECTS',  count: PROJECTS.length },
    { key: 'workflows', label: 'WORKFLOWS', count: AUTOMATIONS.length },
  ];

  el.innerHTML = sheets.map(s => {
    // cachedSheets chứa tên tab từ SHEET_NAMES (VD: 'PROMPTS') — match với s.label
    const isCached = status.cachedSheets.some(
      c => c.toUpperCase() === s.label.toUpperCase()
    );
    const isFailed = status.failedSheets.some(f =>
      f.toLowerCase().startsWith(s.key.toLowerCase())
    );
    const badgeCls  = _dataSource === 'sheets' && isFailed  ? 'loading'
                    : _dataSource === 'sheets' && isCached  ? 'active'
                    : _dataSource === 'json'                ? 'cached'
                    : 'local';
    const badgeTxt  = _dataSource === 'sheets' && isFailed  ? '⚠ Lỗi'
                    : _dataSource === 'sheets' && isCached  ? 'Sheets ✓'
                    : _dataSource === 'json'                ? 'JSON'
                    : 'Local';
    return `
      <div class="sp-sheet-row">
        <span style="font-size:.9rem">📋</span>
        <span class="sp-sheet-name">${s.label}</span>
        <span class="sp-sheet-count">${s.count} rows</span>
        <span class="sp-sheet-badge ${badgeCls}">${badgeTxt}</span>
      </div>`;
  }).join('');
}

async function saveSheetsConfig() {
  const sheetId = document.getElementById('spSheetId')?.value?.trim() || '';
  const apiKey  = document.getElementById('spApiKey')?.value?.trim()  || '';

  // Import và gọi updateSheetsConfig từ config.js
  const { updateSheetsConfig } = await import('./config.js');
  updateSheetsConfig(sheetId, apiKey);

  // Cập nhật status
  _updateSheetsPanelStatus();

  if (sheetId && apiKey) {
    toast('Đã lưu cấu hình Sheets! Nhấn "Test Connection" để kiểm tra.', 'success', 4000);
  } else if (!sheetId && !apiKey) {
    toast('Đã xóa cấu hình Sheets — chuyển về Local Mode', 'info');
  } else {
    toast('Cần điền đủ cả Spreadsheet ID và API Key', 'error');
  }
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('spApiKey');
  const icon  = document.getElementById('spEyeIcon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    if (icon) icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

/* ── Test Connection ─────────────────────────────────────────── */
async function testSheetsConnection() {
  const btn = document.getElementById('btnTestConnection');
  const resultEl = document.getElementById('spTestResult');

  if (btn) { btn.classList.add('loading'); btn.querySelector('span').textContent = 'Đang test...'; }
  if (resultEl) { resultEl.style.display = 'none'; resultEl.className = 'sp-test-result'; }

  try {
    const result = await testConnection();

    if (resultEl) {
      resultEl.style.display = 'block';
      if (result.ok) {
        // Kiểm tra 5 tabs bắt buộc
        const required  = ['PROMPTS','SKILLS','SOPS','PROJECTS','WORKFLOWS'];
        const found     = result.sheetTabs.map(t => t.toUpperCase());
        const missing   = required.filter(r => !found.includes(r));
        const allOk     = missing.length === 0;

        resultEl.className = 'sp-test-result ok';
        resultEl.innerHTML = `
          <div class="sp-test-result-title">✅ Kết nối thành công!</div>
          <div style="margin-bottom:6px">📊 Spreadsheet: <strong>${escHtml(result.title)}</strong></div>
          <div style="margin-bottom:4px">📋 ${result.sheetTabs.length} tabs tìm thấy:</div>
          <div class="sp-test-result-tabs">
            ${result.sheetTabs.map(t => {
              const ok = required.includes(t.toUpperCase());
              return `<span class="sp-test-result-tab" style="${ok ? '' : 'opacity:.5'}">${ok ? '✓ ' : ''}${escHtml(t)}</span>`;
            }).join('')}
          </div>
          ${missing.length > 0 ? `
          <div style="margin-top:8px;padding:8px;background:rgba(245,158,11,.1);border-radius:6px;font-size:.75rem;color:#92400e">
            ⚠️ Thiếu tabs: <strong>${missing.join(', ')}</strong><br>
            Tạo thêm tab trong Spreadsheet và đặt tên đúng chính xác.
          </div>` : `
          <div style="margin-top:6px;font-size:.75rem;color:#059669">✅ Đủ 5 tabs bắt buộc — sẵn sàng Sync!</div>`}`;

        updateSyncStatus('sheets');
        toast(allOk ? '🎉 Kết nối thành công! Nhấn Sync để tải dữ liệu.' : '⚠️ Kết nối OK nhưng thiếu một số tabs.', allOk ? 'success' : 'error', 5000);

      } else {
        // Hiện hướng dẫn chi tiết theo loại lỗi
        const isApiKey   = result.needsApiKey || result.error.includes('API Key');
        const isNotPublic = result.error.includes('chia sẻ') || result.error.includes('🔒');
        const isApiDisabled = result.error.includes('chưa được bật') || result.error.includes('🔌');

        let guide = '';
        if (result.needsApiKey || isApiKey) {
          guide = `
            <div class="sp-error-guide">
              <div class="sp-error-guide-title">📋 Cách tạo API Key (3 phút):</div>
              <ol class="sp-error-guide-steps">
                <li>Vào <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a></li>
                <li>Chọn Project (hoặc tạo mới)</li>
                <li><strong>APIs & Services</strong> → <strong>Library</strong> → tìm <em>"Google Sheets API"</em> → <strong>Enable</strong></li>
                <li><strong>APIs & Services</strong> → <strong>Credentials</strong> → <strong>+ Create Credentials</strong> → <strong>API Key</strong></li>
                <li>Copy key → Dán vào ô API Key bên trên → <strong>Lưu cấu hình</strong></li>
              </ol>
            </div>`;
        } else if (isNotPublic) {
          guide = `
            <div class="sp-error-guide">
              <div class="sp-error-guide-title">📋 Cách chia sẻ Spreadsheet:</div>
              <ol class="sp-error-guide-steps">
                <li>Mở <a href="https://docs.google.com/spreadsheets/d/1hsD6pEqWmF7Z46SQrumip-wslTCOU1Jnb4f21hyuTyU" target="_blank" rel="noopener">AIFUN DATA CENTER</a></li>
                <li>Click nút <strong>Share</strong> (góc trên phải)</li>
                <li>Phần <strong>General access</strong> → đổi thành <strong>Anyone with the link</strong></li>
                <li>Đảm bảo quyền là <strong>Viewer</strong> → <strong>Done</strong></li>
                <li>Quay lại đây → nhấn <strong>Test Connection</strong> lại</li>
              </ol>
            </div>`;
        } else if (isApiDisabled) {
          guide = `
            <div class="sp-error-guide">
              <div class="sp-error-guide-title">📋 Cách bật Sheets API:</div>
              <ol class="sp-error-guide-steps">
                <li>Vào <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener">Sheets API Library</a></li>
                <li>Click <strong>Enable</strong></li>
                <li>Chờ 1-2 phút để có hiệu lực</li>
                <li>Nhấn <strong>Test Connection</strong> lại</li>
              </ol>
            </div>`;
        }

        resultEl.className = 'sp-test-result error';
        resultEl.innerHTML = `
          <div class="sp-test-result-title">❌ Kết nối thất bại</div>
          <div style="margin-bottom:${guide ? '10px' : '0'}">${escHtml(result.error)}</div>
          ${guide}`;
        toast(`Lỗi: ${result.error}`, 'error', 6000);
      }
    }
    _updateSheetsPanelStatus();
    _renderSheetStatusTable();

  } finally {
    if (btn) { btn.classList.remove('loading'); btn.querySelector('span').textContent = 'Test Connection'; }
  }
}

/* ── Sync Google Sheets ──────────────────────────────────────── */
async function syncGoogleSheets() {
  const btn = document.getElementById('btnSyncSheets');
  if (btn) { btn.classList.add('loading'); btn.querySelector('span').textContent = 'Đang sync...'; }

  try {
    invalidateSheetsCache(); // xóa cache để force fetch mới
    const loaded = await loadData();

    if (loaded._source !== 'sheets') {
      toast('Không thể sync — kiểm tra cấu hình Sheets hoặc kết nối mạng', 'error', 5000);
      return;
    }

    if (Array.isArray(loaded.prompts)   && loaded.prompts.length)   PROMPTS     = loaded.prompts;
    if (Array.isArray(loaded.skills)    && loaded.skills.length)    SKILLS      = loaded.skills;
    if (Array.isArray(loaded.projects)  && loaded.projects.length)  PROJECTS    = loaded.projects;
    if (Array.isArray(loaded.sops)      && loaded.sops.length)      SOPS        = loaded.sops;
    if (Array.isArray(loaded.workflows) && loaded.workflows.length) AUTOMATIONS = loaded.workflows;

    updateSyncStatus(loaded._partial ? 'partial' : 'sheets');
    _updateNavBadges();
    _renderSheetStatusTable();
    _updateSheetsPanelStatus();

    const ap = document.querySelector('.page.active');
    if (ap) nav(ap.id.replace('page-', ''));

    toast(
      `Sync thành công! ${PROMPTS.length} prompts · ${SKILLS.length} skills · ${PROJECTS.length} projects · ${SOPS.length} SOPs`,
      'success', 5000
    );
  } catch (err) {
    toast(`Sync thất bại: ${err.message}`, 'error', 5000);
  } finally {
    if (btn) { btn.classList.remove('loading'); btn.querySelector('span').textContent = 'Sync Google Sheets'; }
  }
}

/* ── Reload Local Data ───────────────────────────────────────── */
async function reloadLocalData() {
  const btn = document.getElementById('btnReloadLocal');
  if (btn) { btn.classList.add('loading'); btn.querySelector('span').textContent = 'Đang tải...'; }

  try {
    // Tải từ JSON files (bỏ qua Sheets)
    const base = './data';
    const fetchJSON = async (name, fallback) => {
      try {
        const res = await fetch(`${base}/${name}.json?t=${Date.now()}`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        return Array.isArray(d) && d.length ? d : fallback;
      } catch { return fallback; }
    };

    const [p, s, pr, so, wf] = await Promise.all([
      fetchJSON('prompts',   PROMPTS),
      fetchJSON('skills',    SKILLS),
      fetchJSON('projects',  PROJECTS),
      fetchJSON('sops',      SOPS),
      fetchJSON('workflows', AUTOMATIONS),
    ]);

    PROMPTS     = p;
    SKILLS      = s;
    PROJECTS    = pr;
    SOPS        = so;
    AUTOMATIONS = wf;

    updateSyncStatus('json');
    _updateNavBadges();
    _renderSheetStatusTable();
    _updateSheetsPanelStatus();

    const ap = document.querySelector('.page.active');
    if (ap) nav(ap.id.replace('page-', ''));

    toast(
      `📁 Tải từ JSON cục bộ — ${PROMPTS.length} prompts · ${SKILLS.length} skills · ${SOPS.length} SOPs`,
      'info', 4000
    );
  } finally {
    if (btn) { btn.classList.remove('loading'); btn.querySelector('span').textContent = 'Reload Local Data'; }
  }
}

/* ═══════════════════════════════════════════
   EXPORT BACKUP
═══════════════════════════════════════════ */
function exportBackup() {
  const backup = {
    version:    '2.0',
    exportedAt: new Date().toISOString(),
    exportedBy: 'AIFUN AI Portal',
    data: {
      prompts:  PROMPTS,
      skills:   SKILLS,
      projects: PROJECTS,
      sops:     SOPS,
    },
    meta: {
      totalPrompts:  PROMPTS.length,
      totalSkills:   SKILLS.length,
      totalProjects: PROJECTS.length,
      totalSOPs:     SOPS.length,
    },
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `AIFUN-Backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  closeBackupDropdown();
  toast(`Đã xuất backup (${PROMPTS.length} prompts · ${SKILLS.length} skills · ${PROJECTS.length} projects · ${SOPS.length} SOPs)`, 'success', 4000);
}

/* ═══════════════════════════════════════════
   IMPORT BACKUP
═══════════════════════════════════════════ */
let _pendingImport = null;

function openImportModal(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    let parsed;
    try { parsed = JSON.parse(e.target.result); }
    catch { toast('File JSON không hợp lệ!', 'error'); return; }

    // Basic validation
    if (!parsed.data || typeof parsed.data !== 'object') {
      toast('File không đúng định dạng AIFUN Backup!', 'error'); return;
    }
    const d = parsed.data;
    if (!Array.isArray(d.prompts) && !Array.isArray(d.skills) && !Array.isArray(d.projects) && !Array.isArray(d.sops)) {
      toast('File backup không chứa dữ liệu hợp lệ!', 'error'); return;
    }

    _pendingImport = parsed;

    const preview = document.getElementById('importPreview');
    if (preview) {
      const exportDate = parsed.exportedAt
        ? new Date(parsed.exportedAt).toLocaleString('vi-VN')
        : 'Không rõ';
      preview.innerHTML = `
        <div style="font-weight:700;color:var(--text-h);margin-bottom:8px">📦 ${file.name}</div>
        <div class="import-preview-row"><span>Version</span><span>${escHtml(String(parsed.version || '?'))}</span></div>
        <div class="import-preview-row"><span>Thời điểm xuất</span><span>${escHtml(exportDate)}</span></div>
        <div class="import-preview-row"><span>Prompts</span><span>${Array.isArray(d.prompts) ? d.prompts.length : '—'}</span></div>
        <div class="import-preview-row"><span>Skills</span><span>${Array.isArray(d.skills) ? d.skills.length : '—'}</span></div>
        <div class="import-preview-row"><span>Projects</span><span>${Array.isArray(d.projects) ? d.projects.length : '—'}</span></div>
        <div class="import-preview-row"><span>SOPs</span><span>${Array.isArray(d.sops) ? d.sops.length : '—'}</span></div>
      `;
    }

    const overlay = document.getElementById('importModal');
    if (overlay) overlay.classList.add('open');
    closeBackupDropdown();
  };
  reader.readAsText(file);
}

function confirmImport() {
  if (!_pendingImport || !_pendingImport.data) {
    toast('Chưa có dữ liệu backup để import!', 'error');
    return;
  }
  const d = _pendingImport.data;
  if (Array.isArray(d.prompts))  PROMPTS  = d.prompts;
  if (Array.isArray(d.skills))   SKILLS   = d.skills;
  if (Array.isArray(d.projects)) PROJECTS = d.projects;
  if (Array.isArray(d.sops))     SOPS     = d.sops;
  _pendingImport = null;

  closeImportModal();
  updateSyncStatus('json');

  // Re-render current page with new data
  const activePage = document.querySelector('.page.active');
  if (activePage) nav(activePage.id.replace('page-', ''));

  toast(`Import thành công! ${PROMPTS.length} prompts · ${SKILLS.length} skills · ${PROJECTS.length} projects · ${SOPS.length} SOPs`, 'success', 4000);

  // Reset file input so same file can be re-imported
  const fi = document.getElementById('importFileInput');
  if (fi) fi.value = '';
}

function closeImportModal() {
  const overlay = document.getElementById('importModal');
  if (overlay) overlay.classList.remove('open');
  _pendingImport = null;
}

/* ═══════════════════════════════════════════
   BACKUP DROPDOWN TOGGLE
═══════════════════════════════════════════ */
function toggleBackupDropdown() {
  document.getElementById('backupGroup')?.classList.toggle('open');
}
function closeBackupDropdown() {
  document.getElementById('backupGroup')?.classList.remove('open');
}

/* ═══════════════════════════════════════════
   SYNC STATUS — 5 trạng thái
   'sheets'  → ⚡ Sheets Live   (xanh lá)
   'partial' → ⚠️ Sheets Partial (vàng)
   'json'    → 📄 JSON Loaded   (xanh dương)
   'static'  → 💾 Local Mode    (xám)
   'error'   → ✗  Offline       (đỏ)
═══════════════════════════════════════════ */
function updateSyncStatus(source = 'static') {
  _dataSource = source;
  const el    = document.getElementById('syncStatus');
  const label = document.getElementById('syncLabel');
  if (!el) return;

  const states = {
    connecting: {
      cls:  'sync-status connecting',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
      text: 'Kết nối...',
    },
    sheets: {
      cls:  'sync-status sheets-live',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      text: 'Sheets Live',
    },
    partial: {
      cls:  'sync-status sheets-partial',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      text: 'Sheets Partial',
    },
    json: {
      cls:  'sync-status connected',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      text: 'JSON Loaded ✓',
    },
    static: {
      cls:  'sync-status',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      text: 'Local Mode',
    },
    error: {
      cls:  'sync-status sync-error',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      text: 'Offline',
    },
  };

  const state = states[source] || states.static;
  el.className = state.cls;
  if (label) label.textContent = state.text;

  // Tooltip chi tiết khi hover
  const sheetsStatus = getSheetsStatus();
  let tip = `Nguồn dữ liệu: ${source}`;
  if (sheetsStatus.lastFetchAt) tip += `\nCập nhật lúc: ${sheetsStatus.lastFetchAt}`;
  if (sheetsStatus.error)       tip += `\nLỗi: ${sheetsStatus.error}`;
  el.title = tip;
}

/* ═══════════════════════════════════════════
   GLOBAL APP INTERFACE
═══════════════════════════════════════════ */
window.App = {
  nav,
  exportReport,
  exportBackup,
  openImportModal,
  confirmImport,
  closeImportModal,
  copyPrompt,
  usePrompt,
  launchSkill,
  closeSkillModal,
  toggleWorkflow,
  viewSOP,
  startCourse,

  openAddPromptModal,
  closeAddPromptModal,
  submitAddPrompt,

  setPromptCat(cat) { promptFilter.cat = cat; renderPrompts(); },
  setSopDept(dept)   { sopFilter.dept = dept; renderSOPs(); },
  setProjectStatus(s){ projectFilter.status = s; renderProjects(); },

  // Sheets Management Panel
  openSheetsPanel,
  closeSheetsPanel,
  saveSheetsConfig,
  testSheetsConnection,
  syncGoogleSheets,
  reloadLocalData,
  toggleApiKeyVisibility,
};

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateSyncStatus('local');

  // Restore Sheets config từ localStorage (nếu user đã lưu trước đó)
  try {
    const { loadSheetsConfigFromStorage } = await import('./config.js');
    loadSheetsConfigFromStorage();
  } catch {}

  // Đóng Sheets Panel khi click vào backdrop
  const sheetsPanelOverlay = document.getElementById('sheetsPanelOverlay');
  if (sheetsPanelOverlay) {
    sheetsPanelOverlay.addEventListener('click', e => {
      if (e.target === sheetsPanelOverlay) closeSheetsPanel();
    });
  }

  // Theme — HTML uses id="darkToggle"
  const themeBtn = document.getElementById('darkToggle') || document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Sidebar
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) menuToggle.addEventListener('click', openSidebar);
  const sidebarClose = document.getElementById('sidebarClose');
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  const sbOverlay = qs('.sidebar-overlay');
  if (sbOverlay) sbOverlay.addEventListener('click', closeSidebar);

  // Nav
  qsa('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => nav(item.dataset.page));
  });

  // Add Prompt button
  const addPromptBtn = document.getElementById('addPromptBtn');
  if (addPromptBtn) addPromptBtn.addEventListener('click', openAddPromptModal);

  // Close Add Prompt modal on backdrop click
  const addPromptModal = document.getElementById('addPromptModal');
  if (addPromptModal) addPromptModal.addEventListener('click', e => {
    if (e.target === addPromptModal) closeAddPromptModal();
  });

  // Prompt search
  const promptSearch = document.getElementById('promptSearch');
  if (promptSearch) {
    promptSearch.addEventListener('input', e => { promptFilter.search = e.target.value; renderPrompts(); });
  }

  // Skill search
  const skillSearchEl = document.getElementById('skillSearch');
  if (skillSearchEl) {
    skillSearchEl.addEventListener('input', e => { skillSearch = e.target.value; renderSkills(); });
  }

  // SOP search
  const sopSearchEl = document.getElementById('sopSearch');
  if (sopSearchEl) {
    sopSearchEl.addEventListener('input', e => { sopFilter.search = e.target.value; renderSOPs(); });
  }

  // Project search
  const projectSearchEl = document.getElementById('projectSearch');
  if (projectSearchEl) {
    projectSearchEl.addEventListener('input', e => { projectFilter.search = e.target.value; renderProjects(); });
  }

  // Skill modal close
  const skillModal = document.getElementById('skillModal');
  if (skillModal) skillModal.addEventListener('click', e => { if (e.target === skillModal) closeSkillModal(); });

  // Import modal close on backdrop
  const importModal = document.getElementById('importModal');
  if (importModal) importModal.addEventListener('click', e => { if (e.target === importModal) closeImportModal(); });

  // Backup dropdown toggle
  const backupTrigger = document.getElementById('backupTrigger');
  if (backupTrigger) backupTrigger.addEventListener('click', e => { e.stopPropagation(); toggleBackupDropdown(); });

  // Close backup dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#backupGroup')) closeBackupDropdown();
  });

  // Import file input → open confirm modal
  const importFileInput = document.getElementById('importFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) openImportModal(file);
    });
  }

  // Start on home ngay với static data
  nav('home');

  // Hiển thị trạng thái "đang kết nối"
  updateSyncStatus('connecting');

  // 3-tier data load: Sheets → JSON → static
  try {
    const loaded = await loadData();

    // Cập nhật mutable vars
    if (Array.isArray(loaded.prompts)   && loaded.prompts.length)   PROMPTS     = loaded.prompts;
    if (Array.isArray(loaded.skills)    && loaded.skills.length)    SKILLS      = loaded.skills;
    if (Array.isArray(loaded.projects)  && loaded.projects.length)  PROJECTS    = loaded.projects;
    if (Array.isArray(loaded.sops)      && loaded.sops.length)      SOPS        = loaded.sops;
    if (Array.isArray(loaded.workflows) && loaded.workflows.length) AUTOMATIONS = loaded.workflows;

    // Xác định trạng thái hiển thị
    const source = loaded._partial ? 'partial' : (loaded._source || 'static');
    updateSyncStatus(source);

    // Cập nhật badge nav với số lượng thực
    _updateNavBadges();

    // Re-render trang đang mở với data mới
    const activePage = document.querySelector('.page.active');
    if (activePage) nav(activePage.id.replace('page-', ''));

    // Nếu Sheets được cấu hình, bắt đầu auto-refresh
    const { SHEETS_CONFIG } = await import('./config.js');
    if (SHEETS_CONFIG.AUTO_REFRESH_MS > 0 && SHEETS_CONFIG.SPREADSHEET_ID) {
      startAutoRefresh(SHEETS_CONFIG.AUTO_REFRESH_MS, (refreshed) => {
        if (Array.isArray(refreshed.prompts))   PROMPTS     = refreshed.prompts;
        if (Array.isArray(refreshed.skills))    SKILLS      = refreshed.skills;
        if (Array.isArray(refreshed.projects))  PROJECTS    = refreshed.projects;
        if (Array.isArray(refreshed.sops))      SOPS        = refreshed.sops;
        if (Array.isArray(refreshed.workflows)) AUTOMATIONS = refreshed.workflows;
        updateSyncStatus(refreshed._partial ? 'partial' : 'sheets');
        const ap = document.querySelector('.page.active');
        if (ap) nav(ap.id.replace('page-', ''));
        toast('Dữ liệu đã được làm mới từ Google Sheets', 'info', 3000);
      });
    }

  } catch (err) {
    console.warn('[Init] loadData hoàn toàn thất bại, dùng static data:', err.message);
    updateSyncStatus('static');
  }
});

/* ═══════════════════════════════════════════
   UPDATE NAV BADGES
═══════════════════════════════════════════ */
function _updateNavBadges() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('badge-prompts',  PROMPTS.length);
  set('badge-skills',   SKILLS.length);
  set('badge-sops',     SOPS.length);
  set('badge-projects', PROJECTS.length);
}
