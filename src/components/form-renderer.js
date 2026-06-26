import { renderField } from './field-renderer.js';

export function renderForm(schema) {
  const fields = (schema.fields ?? []).map(renderField).join('');
  return `<form class="bld-form" id="bld-form" novalidate>${fields}</form>`;
}

export function getFormData(schema) {
  const data = {};
  for (const field of schema.fields ?? []) {
    const el = document.getElementById(`bld-field-${field.id}`);
    if (!el) continue;
    if (field.type === 'checkbox') {
      data[field.id] = el.checked ? (field.checkboxValue ?? 'true') : '';
    } else {
      data[field.id] = (el.value ?? '').trim();
    }
  }
  return data;
}

export function initForm(schema) {
  for (const field of schema.fields ?? []) {
    const el = document.getElementById(`bld-field-${field.id}`);
    el?.addEventListener('input',  () => clearError(field.id));
    el?.addEventListener('change', () => clearError(field.id));
  }
}

export function showErrors(errors) {
  for (const [fieldId, message] of Object.entries(errors)) {
    const errEl   = document.getElementById(`bld-err-${fieldId}`);
    const inputEl = document.getElementById(`bld-field-${fieldId}`);
    if (errEl)   errEl.textContent = message;
    inputEl?.classList.add('field-input--error');
  }
  const firstId = Object.keys(errors)[0];
  if (firstId) document.getElementById(`bld-field-${firstId}`)?.focus();
}

function clearError(fieldId) {
  const errEl   = document.getElementById(`bld-err-${fieldId}`);
  const inputEl = document.getElementById(`bld-field-${fieldId}`);
  if (errEl) errEl.textContent = '';
  inputEl?.classList.remove('field-input--error');
}
