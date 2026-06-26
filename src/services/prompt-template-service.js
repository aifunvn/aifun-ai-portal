import { workspaceStore } from '../stores/workspace-store.js';
import { userStore } from '../stores/user-store.js';

export function buildPrompt(schema, formData) {
  const workspace = workspaceStore.getWorkspace();
  const user      = userStore.getUser();
  const userName  = user?.user_metadata?.full_name ?? user?.email ?? 'Nguoi dung';

  let tpl = schema.prompt_template ?? '';

  // Inject system context variables
  tpl = tpl.replace(/\{\{workspace_name\}\}/g, workspace?.name ?? 'Workspace');
  tpl = tpl.replace(/\{\{builder_name\}\}/g,   schema.name ?? '');
  tpl = tpl.replace(/\{\{user_name\}\}/g,       userName);

  // Inject field values
  for (const field of schema.fields ?? []) {
    const value = formData[field.id] ?? '';
    tpl = tpl.replace(new RegExp(`\\{\\{${field.id}\\}\\}`, 'g'), value);
  }

  // Remove any leftover unresolved placeholders
  tpl = tpl.replace(/\{\{[^}]+\}\}/g, '');

  return tpl.trim();
}

export function buildTitle(schema, formData) {
  const mainField = schema.fields?.find((f) => f.required && f.type === 'text');
  const mainValue = mainField ? (formData[mainField.id] ?? '') : '';
  const label     = mainValue.slice(0, 60) || 'Khong co tieu de';
  return `${schema.name} — ${label}`;
}
