function renderField(field) {
  const id  = `bld-field-${field.id}`;
  const req = field.required ? '<span class="field-req" aria-label="bắt buộc">*</span>' : '';

  const label = `<label class="field-label" for="${id}">${field.label} ${req}</label>`;

  let control;
  if (field.type === 'textarea') {
    control = `
      <textarea
        class="field-input"
        id="${id}"
        name="${field.id}"
        placeholder="${field.placeholder ?? ''}"
        maxlength="${field.maxLength ?? 2000}"
        rows="${field.rows ?? 4}"
        ${field.required ? 'required' : ''}
      ></textarea>`;
  } else if (field.type === 'select') {
    const opts = field.options
      .map((o) => `<option value="${o}">${o}</option>`)
      .join('');
    control = `
      <select class="field-input" id="${id}" name="${field.id}" ${field.required ? 'required' : ''}>
        ${opts}
      </select>`;
  } else {
    control = `
      <input
        class="field-input"
        id="${id}"
        name="${field.id}"
        type="text"
        placeholder="${field.placeholder ?? ''}"
        maxlength="${field.maxLength ?? 500}"
        ${field.required ? 'required' : ''}
      >`;
  }

  return `
    <div class="field-group">
      ${label}
      ${control}
      <div class="field-error" id="bld-err-${field.id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

export function render(builder) {
  return `
    <div class="bld-form" id="bld-form-${builder.id}">
      ${builder.fields.map(renderField).join('')}
    </div>
  `;
}

// Clear errors on input — called after the form is in the DOM
export function initForm(builder) {
  builder.fields.forEach((field) => {
    const el = document.getElementById(`bld-field-${field.id}`);
    if (!el) return;
    el.addEventListener('input', () => {
      const errEl = document.getElementById(`bld-err-${field.id}`);
      if (errEl) errEl.textContent = '';
      el.classList.remove('field-input--error');
    });
  });
}

// Returns { valid: boolean, errors: { [fieldId]: string } }
export function validate(builder) {
  const errors = {};
  let valid = true;

  builder.fields.forEach((field) => {
    const el    = document.getElementById(`bld-field-${field.id}`);
    if (!el) return;
    const value = el.value.trim();
    let msg = '';

    if (field.required && !value) {
      msg = `${field.label} là bắt buộc`;
    } else if (field.maxLength && value.length > field.maxLength) {
      msg = `Tối đa ${field.maxLength} ký tự (hiện tại: ${value.length})`;
    }

    const errEl = document.getElementById(`bld-err-${field.id}`);
    if (errEl) errEl.textContent = msg;
    el.classList.toggle('field-input--error', !!msg);

    if (msg) { errors[field.id] = msg; valid = false; }
  });

  // Focus first invalid field
  if (!valid) {
    const firstErr = Object.keys(errors)[0];
    document.getElementById(`bld-field-${firstErr}`)?.focus();
  }

  return { valid, errors };
}

// Returns plain object { fieldId: value } for all fields
export function getData(builder) {
  const data = {};
  builder.fields.forEach((field) => {
    const el = document.getElementById(`bld-field-${field.id}`);
    if (el) data[field.id] = el.value.trim();
  });
  return data;
}
