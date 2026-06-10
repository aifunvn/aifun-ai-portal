// AIFUN AI Portal V2.1 — config.js
// ═══════════════════════════════════════════════════════════════════
// HƯỚNG DẪN KẾT NỐI GOOGLE SHEETS (5 bước):
//
//  Bước 1 — Tạo Spreadsheet
//    → drive.google.com → Mới → Google Trang tính
//    → Đặt tên: "AIFUN AI Portal Data"
//    → Tạo 5 tab: PROMPTS | SKILLS | SOPS | PROJECTS | WORKFLOWS
//
//  Bước 2 — Lấy Spreadsheet ID
//    URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
//    Copy chuỗi dài giữa /d/ và /edit → dán vào SPREADSHEET_ID
//
//  Bước 3 — Tạo API Key
//    → console.cloud.google.com → Chọn hoặc tạo project
//    → Library → tìm "Google Sheets API" → Enable
//    → Credentials → Create Credentials → API Key
//    → (Khuyến nghị) Restrict key: HTTP Referrers → thêm domain bạn
//    → Dán vào API_KEY bên dưới
//
//  Bước 4 — Chia sẻ Spreadsheet (BẮT BUỘC cho API Key)
//    → Share → Change to Anyone with the link → Viewer → Done
//
//  Bước 5 — Thêm dữ liệu theo đúng COLUMN_SCHEMA bên dưới
//    Dòng đầu tiên của mỗi tab = tên cột (header row)
//    Từ dòng 2 trở đi = dữ liệu thực
// ═══════════════════════════════════════════════════════════════════

export const SHEETS_CONFIG = {

  // ─── AIFUN DATA CENTER ──────────────────────────────────────────
  // Spreadsheet: AIFUN DATA CENTER
  // URL: https://docs.google.com/spreadsheets/d/1hsD6pEqWmF7Z46SQrumip-wslTCOU1Jnb4f21hyuTyU
  SPREADSHEET_ID: '1hsD6pEqWmF7Z46SQrumip-wslTCOU1Jnb4f21hyuTyU',
  API_KEY: 'AIzaSyDq5zGOLWQroCOeVKFrUmS5ufZ8sy008Uc',
  // ────────────────────────────────────────────────────────────────

  // Tên tab trong Spreadsheet — phải khớp chính xác (case-sensitive)
  SHEET_NAMES: {
    prompts:   'PROMPTS',
    skills:    'SKILLS',
    sops:      'SOPS',
    projects:  'PROJECTS',
    workflows: 'WORKFLOWS',
  },

  // Google Apps Script Web App URL — dùng để GHI dữ liệu vào Sheets (append row)
  // Deploy script tại: script.google.com → New Project → dán code Apps Script → Deploy → Web App
  // Xem hướng dẫn trong README hoặc Sheets Panel
  APPS_SCRIPT_URL:  '',              // ← Điền URL Apps Script sau khi deploy (tuỳ chọn)

  CACHE_TTL_MS:     5 * 60 * 1000,   // Cache 5 phút — không fetch lại quá nhiều
  FETCH_TIMEOUT_MS: 8000,             // Timeout 8s → fallback về JSON
  AUTO_REFRESH_MS:  0,                // 0 = tắt. Bật: 5 * 60 * 1000 (5 phút)
};

// ═══════════════════════════════════════════════════════════════════
// COLUMN SCHEMA — kiểu dữ liệu cho từng cột khi đọc từ Sheets
// (Google Sheets trả về tất cả dưới dạng string — cần coerce đúng kiểu)
//
//  'number'  → parseInt / parseFloat
//  'boolean' → TRUE/FALSE string → true/false
//  'array'   → "a,b,c" hoặc '["a","b"]' → ['a','b','c']
//  'json'    → JSON string → parsed object/array
//  undefined → auto-detect (số thuần thì thành number, còn lại string)
// ═══════════════════════════════════════════════════════════════════
export const COLUMN_SCHEMA = {
  PROMPTS: {
    uses:   'number',
    rating: 'number',
    tags:   'array',
  },
  SKILLS: {
    uses:    'number',
    rating:  'number',
    tools:   'array',
    outputs: 'array',
    prompts: 'array',
  },
  SOPS: {
    steps: 'array',
    tools: 'array',
  },
  PROJECTS: {
    progress: 'number',
    team:     'array',
    tasks:    'json',
  },
  WORKFLOWS: {
    active: 'boolean',
    tags:   'array',
  },
};

