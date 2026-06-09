// AIFUN AI Portal V2.1 — sheets.js
// Google Sheets API v4 — Data fetching layer
// Tier 1 trong kiến trúc 3 tầng: Sheets → JSON → Static

import { SHEETS_CONFIG, COLUMN_SCHEMA } from './config.js';

// ═══════════════════════════════════════════════════════════════════
// CONNECTION STATE
// ═══════════════════════════════════════════════════════════════════
// 'unconfigured' — chưa điền SPREADSHEET_ID / API_KEY
// 'connecting'   — đang fetch
// 'connected'    — tất cả sheets OK
// 'partial'      — một số sheets fail, còn lại OK
// 'error'        — tất cả sheets fail
// 'offline'      — network không có
let _status      = 'unconfigured';
let _error       = null;
let _lastFetchAt = null;
let _failedSheets = [];
let _refreshTimer = null;

// ─── In-memory cache ─────────────────────────────────────────────
const _cache = new Map(); // sheetName → { data: [], ts: number }

// ═══════════════════════════════════════════════════════════════════
// TYPE COERCION
// Google Sheets trả về mọi thứ là string.
// Hàm này convert về đúng kiểu dựa theo COLUMN_SCHEMA.
// ═══════════════════════════════════════════════════════════════════
function coerce(raw, type) {
  const str = String(raw ?? '').trim();

  // Empty / placeholder → default values
  if (str === '' || str === 'N/A' || str === '-' || str === '—') {
    if (type === 'number')  return 0;
    if (type === 'boolean') return false;
    if (type === 'array')   return [];
    if (type === 'json')    return null;
    return '';
  }

  switch (type) {
    case 'number':
      return isNaN(str) ? 0 : Number(str);

    case 'boolean':
      return str === 'TRUE' || str === 'true' || str === '1' || str === 'yes' || str === 'YES';

    case 'array':
      // JSON array string: ["a","b","c"]
      if (str.startsWith('[')) {
        try { return JSON.parse(str); } catch {}
      }
      // CSV: "a, b, c"  hoặc  "a,b,c"
      return str.split(',').map(s => s.trim()).filter(Boolean);

    case 'json':
      try { return JSON.parse(str); } catch { return null; }

    default:
      // Auto-detect: pure integer hoặc decimal (không phải date dd/mm/yyyy)
      if (str !== '' && !isNaN(str) && !/^\d{1,2}\/\d{1,2}/.test(str)) {
        return Number(str);
      }
      return str;
  }
}

// ─── Convert [[header, ...], [val, ...], ...] → [{key: val}, ...] ──
function rowsToObjects(values, schema = {}) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const [headers, ...rows] = values;
  return rows
    .filter(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((key, i) => {
        if (!key || !String(key).trim()) return;
        obj[String(key).trim()] = coerce(row[i], schema[String(key).trim()]);
      });
      return obj;
    });
}

