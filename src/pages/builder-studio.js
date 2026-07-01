import { workspaceStore } from '../stores/workspace-store.js';
import { render as builderCard } from '../components/bs-builder-card.js';
import {
  getBuilders, getBuilder, createBuilder, saveBuilder,
  publishBuilder, unpublishBuilder, deleteBuilder,
} from '../services/builder-studio-service.js';

let _unsub  = null;
let _gen    = 0; // generation guard — same pattern as Dashboard (Sprint 16A)

const $ = (id) => document.getElementById(id);

function _errorBoundary(label, retryFn) {
  return `
    <div class="bs-error-boundary" role="alert">
      <p class="bs-empty-note">Không thể tải ${label}. Vui lòng thử lại.</p>
      <button class="bs-btn bs-btn--ghost" id="bs-retry">Thử lại</button>
    </div>
  `;
}

function _wireRetry(el, retryFn) {
  el.querySelector('#bs-retry')?.addEventListener('click', retryFn);
}

export function render() {
  return `<div id="bs-content" class="bs-page"></div>`;
}

// ── List view ────────────────────────────────────────────────────────────────

let _listFilters = { status: 'all', query: '' };

async function showList() {
  const root = $('bs-content');
  if (!root) return;
  const gen = ++_gen;
  const workspaceId = workspaceStore.getWorkspace()?.id;

  root.innerHTML = `
    <div class="bs-page-header">
      <div>
        <h2 class="bs-page-title">Builder Studio</h2>
        <p class="bs-page-subtitle">Tạo và quản lý AI Builder tùy chỉnh cho workspace của bạn</p>
      </div>
      <button class="bs-btn bs-btn--primary" id="bs-create-btn">+ Tạo Builder mới</button>
    </div>
    <div class="bs-toolbar">
      <input type="search" id="bs-search" class="bs-input" placeholder="Tìm theo tên Builder..." value="${_listFilters.query}">
      <select id="bs-filter-status" class="bs-input">
        <option value="all"       ${_listFilters.status === 'all' ? 'selected' : ''}>Tất cả trạng thái</option>
        <option value="draft"     ${_listFilters.status === 'draft' ? 'selected' : ''}>Bản nháp</option>
        <option value="published" ${_listFilters.status === 'published' ? 'selected' : ''}>Đã publish</option>
      </select>
    </div>
    <div id="bs-list-body"><div class="bld-loading"><div class="spinner"></div></div></div>
  `;

  $('bs-create-btn')?.addEventListener('click', () => showForm(null));
  $('bs-search')?.addEventListener('input', _debounce((e) => {
    _listFilters.query = e.target.value;
    _loadListBody(gen, workspaceId);
  }, 300));
  $('bs-filter-status')?.addEventListener('change', (e) => {
    _listFilters.status = e.target.value;
    _loadListBody(gen, workspaceId);
  });

  await _loadListBody(gen, workspaceId);
}

function _debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function _loadListBody(gen, workspaceId) {
  const body = $('bs-list-body');
  if (!body) return;
  try {
    const builders = await getBuilders(workspaceId, _listFilters);
    if (gen !== _gen) return; // stale — a newer list/filter pass has started
    if (!builders.length) {
      body.innerHTML = `
        <div class="doc-empty" style="margin-top:24px">
          <p class="doc-empty-title">Chưa có Builder nào</p>
          <p class="doc-empty-desc">Nhấn "Tạo Builder mới" để bắt đầu.</p>
        </div>
      `;
      return;
    }
    body.innerHTML = `<div class="bs-grid">${builders.map(builderCard).join('')}</div>`;
    _wireCardActions(body, workspaceId);
  } catch (err) {
    if (gen !== _gen) return;
    body.innerHTML = _errorBoundary('danh sách Builder');
    _wireRetry(body, () => _loadListBody(++_gen, workspaceId));
  }
}

function _wireCardActions(scope, workspaceId) {
  scope.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id     = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'edit')        return showForm(id);
      if (action === 'playground')  return showPlayground(id);
      if (action === 'versions')    return showVersions(id);
      if (action === 'analytics')   return showAnalytics(id);
      if (action === 'delete')      return _handleDelete(id, workspaceId);
      if (action === 'toggle-status') return _handleToggleStatus(btn, id, workspaceId);
    });
  });
}

