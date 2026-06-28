export function renderField(field) {
  return `
    <div class="field-group" data-field-id="${field.id}">
      <label class="field-label" for="bld-field-${field.id}">
        ${field.label}${field.required ? '<span class="field-req" aria-hidden="true">*</span>' : ''}
      </label>
      ${renderInput(field)}
      <span class="field-error" id="bld-err-${field.id}" role="alert"></span>
    </div>
  `;
}

function renderInput(field) {
  const base = `id="bld-field-${field.id}" name="${field.id}" class="field-input"`;
  const req  = field.required ? 'required' : '';
  const ph   = field.placeholder ? `placeholder="${esc(field.placeholder)}"` : '';
  const maxL = field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : '';

  switch (field.type) {
    case 'textarea':
      return `<textarea ${base} rows="${field.rows ?? 3}" ${ph} ${maxL} ${req}></textarea>`;

    case 'select':
      return `
        <select ${base} ${req}>
          <option value="">-- Chon --</option>
          ${(field.options ?? []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
        </select>
      `;

    case 'checkbox':
      return `
        <label class="field-checkbox-wrap">
          <input type="checkbox" id="bld-field-${field.id}" name="${field.id}" class="field-checkbox-input">
          <span class="field-checkbox-label">${field.checkboxLabel ?? field.label}</span>
        </label>
      `;

    case 'number': {
      const min = field.validation?.min !== undefined ? `min="${field.validation.min}"` : '';
      const max = field.validation?.max !== undefined ? `max="${field.validation.max}"` : '';
      return `<input type="number" ${base} ${ph} ${min} ${max} ${req}>`;
    }

    default: // text
      return `<input type="text" ${base} ${ph} ${maxL} ${req}>`;
  }
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
