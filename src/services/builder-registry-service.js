import { loadAll, loadById } from '../builders/registry.js';
import { buildPrompt, buildTitle } from './prompt-template-service.js';

export async function getBuilders({ status = 'active', plan = null } = {}) {
  const all = await loadAll();
  return all.filter((s) =>
    (!status || s.status === status) &&
    (!plan   || s.plan   === plan)
  );
}

export async function getBuildersByCategory({ status = 'active' } = {}) {
  const builders = await getBuilders({ status });
  return builders.reduce((groups, b) => {
    const cat = b.category ?? 'Khac';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
    return groups;
  }, {});
}

export async function getBuilder(id) {
  return loadById(id);
}

// Adapts a JSON schema to the builder interface expected by runtime-service.runBuilder()
export function createAdapter(schema) {
  return {
    id:          schema.id,
    name:        schema.name,
    buildPrompt: (data) => buildPrompt(schema, data),
    buildTitle:  (data) => buildTitle(schema, data),
  };
}
