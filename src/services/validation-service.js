export function validate(schema, formData) {
  const errors = {};

  for (const field of schema.fields ?? []) {
    const raw   = formData[field.id] ?? '';
    const value = typeof raw === 'string' ? raw.trim() : String(raw ?? '');
    const v     = field.validation ?? {};

    if (field.required && !value) {
      errors[field.id] = `${field.label} la bat buoc`;
      continue;
    }

    if (!value) continue; // optional and empty — skip remaining checks

    if (v.minLength && value.length < v.minLength) {
      errors[field.id] = `${field.label} phai co it nhat ${v.minLength} ky tu`;
      continue;
    }

    if (v.maxLength && value.length > v.maxLength) {
      errors[field.id] = `${field.label} khong duoc vuot qua ${v.maxLength} ky tu`;
      continue;
    }

    if (field.type === 'number') {
      const num = Number(value);
      if (v.min !== undefined && num < v.min) {
        errors[field.id] = `${field.label} phai lon hon hoac bang ${v.min}`;
        continue;
      }
      if (v.max !== undefined && num > v.max) {
        errors[field.id] = `${field.label} phai nho hon hoac bang ${v.max}`;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