async function _handleDelete(id, workspaceId) {
  if (!window.confirm('Xóa Builder này? Hành động không thể hoàn tác.')) return;

  // Separate try/catch from the reload below — otherwise a reload failure
  // (e.g. a transient list-fetch error) would show "delete failed" even
  // when the delete itself succeeded, and we'd never be able to tell which
  // step actually broke.
  try {
    await deleteBuilder(id);
  } catch (err) {
    console.error('[BuilderStudio] Delete builder failed:', id, err);
    window.alert(`Không thể xóa Builder: ${err?.message ?? 'Lỗi không xác định'}`);
    return;
  }

  try {
    await _loadListBody(++_gen, workspaceId);
  } catch (err) {
    console.error('[BuilderStudio] Builder deleted, but list reload failed:', err);
  }
}

async function _handleToggleStatus(btn, id, workspaceId) {
  btn.disabled = true;
  try {
    const builder = await getBuilder(id);
    if (builder.status === 'published') await unpublishBuilder(id);
    else await publishBuilder(id);
    await _loadListBody(++_gen, workspaceId);
  } catch {
    window.alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    btn.disabled = false;
  }
}

// ── Create / Edit form (lazy-loaded) ────────────────────────────────────────

async function showForm(builderId) {
  const root = $('bs-content');
  if (!root) return;
  const gen = ++_gen;
  const workspaceId = workspaceStore.getWorkspace()?.id;

  root.innerHTML = `
    <div class="bs-page-header">
      <h2 class="bs-page-title">${builderId ? 'Sửa Builder' : 'Tạo Builder mới'}</h2>
    </div>
    <div id="bs-form-body"><div class="bld-loading"><div class="spinner"></div></div></div>
  `;

  try {
    const [{ render: formRender, initForm }, builder] = await Promise.all([
      import('../components/bs-builder-form.js'),
      builderId ? getBuilder(builderId) : Promise.resolve(null),
    ]);
    if (gen !== _gen) return;

    const body = $('bs-form-body');
    body.innerHTML = formRender(builder ?? {});
    const ctrl = initForm(body, { knowledgeSources: builder?.knowledgeSources ?? [] });

    $('bs-form-cancel')?.addEventListener('click', showList);
    $('bs-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = ctrl.collect();
      if (!data.name || !data.promptTemplate) {
        window.alert('Vui lòng nhập Tên Builder và Prompt Template.');
        return;
      }
      const submitBtn = $('bs-form-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';
      try {
        if (builderId) await saveBuilder(builderId, workspaceId, data);
        else           await createBuilder(workspaceId, data);
        showList();
      } catch {
        window.alert('Không thể lưu Builder. Vui lòng thử lại.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lưu Builder';
      }
    });
  } catch {
    if (gen !== _gen) return;
    $('bs-form-body').innerHTML = _errorBoundary('biểu mẫu Builder');
    _wireRetry($('bs-form-body'), () => showForm(builderId));
  }
}

// ── Version History (lazy-loaded) ───────────────────────────────────────────

async function showVersions(builderId) {
  const root = $('bs-content');
  if (!root) return;
  const gen = ++_gen;

  root.innerHTML = `
    <div class="bs-page-header">
      <h2 class="bs-page-title">Lịch sử phiên bản</h2>
      <button class="bs-btn bs-btn--ghost" id="bs-back">&larr; Quay lại</button>
    </div>
    <div id="bs-versions-body"><div class="bld-loading"><div class="spinner"></div></div></div>
  `;
  $('bs-back')?.addEventListener('click', showList);

  try {
    const [{ render: versionsRender }, { getVersionHistory }, builder] = await Promise.all([
      import('../components/bs-version-history.js'),
      import('../services/builder-studio-service.js'),
      getBuilder(builderId),
    ]);
    const versions = await getVersionHistory(builderId);
    if (gen !== _gen) return;
    const body = $('bs-versions-body');
    body.innerHTML = versionsRender(versions, builder.currentVersion);

    body.querySelectorAll('[data-restore]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const v = versions.find((ver) => ver.version === Number(btn.dataset.restore));
        if (!v || !window.confirm(`Khôi phục về v${v.version}?`)) return;
        const { saveBuilder: save } = await import('../services/builder-studio-service.js');
        await save(builderId, workspaceStore.getWorkspace()?.id, {
          name: v.name, description: v.description, category: builder.category, icon: builder.icon,
          systemPrompt: v.systemPrompt, promptTemplate: v.promptTemplate,
          model: v.model, temperature: v.temperature, maxTokens: v.maxTokens,
          knowledgeSources: v.knowledgeSources,
        }, `Khôi phục từ v${v.version}`);
        showVersions(builderId);
      });
    });
  } catch {
    if (gen !== _gen) return;
    $('bs-versions-body').innerHTML = _errorBoundary('lịch sử phiên bản');
    _wireRetry($('bs-versions-body'), () => showVersions(builderId));
  }
}

