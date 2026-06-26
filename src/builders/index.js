import { PROMPT_BUILDER } from './prompt-builder.js';

// Central registry — add new builders here as they are created in future sprints
export const BUILDERS = [
  PROMPT_BUILDER,
];

export function getBuilder(id) {
  return BUILDERS.find((b) => b.id === id) ?? null;
}
