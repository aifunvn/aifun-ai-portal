/**
 * Organization-level permission engine.
 * Roles: owner > admin > manager > editor > viewer
 * Usage: canDo(orgId, 'member:invite') → Promise<boolean>
 */
import { supabase } from '../lib/supabase.js';

// ── Permission matrix ─────────────────────────────────────────
export const ORG_PERMS = {
  // Organization
  'org:read':            ['owner','admin','manager','editor','viewer'],
  'org:update':          ['owner','admin'],
  'org:delete':          ['owner'],

  // Members
  'member:read':         ['owner','admin','manager','editor','viewer'],
  'member:invite':       ['owner','admin','manager'],
  'member:update_role':  ['owner','admin'],
  'member:suspend':      ['owner','admin'],
  'member:remove':       ['owner','admin'],

  // Teams
  'team:read':           ['owner','admin','manager','editor','viewer'],
  'team:create':         ['owner','admin','manager'],
  'team:update':         ['owner','admin','manager'],
  'team:delete':         ['owner','admin'],
  'team:manage_members': ['owner','admin','manager'],

  // Invitations
  'invite:read':         ['owner','admin','manager'],
  'invite:revoke':       ['owner','admin','manager'],

  // Activity log
  'activity:read':       ['owner','admin','manager','editor','viewer'],

  // Audit log
  'audit:read':          ['owner','admin'],
};

// Ordered role hierarchy
const _HIERARCHY = ['viewer','editor','manager','admin','owner'];

// ── Cache ─────────────────────────────────────────────────────
// Map<`${orgId}:${userId}`, { role, ts }> — 5 min TTL
const _cache = new Map();
const _TTL   = 5 * 60 * 1000;

function _cacheKey(orgId, userId) {
  return `${orgId}:${userId}`;
}

function _getCached(orgId, userId) {
  const hit = _cache.get(_cacheKey(orgId, userId));
  if (!hit) return null;
  if (Date.now() - hit.ts > _TTL) { _cache.delete(_cacheKey(orgId, userId)); return null; }
  return hit.role;
}

function _setCache(orgId, userId, role) {
  _cache.set(_cacheKey(orgId, userId), { role, ts: Date.now() });
}

export function invalidateOrgRoleCache(orgId, userId) {
  if (userId) _cache.delete(_cacheKey(orgId, userId));
  else for (const k of _cache.keys()) if (k.startsWith(`${orgId}:`)) _cache.delete(k);
}

// ── Core functions ────────────────────────────────────────────
export async function getOrgRole(orgId, userId) {
  const cached = _getCached(orgId, userId);
  if (cached !== null) return cached;

  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) return null;
  _setCache(orgId, userId, data.role);
  return data.role;
}

export async function canDo(orgId, permission, userId) {
  const allowed = ORG_PERMS[permission];
  if (!allowed) return false;

  const role = await getOrgRole(orgId, userId);
  if (!role) return false;

  return allowed.includes(role);
}

export function hasRoleAtLeast(role, minRole) {
  return _HIERARCHY.indexOf(role) >= _HIERARCHY.indexOf(minRole);
}

export async function requireOrgRole(orgId, minRole, userId) {
  const role = await getOrgRole(orgId, userId);
  if (!role || !hasRoleAtLeast(role, minRole)) {
    const err = new Error('Insufficient organization permissions');
    err.code  = 'PERMISSION_DENIED';
    throw err;
  }
  return role;
}