// ── Test Playground (lazy-loaded) ───────────────────────────────────────────

async function showPlayground(builderId) {
  const root = $('bs-content');
  if (!root) return;
  const gen = ++_gen;
  const workspaceId = workspaceStore.getWorkspace()?.id;

  root.innerHTML = `
    <div class="bs-page-header">
      <h2 class="bs-page-title">Test Playground</h2>
      <button class="bs-btn bs-btn--ghost" id="bs-back">&larr; Quay lại</button>
    </div>
    <div id="bs-pg-body"><div class="bld-loading"><div class="spinner"></div></div></div>
  `;
  $('bs-back')?.addEventListener('click', showList);

  try {
    const [pgMod, builder] = await Promise.all([
      import('../components/bs-test-playground.js'),
      getBuilder(builderId),
    ]);
    if (gen !== _gen) return;
    const body = $('bs-pg-body');
    body.innerHTML = pgMod.render(builder);

    $('bs-pg-run')?.addEventListener('click', async () => {
      const input  = $('bs-pg-input')?.value ?? '';
      const output = $('bs-pg-output');
      output.innerHTML = pgMod.renderLoading();
      try {
        const { testBuilder } = await import('../services/builder-studio-service.js');
        const result = await testBuilder(builder, input, workspaceId);
        output.innerHTML = pgMod.renderResult(result);
      } catch (err) {
        output.innerHTML = pgMod.renderError(err?.message ?? 'Lỗi không xác định');
      }
    });
  } catch {
    if (gen !== _gen) return;
    $('bs-pg-body').innerHTML = _errorBoundary('Test Playground');
    _wireRetry($('bs-pg-body'), () => showPlayground(builderId));
  }
}

// ── Analytics (lazy-loaded) ──────────────────────────────────────────────────

async function showAnalytics(builderId) {
  const root = $('bs-content');
  if (!root) return;
  const gen = ++_gen;

  root.innerHTML = `
    <div class="bs-page-header">
      <h2 class="bs-page-title">Thống kê sử dụng</h2>
      <button class="bs-btn bs-btn--ghost" id="bs-back">&larr; Quay lại</button>
    </div>
    <div id="bs-analytics-body"><div class="bld-loading"><div class="spinner"></div></div></div>
  `;
  $('bs-back')?.addEventListener('click', showList);

  try {
    const [{ render: analyticsRender }, { getAnalyticsSummary }] = await Promise.all([
      import('../components/bs-analytics-panel.js'),
      import('../services/builder-studio-service.js'),
    ]);
    const summary = await getAnalyticsSummary(builderId);
    if (gen !== _gen) return;
    $('bs-analytics-body').innerHTML = analyticsRender(summary);
  } catch {
    if (gen !== _gen) return;
    $('bs-analytics-body').innerHTML = _errorBoundary('thống kê');
    _wireRetry($('bs-analytics-body'), () => showAnalytics(builderId));
  }
}

// ── Page lifecycle ───────────────────────────────────────────────────────────

export function init() {
  if (_unsub) { _unsub(); _unsub = null; }
  _listFilters = { status: 'all', query: '' };
  showList();
}