// ═══════════════════════════════════════════════════════════════════
// CẤU TRÚC CỘT MẪU — copy vào dòng đầu tiên của mỗi tab
// ═══════════════════════════════════════════════════════════════════
//
// Tab PROMPTS (dòng 1 — header):
//   id | title | category | tool | content | tags | uses | rating
//
//   Ví dụ dữ liệu (dòng 2):
//   p001 | Viết email marketing | marketing | Claude | [nội dung prompt] | email,marketing | 342 | 5
//
// ───────────────────────────────────────────────────────────────────
// Tab SKILLS (dòng 1 — header):
//   id | name | category | icon | gradient | desc | uses | time | rating | tools | outputs | status
//
//   Ví dụ:
//   sop-builder | SOP Builder | Operations | 📋 | linear-gradient(135deg,#1e40af,#3b82f6) | [mô tả] | 342 | ~5 phút | 5 | Claude,Google Docs | SOP Document,Checklist | active
//
// ───────────────────────────────────────────────────────────────────
// Tab SOPS (dòng 1 — header):
//   id | name | dept | status | updated | owner | frequency | duration | kpi
//
//   Ví dụ:
//   sop-m01 | Lập kế hoạch content tháng | Marketing | active | 01/06/2026 | Marketing Lead | Hàng tháng | 2h | Content Calendar
//
// ───────────────────────────────────────────────────────────────────
// Tab PROJECTS (dòng 1 — header):
//   id | name | description | color | progress | status | statusLabel | deadline | updatedAt | team | priority
//
//   Ví dụ:
//   proj-aifun-os | AIFUN OS | AI Operating System | blue | 80 | inprogress | Đang làm | 30/06/2026 | 09/06/2026 | DTC,NV,TT | critical
//
// ───────────────────────────────────────────────────────────────────
// Tab WORKFLOWS (dòng 1 — header):
//   id | name | desc | icon | iconBg | tools | runs | saved | active | tags
//
//   Ví dụ:
//   auto-01 | Email Nurturing Sequence | [mô tả] | 📧 | #eff6ff | Make · Gmail | 1.245 lần/tháng | 48h | TRUE | Gmail,Make,CRM

// ═══════════════════════════════════════════════════════════════════
// GOOGLE_SHEETS_CONFIG — alias rõ ràng với sheetId, apiKey, ranges
// Đây là object chính được dùng trong V2.1 UI (Sheets Panel)
// Đồng bộ 2 chiều với SHEETS_CONFIG phía trên
// ═══════════════════════════════════════════════════════════════════
export const GOOGLE_SHEETS_CONFIG = {
  // Điền vào đây HOẶC qua giao diện Sheets Panel trong ứng dụng
  sheetId: SHEETS_CONFIG.SPREADSHEET_ID,
  apiKey:  SHEETS_CONFIG.API_KEY,

  // Range cho từng bảng (tab!startCell:endCell)
  ranges: {
    prompts:   `${SHEETS_CONFIG.SHEET_NAMES.prompts}!A1:ZZ`,
    skills:    `${SHEETS_CONFIG.SHEET_NAMES.skills}!A1:ZZ`,
    sops:      `${SHEETS_CONFIG.SHEET_NAMES.sops}!A1:ZZ`,
    projects:  `${SHEETS_CONFIG.SHEET_NAMES.projects}!A1:ZZ`,
    workflows: `${SHEETS_CONFIG.SHEET_NAMES.workflows}!A1:ZZ`,
  },
};

// ═══════════════════════════════════════════════════════════════════
// RUNTIME CONFIG UPDATE
// Dùng khi người dùng nhập sheetId/apiKey qua UI → cập nhật ngay
// Tự động lưu vào localStorage để nhớ qua các lần reload
// ═══════════════════════════════════════════════════════════════════
export function updateSheetsConfig(sheetId, apiKey) {
  // Cập nhật cả hai object để đồng bộ
  SHEETS_CONFIG.SPREADSHEET_ID = String(sheetId || '').trim();
  SHEETS_CONFIG.API_KEY         = String(apiKey  || '').trim();
  GOOGLE_SHEETS_CONFIG.sheetId  = SHEETS_CONFIG.SPREADSHEET_ID;
  GOOGLE_SHEETS_CONFIG.apiKey   = SHEETS_CONFIG.API_KEY;

  // Cập nhật ranges
  const n = SHEETS_CONFIG.SHEET_NAMES;
  GOOGLE_SHEETS_CONFIG.ranges = {
    prompts:   `${n.prompts}!A1:ZZ`,
    skills:    `${n.skills}!A1:ZZ`,
    sops:      `${n.sops}!A1:ZZ`,
    projects:  `${n.projects}!A1:ZZ`,
    workflows: `${n.workflows}!A1:ZZ`,
  };

  // Lưu localStorage
  try {
    localStorage.setItem('aifun-sheets-config', JSON.stringify({
      sheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      apiKey:  SHEETS_CONFIG.API_KEY,
    }));
  } catch {}

  console.log('[Config] Sheets config updated:', {
    sheetId: SHEETS_CONFIG.SPREADSHEET_ID ? '***set***' : '(empty)',
    apiKey:  SHEETS_CONFIG.API_KEY         ? '***set***' : '(empty)',
  });
}

// ═══════════════════════════════════════════════════════════════════
// LOAD CONFIG FROM LOCALSTORAGE
// Gọi lúc khởi động app để khôi phục config đã lưu
// ═══════════════════════════════════════════════════════════════════
export function loadSheetsConfigFromStorage() {
  try {
    const saved = localStorage.getItem('aifun-sheets-config');
    if (!saved) return false;
    const { sheetId, apiKey } = JSON.parse(saved);
    if (sheetId || apiKey) {
      updateSheetsConfig(sheetId, apiKey);
      console.log('[Config] Đã khôi phục Sheets config từ localStorage');
      return true;
    }
  } catch {}
  return false;
}
