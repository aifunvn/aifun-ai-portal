/**
 * Reactive store for the current organization.
 * Subscribers receive the full org object on every change.
 */
import { listUserOrgs } from '../services/org-service.js';
import { getOrgRole }   from '../services/permission-engine.js';
import { safeStorage }  from '../utils/safe-storage.js';

const ORG_KEY = 'aifun_org_id';

let _org    = null;   // current org object (includes my_role)
let _orgs   = [];     // all orgs user belongs to
const _subs = new Set();

function _notify() { _subs.forEach(fn => fn(_org)); }

export const orgStore = {
  subscribe(fn) {
    _subs.add(fn);
    fn(_org);
    return () => _subs.delete(fn);
  },

  getOrg()  { return _org; },
  getOrgs() { return _orgs; },

  async load(userId) {
    if (!userId) return null;
    _orgs = await listUserOrgs(userId);
    const lastId = safeStorage.getItem(ORG_KEY);
    _org = _orgs.find(o => o.id === lastId) ?? _orgs[0] ?? null;
    _notify();
    return _org;
  },

  async switchOrg(orgId, userId) {
    const found = _orgs.find(o => o.id === orgId);
    if (!found) return;
    found.my_role = await getOrgRole(orgId, userId);
    _org = found;
    safeStorage.setItem(ORG_KEY, orgId);
    _notify();
  },

  setOrg(org) {
    _org = org;
    if (org) safeStorage.setItem(ORG_KEY, org.id);
    _notify();
  },

  clear() {
    _org  = null;
    _orgs = [];
    safeStorage.removeItem(ORG_KEY);
    _notify();
  },
};
