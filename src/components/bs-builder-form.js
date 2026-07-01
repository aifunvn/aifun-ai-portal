const CATEGORIES = ['SOP', 'Content', 'Email', 'CRM', 'Report', 'Sales', 'Khac'];
const MODELS     = [
  { id: 'claude', label: 'Claude (Sonnet)' },
  { id: 'openai', label: 'OpenAI (fallback)' },
];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function knowledgeRow(src, i) {
  return `
    <div class="bs-ks-row" data-idx="${i}">
      <input type="text" class="bs-input bs-ks-label" placeholder="Tên nguồn (vd: Quy định công ty)" value="${esc(src.label)}">
      <input type="text" class="bs-input bs-ks-content" placeholder="Nội dung tham chiếu hoặc URL" value="${esc(src.content)}">
      <button type="button" class="bs-card-btn bs-card-btn--danger" data-ks-remove="${i}">Xóa</button>
    </div>
  `;
}

export function render(builder = {}) {
  const b = {
    name: '', description: '', category: 'SOP', icon: 'sparkles', status: 'draft',
    systemPrompt: '', promptTemplate: '', model: 'claude', temperature: 0.7, maxTokens: 4096,
    knowledgeSources: [],
    ...builder,
  };

  return `
    <form class="bs-form" id="bs-form" novalidate>
      <div class="bs-form-grid">
        <div class="bs-field">
          <label for="bs-f-name">Tên Builder *</label>
          <input id="bs-f-name" class="bs-input" name="name" required maxlength="120" value="${esc(b.name)}">
        </div>
        <div class="bs-field">
          <label for="bs-f-category">Danh mục</label>
          <select id="bs-f-category" class="bs-input" name="category">
            ${CATEGORIES.map((c) => `<option value="${c}" ${c === b.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="bs-field">
        <label for="bs-f-desc">Mô tả</label>
        <textarea id="bs-f-desc" class="bs-input" name="description" rows="2" maxlength="500">${esc(b.description)}</textarea>
      </div>

      <fieldset class="bs-fieldset">
        <legend>Prompt Editor</legend>
        <div class="bs-field">
          <label for="bs-f-system">System Prompt</label>
          <textarea id="bs-f-system" class="bs-input bs-textarea-code" name="systemPrompt" rows="4"
            placeholder="Vai trò và quy tắc chung cho AI...">${esc(b.systemPrompt)}</textarea>
        </div>
        <div class="bs-field">
          <label for="bs-f-template">Prompt Template *</label>
          <textarea id="bs-f-template" class="bs-input bs-textarea-code" name="promptTemplate" rows="6" required
            placeholder="Dùng {{bien}} để chèn dữ liệu form...">${esc(b.promptTemplate)}</textarea>
        </div>
      </fieldset>

      <fieldset class="bs-fieldset">
        <legend>Model Configuration</legend>
        <div class="bs-form-grid">
          <div class="bs-field">
            <label for="bs-f-model">Model</label>
            <select id="bs-f-model" class="bs-input" name="model">
              ${MODELS.map((m) => `<option value="${m.id}" ${m.id === b.model ? 'selected' : ''}>${m.label}</option>`).join('')}
            </select>
          </div>
          <div class="bs-field">
            <label for="bs-f-temp">Temperature (${b.temperature})</label>
            <input id="bs-f-temp" class="bs-input" type="range" name="temperature" min="0" max="1" step="0.1" value="${b.temperature}">
          </div>
          <div class="bs-field">
            <label for="bs-f-tokens">Max tokens</label>
            <input id="bs-f-tokens" class="bs-input" type="number" name="maxTokens" min="1" max="8192" value="${b.maxTokens}">
          </div>
        </div>
      </fieldset>

      <fieldset class="bs-fieldset">
        <legend>Knowledge Sources</legend>
        <div id="bs-ks-list">
          ${b.knowledgeSources.map(knowledgeRow).join('') || '<p class="bs-empty-note">Chưa có nguồn tham chiếu nào.</p>'}
        </div>
        <button type="button" class="bs-card-btn" id="bs-ks-add">+ Thêm nguồn</button>
      </fieldset>

      <div class="bs-form-actions">
        <button type="button" class="bs-btn bs-btn--ghost" id="bs-form-cancel">Hủy</button>
        <button type="submit" class="bs-btn bs-btn--primary" id="bs-form-submit">Lưu Builder</button>
      </div>
    </form>
  `;
}

// Wires Knowledge Sources add/remove and returns a `collect()` function that
// reads the current form state into a plain builder object on submit.
export function initForm(el, { knowledgeSources = [] } = {}) {
  let ks = [...knowledgeSources];

  function _renderKsList() {
    const list = el.querySelector('#bs-ks-list');
    list.innerHTML = ks.map(knowledgeRow).join('') || '<p class="bs-empty-note">Chưa có nguồn tham chiếu nào.</p>';
  }

  el.querySelector('#bs-ks-add')?.addEventListener('click', () => {
    ks.push({ label: '', content: '' });
    _renderKsList();
  });

  el.addEventListener('click', (e) => {
    const idx = e.target?.dataset?.ksRemove;
    if (idx === undefined) return;
    ks.splice(Number(idx), 1);
    _renderKsList();
  });

  el.querySelector('#bs-f-temp')?.addEventListener('input', (e) => {
    el.querySelector('label[for="bs-f-temp"]').textContent = `Temperature (${e.target.value})`;
  });

  return {
    collect() {
      const fd = new FormData(el.querySelector('#bs-form'));
      // Sync ks labels/content from current DOM (they're plain inputs, not form-tracked by index reliably after splice)
      el.querySelectorAll('.bs-ks-row').forEach((row, i) => {
        ks[i] = {
          label:   row.querySelector('.bs-ks-label')?.value ?? '',
          content: row.querySelector('.bs-ks-content')?.value ?? '',
        };
      });
      return {
        name:             fd.get('name')?.trim(),
        description:      fd.get('description')?.trim(),
        category:         fd.get('category'),
        icon:             'sparkles',
        systemPrompt:     fd.get('systemPrompt'),
        promptTemplate:   fd.get('promptTemplate'),
        model:            fd.get('model'),
        temperature:      parseFloat(fd.get('temperature')),
        maxTokens:        parseInt(fd.get('maxTokens'), 10),
        knowledgeSources: ks.filter((k) => k.label || k.content),
      };
    },
  };
}
