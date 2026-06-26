import { userStore }      from '../stores/user-store.js';
import { workspaceStore } from '../stores/workspace-store.js';

// Plan → builder IDs allowed. null = all builders.
const PLAN_BUILDERS = {
  free:     ['prompt-builder'],
  starter:  ['prompt-builder', 'sop-builder'],
  pro:      null,
  business: null,
};

export function can(permission) {
  return userStore.hasPermission(permission);
}

export function currentPlan() {
  return workspaceStore.getWorkspace()?.plan ?? 'free';
}

export function isBuilderAccessible(builderId) {
  const plan    = currentPlan();
  const allowed = Object.prototype.hasOwnProperty.call(PLAN_BUILDERS, plan)
    ? PLAN_BUILDERS[plan]
    : PLAN_BUILDERS.free;
  if (allowed === null) return true;   // null = all builders unlocked
  return allowed.includes(builderId);
}

export function canRunBuilder(builderId) {
  return can('builders:run') && isBuilderAccessible(builderId);
}

export function planAllowedBuilders() {
  const plan    = currentPlan();
  const allowed = Object.prototype.hasOwnProperty.call(PLAN_BUILDERS, plan)
    ? PLAN_BUILDERS[plan]
    : PLAN_BUILDERS.free;
  return allowed; // null = all
}