// ═══════════════════════════════════════════════════════════════════
// FETCH — một sheet với timeout
// ═══════════════════════════════════════════════════════════════════
async function fetchSheetRaw(sheetName) {
  const { SPREADSHEET_ID, API_KEY, FETCH_TIMEOUT_MS } = SHEETS_CONFIG;

  const range = encodeURIComponent(`${sheetName}!A1:ZZ`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errMsg = body?.error?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const json = await res.json();
    return json.values || [];

  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timeout sau ${FETCH_TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Fetch một sheet (có cache) ───────────────────────────────────
async function fetchSheet(sheetName, schema = {}) {
  const now    = Date.now();
  const cached = _cache.get(sheetName);

  if (cached && now - cached.ts < SHEETS_CONFIG.CACHE_TTL_MS) {
    console.log(`[Sheets] Cache hit: ${sheetName} (${Math.round((SHEETS_CONFIG.CACHE_TTL_MS - (now - cached.ts)) / 1000)}s còn lại)`);
    return cached.data;
  }

  const values = await fetchSheetRaw(sheetName);
  const data   = rowsToObjects(values, schema);
  _cache.set(sheetName, { data, ts: now });

  console.log(`[Sheets] Fetched "${sheetName}": ${data.length} rows`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: fetchAllFromSheets()
// Fetch tất cả 5 sheets song song với Promise.allSettled
// Trả về object { prompts, skills, sops, projects, workflows, _source, ... }
// Throw nếu KHÔNG CÓ sheet nào thành công
// ═══════════════════════════════════════════════════════════════════
export async function fetchAllFromSheets() {
  const { SPREADSHEET_ID, API_KEY, SHEET_NAMES } = SHEETS_CONFIG;

  if (!SPREADSHEET_ID || !API_KEY) {
    _status = 'unconfigured';
    throw new Error('Chưa cấu hình SPREADSHEET_ID và API_KEY trong config.js');
  }

  _status = 'connecting';

  const [rPrompts, rSkills, rSops, rProjects, rWorkflows] = await Promise.allSettled([
    fetchSheet(SHEET_NAMES.prompts,   COLUMN_SCHEMA.PROMPTS),
    fetchSheet(SHEET_NAMES.skills,    COLUMN_SCHEMA.SKILLS),
    fetchSheet(SHEET_NAMES.sops,      COLUMN_SCHEMA.SOPS),
    fetchSheet(SHEET_NAMES.projects,  COLUMN_SCHEMA.PROJECTS),
    fetchSheet(SHEET_NAMES.workflows, COLUMN_SCHEMA.WORKFLOWS),
  ]);

  const allResults = [rPrompts, rSkills, rSops, rProjects, rWorkflows];
  const sheetKeys  = ['prompts', 'skills', 'sops', 'projects', 'workflows'];

  _failedSheets = allResults
    .map((r, i) => r.status === 'rejected' ? `${sheetKeys[i]} (${r.reason?.message})` : null)
    .filter(Boolean);

  const succeeded = allResults.filter(r => r.status === 'fulfilled' && r.value?.length > 0);

  if (succeeded.length === 0) {
    _status = 'error';
    _error  = allResults.find(r => r.status === 'rejected')?.reason?.message
              || 'Tất cả sheets đều thất bại';
    throw new Error(_error);
  }

  _status      = _failedSheets.length > 0 ? 'partial' : 'connected';
  _error       = _failedSheets.length > 0 ? `Một số sheets lỗi: ${_failedSheets.join(', ')}` : null;
  _lastFetchAt = new Date();

  if (_failedSheets.length > 0) {
    console.warn('[Sheets] Partial load. Lỗi:', _failedSheets);
  } else {
    console.info('[Sheets] ✅ Kết nối thành công:', sheetKeys.join(', '));
  }

  const get = (result) =>
    result.status === 'fulfilled' && result.value?.length > 0 ? result.value : null;

  return {
    prompts:    get(rPrompts),
    skills:     get(rSkills),
    sops:       get(rSops),
    projects:   get(rProjects),
    workflows:  get(rWorkflows),
    _source:    'sheets',
    _partial:   _failedSheets.length > 0,
    _fetchedAt: _lastFetchAt,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: getSheetsStatus()
// Trả về trạng thái kết nối hiện tại để hiển thị trên UI
// ═══════════════════════════════════════════════════════════════════
export function getSheetsStatus() {
  const { SPREADSHEET_ID, API_KEY } = SHEETS_CONFIG;
  return {
    status:       _status,                // string
    error:        _error,                 // string | null
    configured:   !!(SPREADSHEET_ID && API_KEY),
    failedSheets: [..._failedSheets],
    cachedSheets: [..._cache.keys()],
    lastFetchAt:  _lastFetchAt ? _lastFetchAt.toLocaleTimeString('vi-VN') : null,
    cacheCount:   _cache.size,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: invalidateSheetsCache(sheetName?)
// Xóa cache để force fetch mới
// ═══════════════════════════════════════════════════════════════════
export function invalidateSheetsCache(sheetName = null) {
  if (sheetName) {
    _cache.delete(sheetName);
    console.log(`[Sheets] Cache cleared: ${sheetName}`);
  } else {
    _cache.clear();
    console.log('[Sheets] Cache cleared: all sheets');
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: startAutoRefresh(intervalMs, onRefresh)
// Tự động refresh data theo chu kỳ (min 1 phút)
// onRefresh(data) được gọi sau mỗi lần refresh thành công
// ═══════════════════════════════════════════════════════════════════
export function startAutoRefresh(intervalMs, onRefresh) {
  stopAutoRefresh();
  if (!intervalMs || intervalMs < 60_000) return;

  _refreshTimer = setInterval(async () => {
    try {
      invalidateSheetsCache();
      const data = await fetchAllFromSheets();
      console.log('[Sheets] Auto-refreshed:', new Date().toLocaleTimeString('vi-VN'));
      if (typeof onRefresh === 'function') onRefresh(data);
    } catch (err) {
      console.warn('[Sheets] Auto-refresh failed:', err.message);
    }
  }, intervalMs);

  console.log(`[Sheets] Auto-refresh: mỗi ${intervalMs / 60_000} phút`);
}

export function stopAutoRefresh() {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: fetchGoogleSheetsData(sheetName, schema?)
// Hàm generic — fetch bất kỳ sheet nào theo tên + schema tùy chọn
// Bỏ qua cache nếu forceRefresh = true
// ═══════════════════════════════════════════════════════════════════
export async function fetchGoogleSheetsData(sheetName, schema = {}, forceRefresh = false) {
  const { SPREADSHEET_ID, API_KEY } = SHEETS_CONFIG;
  if (!SPREADSHEET_ID || !API_KEY) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID và API_KEY');
  }
  if (forceRefresh) invalidateSheetsCache(sheetName);
  return fetchSheet(sheetName, schema);
}

// ═══════════════════════════════════════════════════════════════════
// INDIVIDUAL LOAD FUNCTIONS — mỗi hàm load 1 sheet cụ thể
// Tự động dùng đúng COLUMN_SCHEMA và SHEET_NAMES từ config
// ═══════════════════════════════════════════════════════════════════
export async function loadPromptsFromSheet(forceRefresh = false) {
  if (forceRefresh) invalidateSheetsCache(SHEETS_CONFIG.SHEET_NAMES.prompts);
  const data = await fetchSheet(SHEETS_CONFIG.SHEET_NAMES.prompts, COLUMN_SCHEMA.PROMPTS);
  console.log(`[Sheets] loadPromptsFromSheet: ${data.length} prompts`);
  return data;
}

export async function loadSkillsFromSheet(forceRefresh = false) {
  if (forceRefresh) invalidateSheetsCache(SHEETS_CONFIG.SHEET_NAMES.skills);
  const data = await fetchSheet(SHEETS_CONFIG.SHEET_NAMES.skills, COLUMN_SCHEMA.SKILLS);
  console.log(`[Sheets] loadSkillsFromSheet: ${data.length} skills`);
  return data;
}

export async function loadSopsFromSheet(forceRefresh = false) {
  if (forceRefresh) invalidateSheetsCache(SHEETS_CONFIG.SHEET_NAMES.sops);
  const data = await fetchSheet(SHEETS_CONFIG.SHEET_NAMES.sops, COLUMN_SCHEMA.SOPS);
  console.log(`[Sheets] loadSopsFromSheet: ${data.length} SOPs`);
  return data;
}

export async function loadProjectsFromSheet(forceRefresh = false) {
  if (forceRefresh) invalidateSheetsCache(SHEETS_CONFIG.SHEET_NAMES.projects);
  const data = await fetchSheet(SHEETS_CONFIG.SHEET_NAMES.projects, COLUMN_SCHEMA.PROJECTS);
  console.log(`[Sheets] loadProjectsFromSheet: ${data.length} projects`);
  return data;
}

export async function loadWorkflowsFromSheet(forceRefresh = false) {
  if (forceRefresh) invalidateSheetsCache(SHEETS_CONFIG.SHEET_NAMES.workflows);
  const data = await fetchSheet(SHEETS_CONFIG.SHEET_NAMES.workflows, COLUMN_SCHEMA.WORKFLOWS);
  console.log(`[Sheets] loadWorkflowsFromSheet: ${data.length} workflows`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: testConnection()
// Kiểm tra kết nối bằng cách fetch metadata spreadsheet (nhẹ hơn fetch data)
// Trả về { ok, title, sheetTabs, error }
// ═══════════════════════════════════════════════════════════════════
export async function testConnection() {
  const { SPREADSHEET_ID, API_KEY, FETCH_TIMEOUT_MS } = SHEETS_CONFIG;

  if (!SPREADSHEET_ID || !API_KEY) {
    return {
      ok:    false,
      error: 'Chưa nhập Spreadsheet ID hoặc API Key',
      title: null,
      sheetTabs: [],
    };
  }

  const url  = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
             + `?key=${API_KEY}&fields=properties.title,sheets.properties.title`;
  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = body?.error?.message || msg;
        // Thông báo lỗi thân thiện hơn
        if (res.status === 403) msg = 'API Key không hợp lệ hoặc chưa bật Sheets API';
        if (res.status === 404) msg = 'Spreadsheet ID không tồn tại hoặc chưa được chia sẻ';
      } catch {}
      return { ok: false, error: msg, title: null, sheetTabs: [] };
    }

    const json      = await res.json();
    const title     = json.properties?.title || 'Không có tên';
    const sheetTabs = (json.sheets || []).map(s => s.properties?.title).filter(Boolean);

    _status = 'connected';
    _error  = null;

    return { ok: true, title, sheetTabs, error: null };

  } catch (err) {
    const msg = err.name === 'AbortError'
      ? `Timeout sau ${FETCH_TIMEOUT_MS / 1000}s — kiểm tra mạng`
      : err.message;
    return { ok: false, error: msg, title: null, sheetTabs: [] };
  } finally {
    clearTimeout(timeout);
  }
}
