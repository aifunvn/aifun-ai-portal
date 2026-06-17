/**
 * AIFUN OS — skill-engine.js
 * Core engine: Form → AI → Google Docs → Result
 * ─────────────────────────────────────────────────────────────────
 * Phụ thuộc: config.js, skill-forms.js
 * Load thứ tự: config.js → skill-forms.js → skill-engine.js
 */

const SkillEngine = (() => {

  // ── Private state ─────────────────────────────────────────────────────────
  let _currentSkillId  = null;
  let _currentFormData = null;
  let _modal           = null;

  // ── Init: inject modal container into body ────────────────────────────────
  function init() {
    if (document.getElementById('se-modal')) return; // already inited

    const container = document.createElement('div');
    container.id = 'se-modal-container';
    container.innerHTML = `
      <!-- Backdrop -->
      <div id="se-backdrop" onclick="SkillEngine.close()"></div>

      <!-- Modal -->
      <div id="se-modal" role="dialog" aria-modal="true" aria-labelledby="se-modal-title">

        <!-- Header -->
        <div class="se-modal-header">
          <div class="se-modal-title-wrap">
            <span id="se-modal-icon" class="se-modal-icon"></span>
            <div>
              <div id="se-modal-title" class="se-modal-title">Skill</div>
              <div id="se-modal-subtitle" class="se-modal-subtitle"></div>
            </div>
          </div>
          <button class="se-close-btn" onclick="SkillEngine.close()" aria-label="Đóng">✕</button>
        </div>

        <!-- Step indicator -->
        <div class="se-steps">
          <div class="se-step active" data-step="1"><span>1</span><small>Nhập liệu</small></div>
          <div class="se-step-line"></div>
          <div class="se-step" data-step="2"><span>2</span><small>AI xử lý</small></div>
          <div class="se-step-line"></div>
          <div class="se-step" data-step="3"><span>3</span><small>Tài liệu</small></div>
        </div>

        <!-- Body (swappable content) -->
        <div id="se-modal-body" class="se-modal-body"></div>

      </div>
    `;
    document.body.appendChild(container);

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    _modal = document.getElementById('se-modal');
  }

  // ── Public: launch skill (called from "Khởi chạy Skill" button) ───────────
  function launch(skillIdRaw) {
    init();

    const skillId = normalizeSkillId(skillIdRaw);
    const form    = getSkillForm(skillId);

    if (!form) {
      // Fallback to old behaviour if skill not in SKILL_FORMS
      showToast(`⚡ ${skillIdRaw} chưa có form — đang cập nhật!`, 'warn');
      return;
    }

    _currentSkillId  = skillId;
    _currentFormData = null;

    // Set header
    document.getElementById('se-modal-icon').textContent   = form.icon;
    document.getElementById('se-modal-title').textContent  = form.title;
    document.getElementById('se-modal-subtitle').textContent = `${form.category} · ⏱ ${form.estimatedTime} · 📄 ${form.outputType}`;

    // Render step 1 — form
    renderFormStep(form);
    openModal();
    setStep(1);
  }

  // ── Step 1: Render input form ──────────────────────────────────────────────
  function renderFormStep(form) {
    const body = document.getElementById('se-modal-body');

    const fieldsHtml = form.fields.map(f => {
      const cls = f.span === 2 ? 'se-field se-field-full' : 'se-field';
      return `<div class="${cls}">${renderField(f)}</div>`;
    }).join('');

    body.innerHTML = `
      <form id="se-form" novalidate>
        <div class="se-field-grid">${fieldsHtml}</div>
        <div class="se-form-actions">
          <button type="button" class="se-btn se-btn-ghost" onclick="SkillEngine.close()">Huỷ</button>
          <button type="button" class="se-btn se-btn-primary" onclick="SkillEngine._onFormSubmit()">
            🚀 Tạo tài liệu với AI
          </button>
        </div>
      </form>
    `;

    // Init checkbox groups
    body.querySelectorAll('.se-checkbox-group input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => updateCheckboxValue(cb.closest('.se-field')));
    });
  }

  // ── Render individual field ────────────────────────────────────────────────
  function renderField(f) {
    const req = f.required ? 'required' : '';
    const label = `<label for="se-${f.id}" class="se-label">${f.label}</label>`;

    switch (f.type) {
      case 'text':
        return `${label}<input type="text" id="se-${f.id}" name="${f.id}" class="se-input"
          placeholder="${f.placeholder || ''}" ${req}>`;

      case 'textarea':
        return `${label}<textarea id="se-${f.id}" name="${f.id}" class="se-textarea"
          placeholder="${f.placeholder || ''}" rows="${f.rows || 3}" ${req}></textarea>`;

      case 'select': {
        const opts = f.options.map(o =>
          `<option value="${o}"${f.defaultValue === o ? ' selected' : ''}>${o}</option>`
        ).join('');
        return `${label}<select id="se-${f.id}" name="${f.id}" class="se-select" ${req}>
          <option value="">— Chọn —</option>${opts}</select>`;
      }

      case 'checkbox-group': {
        const checks = f.options.map(o =>
          `<label class="se-check-label">
            <input type="checkbox" class="se-checkbox" value="${o}"> ${o}
          </label>`
        ).join('');
        return `${label}
          <div class="se-checkbox-group">${checks}</div>
          <input type="hidden" id="se-${f.id}" name="${f.id}" ${req}>`;
      }

      default:
        return `${label}<input type="text" id="se-${f.id}" name="${f.id}" class="se-input"
          placeholder="${f.placeholder || ''}" ${req}>`;
    }
  }

  // ── Sync checkbox → hidden input ──────────────────────────────────────────
  function updateCheckboxValue(fieldEl) {
    const hidden   = fieldEl.querySelector('input[type=hidden]');
    const checked  = fieldEl.querySelectorAll('input[type=checkbox]:checked');
    hidden.value   = Array.from(checked).map(c => c.value).join(', ');
  }

  // ── Form submit handler ────────────────────────────────────────────────────
  async function _onFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const form = document.getElementById('se-form');
    if (!validateForm(form)) return;

    // Collect form data
    const fd = new FormData(form);
    _currentFormData = {};
    fd.forEach((v, k) => { _currentFormData[k] = v; });

    // Go to step 2 — loading
    renderLoadingStep();
    setStep(2);

    try {
      const result = await callGAS(_currentSkillId, _currentFormData);
      renderResultStep(result);
      setStep(3);
      updateDashboardStats(result);
    } catch (err) {
      renderErrorStep(err.message || 'Lỗi không xác định. Vui lòng thử lại.');
    }
  }

  // ── Validate form (highlight empty required fields) ───────────────────────
  function validateForm(form) {
    let valid = true;
    form.querySelectorAll('[required]').forEach(el => {
      el.classList.remove('se-input-error');
      if (!el.value.trim()) {
        el.classList.add('se-input-error');
        valid = false;
      }
    });
    if (!valid) {
      const first = form.querySelector('.se-input-error');
      if (first) first.focus();
      showFormError('Vui lòng điền đầy đủ các trường bắt buộc (*)');
    }
    return valid;
  }

  // ── Step 2: Loading / Processing ──────────────────────────────────────────
  function renderLoadingStep() {
    const form    = SKILL_FORMS[_currentSkillId];
    const steps   = form ? form.aiOutputSections : ['Phân tích', 'Tạo nội dung', 'Tạo tài liệu'];

    document.getElementById('se-modal-body').innerHTML = `
      <div class="se-loading">
        <div class="se-spinner"></div>
        <div class="se-loading-title">AI đang xử lý…</div>
        <div class="se-loading-sub">Đang tạo ${form?.outputType || 'tài liệu'} với AI. Vui lòng chờ khoảng ${form?.estimatedTime || '2-3 phút'}.</div>
        <div class="se-loading-steps">
          ${steps.map((s, i) => `
            <div class="se-ls-item" id="se-ls-${i}">
              <span class="se-ls-icon">⏳</span>
              <span class="se-ls-text">${s}</span>
            </div>
          `).join('')}
        </div>
        <div class="se-loading-note">💡 AI đang gọi Claude/OpenAI để tạo nội dung &amp; Google Docs cho bạn</div>
      </div>
    `;

    // Animate steps sequentially (visual feedback)
    steps.forEach((_, i) => {
      setTimeout(() => {
        const el = document.getElementById(`se-ls-${i}`);
        if (el) {
          el.querySelector('.se-ls-icon').textContent = '🔄';
          el.classList.add('active');
        }
        // Mark previous as done
        if (i > 0) {
          const prev = document.getElementById(`se-ls-${i-1}`);
          if (prev) {
            prev.querySelector('.se-ls-icon').textContent = '✅';
            prev.classList.add('done');
          }
        }
      }, i * (AIFUN_CONFIG.requestTimeout / steps.length) * 0.3);
    });
  }

  // ── Step 3: Result ────────────────────────────────────────────────────────
  function renderResultStep(result) {
    const {
      fileName, docUrl, pdfUrl, content,
      docId, createdAt, skillTitle
    } = result;

    const contentPreview = (content || '')
      .substring(0, 800)
      .replace(/\n/g, '<br>')
      + (content && content.length > 800 ? '…' : '');

    document.getElementById('se-modal-body').innerHTML = `
      <div class="se-result">
        <div class="se-result-success">
          <div class="se-result-check">✅</div>
          <div class="se-result-msg">Tài liệu đã được tạo thành công!</div>
          <div class="se-result-file">${fileName || 'AIFUN_Document'}</div>
        </div>

        <div class="se-result-actions">
          <a href="${docUrl}" target="_blank" rel="noopener" class="se-btn se-btn-primary">
            📄 Xem Google Docs
          </a>
          ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" class="se-btn se-btn-secondary">⬇️ Tải PDF</a>` : ''}
          <button class="se-btn se-btn-secondary" onclick="SkillEngine._copyContent()">
            📋 Sao chép nội dung
          </button>
          <button class="se-btn se-btn-ghost" onclick="SkillEngine._downloadDocx('${encodeURIComponent(content || '')}','${fileName || 'document'}')">
            📎 Tải Word (.docx)
          </button>
        </div>

        <div class="se-result-preview">
          <div class="se-result-preview-label">📝 Xem trước nội dung</div>
          <div id="se-content-preview" class="se-result-preview-body">${contentPreview}</div>
        </div>

        <div class="se-result-meta">
          <span>📅 ${createdAt || new Date().toLocaleString('vi-VN')}</span>
          <span>🔗 ID: ${docId || '—'}</span>
        </div>

        <div class="se-result-bottom">
          <button class="se-btn se-btn-ghost" onclick="SkillEngine._newDocument()">
            ➕ Tạo tài liệu mới
          </button>
          <button class="se-btn se-btn-ghost" onclick="SkillEngine.close()">
            Đóng
          </button>
        </div>
      </div>
    `;

    // Store content for copy
    window._seLastContent = content || '';

    showToast('✅ Tài liệu đã được tạo và lưu vào Google Drive!', 'success');
  }

  // ── Error step ────────────────────────────────────────────────────────────
  function renderErrorStep(msg) {
    document.getElementById('se-modal-body').innerHTML = `
      <div class="se-error">
        <div class="se-error-icon">❌</div>
        <div class="se-error-title">Có lỗi xảy ra</div>
        <div class="se-error-msg">${msg}</div>
        <div class="se-result-bottom">
          <button class="se-btn se-btn-primary" onclick="SkillEngine._retryWithForm()">
            🔄 Thử lại
          </button>
          <button class="se-btn se-btn-ghost" onclick="SkillEngine.close()">Đóng</button>
        </div>
      </div>
    `;
    setStep(1);
  }

  // ── Call Google Apps Script Web App ───────────────────────────────────────
  async function callGAS(skillId, formData) {
    const url = AIFUN_CONFIG.gasWebAppUrl;
    if (!url || url.includes('YOUR_')) {
      throw new Error('GAS URL chưa được cấu hình. Vui lòng cập nhật config.js → gasWebAppUrl');
    }

    // Build prompt & title from skill form definition (required by Code.gs)
    const skillForm = (typeof SKILL_FORMS !== 'undefined') ? SKILL_FORMS[skillId] : null;
    const prompt = skillForm && skillForm.buildPrompt
      ? skillForm.buildPrompt(formData)
      : _buildGenericPrompt(skillId, formData);
    const title = skillForm && skillForm.buildTitle
      ? skillForm.buildTitle(formData)
      : `${skillId}_${new Date().toISOString().slice(0,10)}`;

    const payload = {
      action:    'generateDocument',
      skillId,
      prompt,           // ← bắt buộc theo Code.gs
      title,            // ← dùng làm tên file Google Doc
      formData,
      provider:  AIFUN_CONFIG.defaultProvider,
      folderId:  AIFUN_CONFIG.driveFolderId,
      spreadsheetId: AIFUN_CONFIG.spreadsheetId,
      user:      getCurrentUser(),
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), AIFUN_CONFIG.requestTimeout);

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;

    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Get current user (from existing auth or anonymous) ───────────────────
  function getCurrentUser() {
    // Try to get from existing AIFUN auth (if implemented)
    if (window.AIFUN && window.AIFUN.currentUser) return window.AIFUN.currentUser;
    if (window.currentUser) return window.currentUser;
    return localStorage.getItem('aifun_user') || 'anonymous';
  }

  // ── Helper: normalize skill ID ────────────────────────────────────────────
  function normalizeSkillId(raw) {
    if (!raw) return '';
    // Convert "SOP Builder" → "sop-builder", etc.
    return raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // ── Modal open / close ────────────────────────────────────────────────────
  function openModal() {
    document.getElementById('se-modal-container').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    const container = document.getElementById('se-modal-container');
    if (container) container.classList.remove('active');
    document.body.style.overflow = '';
    _currentSkillId  = null;
    _currentFormData = null;
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  function setStep(n) {
    document.querySelectorAll('.se-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active',    s === n);
      el.classList.toggle('completed', s  <  n);
    });
    document.querySelectorAll('.se-step-line').forEach((el, i) => {
      el.classList.toggle('completed', i < n - 1);
    });
  }

  // ── Form error message ────────────────────────────────────────────────────
  function showFormError(msg) {
    let el = document.getElementById('se-form-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'se-form-error';
      el.className = 'se-form-error';
      document.getElementById('se-form').prepend(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ── Update stats dashboard widget ─────────────────────────────────────────
  function updateDashboardStats(result) {
    // Increment total docs counter if element exists
    const totalEl = document.getElementById('stat-total-docs');
    if (totalEl) {
      const cur = parseInt(totalEl.textContent) || 0;
      totalEl.textContent = cur + 1;
    }
    // Today counter
    const todayEl = document.getElementById('stat-docs-today');
    if (todayEl) {
      const cur = parseInt(todayEl.textContent) || 0;
      todayEl.textContent = cur + 1;
    }
    // Skill-specific counter
    if (_currentSkillId) {
      const skillEl = document.getElementById(`stat-skill-${_currentSkillId}`);
      if (skillEl) {
        const cur = parseInt(skillEl.textContent) || 0;
        skillEl.textContent = cur + 1;
      }
    }
  }

  // ── Action: copy content to clipboard ─────────────────────────────────────
  function _copyContent() {
    const text = window._seLastContent || '';
    if (!text) { showToast('Không có nội dung để sao chép', 'warn'); return; }
    navigator.clipboard.writeText(text)
      .then(() => showToast('✅ Đã sao chép nội dung!', 'success'))
      .catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('✅ Đã sao chép!', 'success');
      });
  }

  // ── Action: download as simple .docx (plain-text wrapped in docx) ─────────
  function _downloadDocx(encodedContent, fileName) {
    const content = decodeURIComponent(encodedContent);
    // Simple RTF-wrapped approach for browser download
    // For production, use the Google Docs export URL instead
    const blob = new Blob([content], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${fileName || 'AIFUN_Document'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📎 Đang tải file...', 'info');
  }

  // ── Action: create new doc (go back to form) ──────────────────────────────
  function _newDocument() {
    const form = SKILL_FORMS[_currentSkillId];
    if (form) {
      renderFormStep(form);
      setStep(1);
    } else {
      close();
    }
  }

  // ── Action: retry (go back to form with previous data) ───────────────────
  function _retryWithForm() {
    const form = SKILL_FORMS[_currentSkillId];
    if (!form) { close(); return; }
    renderFormStep(form);
    setStep(1);
    // Re-populate form with previous data
    if (_currentFormData) {
      Object.entries(_currentFormData).forEach(([k, v]) => {
        const el = document.getElementById(`se-${k}`);
        if (el) el.value = v;
      });
    }
  }

  // ── Toast notification ────────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    // Use existing AIFUN toast if available
    if (window.showToast) { window.showToast(msg, type); return; }

    const id  = 'se-toast';
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = id;
      toast.className = 'se-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = `se-toast se-toast-${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // ── Generic prompt fallback (khi không có buildPrompt trong skill-forms) ──
  function _buildGenericPrompt(skillId, formData) {
    const lines = Object.entries(formData)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    return `Bạn là chuyên gia của AIFUN. Hãy tạo tài liệu chuyên nghiệp cho skill "${skillId}" dựa trên thông tin sau:\n\n${lines}\n\nViết bằng tiếng Việt, có cấu trúc rõ ràng, thực chiến, có thể dùng ngay.`;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    init,
    launch,
    close,
    _onFormSubmit,
    _copyContent,
    _downloadDocx,
    _newDocument,
    _retryWithForm,
  };

})();

// ── Hook into existing "Khởi chạy Skill" buttons ─────────────────────────────
// Intercept all clicks matching the launch pattern
document.addEventListener('DOMContentLoaded', () => {
  SkillEngine.init();

  // Intercept existing launch buttons (adapt selector to your HTML)
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-skill-launch], .launch-skill-btn, [onclick*="launchSkill"]');
    if (!btn) return;

    // Prevent old handler from firing
    e.stopImmediatePropagation();

    const skillId = btn.dataset.skillId
      || btn.dataset.skillLaunch
      || btn.getAttribute('onclick')?.match(/launchSkill\(['"](.+?)['"]\)/)?.[1]
      || btn.closest('[data-skill-id]')?.dataset.skillId;

    if (skillId) {
      e.preventDefault();
      SkillEngine.launch(skillId);
    }
  }, true); // capture phase — runs before existing handlers
});

// ── Expose to global scope for onclick="" attributes ──────────────────────────
window.SkillEngine = SkillEngine;
