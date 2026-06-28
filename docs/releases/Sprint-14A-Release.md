# Sprint 14A — Release Handoff Document
**AIFUN OS V4 · develop-v4 → main RC1**

> Ngày bàn giao: 28/06/2026  
> Branch: `develop-v4`  
> Target: `main` (RC1 — Release Candidate 1)  
> Người thực hiện: Diệp Thành Chung + Claude Code (Sonnet 4.6)

---

## 1. Những gì đã hoàn thành

### Sprint 14A.1–14A.2 — Foundation Stabilization (Audit)
- Kiểm tra toàn bộ 73 file nguồn trong `src/`
- Xác nhận không có broken imports trong toàn bộ codebase
- Bootstrap recovery đã ổn định sau các lần rollback (commit `065dbd4`, `eb9a732`)
- Xác nhận safe-storage fallback hoạt động đúng
- Xác nhận Router hash-based với generation counter chống race condition
- Ghi nhận 6 file legacy ở root (không xóa — giữ V2 làm fallback)

### Sprint 14A.3 — Settings Completion
- **Profile Tab** (`src/pages/settings-profile.js` — file mới):
  - Avatar hiển thị initials
  - Display name có thể chỉnh sửa
  - Email read-only với badge "Chỉ đọc"
  - Password change section: inline form
- **Reports Page** (`src/pages/reports.js` — rewrite):
  - Dashboard placeholder với 4 metric cards
  - Roadmap "Analytics Dashboard — Sprint 15"
  - Không còn render shell rỗng
- **`src/services/user-profile-service.js`**: thêm `updateProfile()` export

### Sprint 14A.4 — Production Hardening
- **Profile Tab — UX Polish**:
  - Realtime name validation (xóa lỗi ngay khi gõ hợp lệ)
  - Dirty state: nút "Lưu hồ sơ" chỉ enable khi tên thực sự thay đổi
  - Dirty state reset: sau save hoặc restore về tên gốc → tự disable
  - Realtime password validation: disabled cho đến khi ≥8 ký tự và 2 ô khớp
  - Lỗi mismatch hiển thị inline khi gõ ô confirm
  - Chống double-submit: `_saving` + `_pwdSaving` guards
  - Supabase error → thông báo tiếng Việt thân thiện (không lộ raw error)
  - Avatar + tên cập nhật in-place sau save thành công
  - Chuyển `updateProfile` sang `settings-service.js` (canonical source)
- **Workspace Settings — Dirty State**:
  - Nút "Lưu thay đổi" disabled từ đầu, chỉ enable khi có thay đổi thực sự
  - Input/change listeners trên cả 4 fields
  - Cancel: reset form + re-disable nút
  - Sau save: `_settings` cache cập nhật + re-disable nút
- **Reports Page**: cập nhật roadmap "Sprint 4" → "Sprint 15"

---

## 2. Kiến trúc hiện tại

```
AIFUN OS V4 — Vanilla JS ES6 Module SPA
├── Entry:        v4.html (Bootstrap + CSS links + <script type="module">)
├── Backend:      Supabase (Auth, PostgreSQL, RLS)
├── Legacy DB:    Google Apps Script Web App (GAS) — V2 builders
├── Deploy:       GitHub Pages (static, auto-deploy from main)
├── Domain:       portal.aifun.ai.vn via Cloudflare CNAME
└── Fallback:     index.html (V2 SPA) — giữ đến RC1 ổn định

Bootstrap pipeline:
  v4.html
    → pre-boot localStorage sanity check (try/catch)
    → 2s timeout → recovery UI nếu treo
    → <script type="module" src="/src/app/app.js">
        → supabase.auth.getSession() (với _safeGetSession)
        → router.resolve() → route handler
        → window.__aifunBootReady() → cancel timeout

State management:
  userStore       — user, profile, role, permissions (pub/sub)
  workspaceStore  — workspace list, active (persists to safeStorage)
  permissionStore — derived from userStore.permissions

Data flow:
  Browser → Supabase (RLS-enforced) → stores → pages/components
  Provider calls: Browser → GAS Web App → Claude/OpenAI API
```

---

## 3. Danh sách Module

### Source files (`src/` — 73 files)

| Layer | Files | Trạng thái |
|-------|-------|-----------|
| `app/` | `app.js` | ✅ Entry point, bootstrap orchestrator |
| `router/` | `router.js` | ✅ Hash-based, race-condition safe |
| `auth/` | login, register, forgot-password, reset-password, verify-email | ✅ 5 auth flows |
| `pages/` | dashboard, builders, documents, marketplace, history, **reports**, **settings**, **settings-profile** | ✅ 8 pages |
| `layouts/` | main-layout, sidebar, topbar | ✅ Shell UI |
| `components/` | 24 UI components | ✅ Toast, Modal, Markdown, Chart... |
| `services/` | 22 business logic services | ✅ |
| `stores/` | user-store, workspace-store, permission-store | ✅ |
| `lib/` | supabase.js (v2.44.4 pinned) | ✅ |
| `config/` | auth.js | ✅ |
| `builders/` | registry.js + 8 JSON schemas | ✅ |
| `providers/` | provider-manager, claude-provider, mock-provider | ✅ |
| `runtime/` | index.js (pipeline executor) | ✅ |
| `utils/` | safe-storage.js | ✅ |

### CSS (`styles/` — 13 files)

`tokens.css` · `base.css` · `layout.css` · `sidebar.css` · `topbar.css` · `auth.css` · `dashboard.css` · `builders.css` · `marketplace.css` · `documents.css` · `history.css` · `settings.css` · `markdown.css`

### Legacy files (root — giữ nguyên, không xóa)

| File | Lý do giữ |
|------|-----------|
| `index.html` | V2 SPA — production fallback cho đến sau RC1 ổn định |
| `script.js` | V3 dead code — xử lý Sprint 14B |
| `data.js` | V3 dead code — xử lý Sprint 14B |
| `sheets.js` | V3 dead code — xử lý Sprint 14B |
| `skill-engine.js` | V2 dead code — xử lý Sprint 14B |
| `skill-forms.js` | V2 dead code — xử lý Sprint 14B |

---

## 4. Kết quả Smoke Test

### Automated (chạy trong browser preview)

| Test | Kết quả |
|------|---------|
| Module import — settings.js | ✅ Pass |
| Module import — settings-profile.js | ✅ Pass |
| Module import — reports.js | ✅ Pass |
| Profile render: avatar initials, tên, email | ✅ Pass |
| Save btn disabled khi name = original | ✅ `disabled=true`, `opacity=0.5` |
| Save btn enable khi name thay đổi | ✅ `disabled=false`, `opacity=1` |
| Save btn re-disable khi restore tên gốc | ✅ Pass |
| Pwd form: empty → btn disabled | ✅ Pass |
| Pwd form: < 8 ký tự → btn disabled | ✅ Pass |
| Pwd form: ≥8 ký tự + khớp → btn enabled | ✅ Pass |
| Pwd form: mismatch → disabled + error inline | ✅ Pass |
| Pwd validation: `shortDisabled=true` | ✅ Pass |
| Pwd validation: `matchEnabled=true` | ✅ Pass |
| Reports: Sprint 15 text hiển thị | ✅ Pass |
| Console errors | ✅ Zero |
| Unhandled promise rejections | ✅ Zero |

### Manual (cần Supabase session thật — chưa thực hiện)

| Test | Trạng thái |
|------|-----------|
| Login với email + password | ⏳ Pending |
| Dashboard load sau login | ⏳ Pending |
| Navigate Settings → Workspace tab | ⏳ Pending |
| Sửa tên workspace → Save | ⏳ Pending |
| Navigate Settings → Profile tab | ⏳ Pending |
| Sửa tên → Save → toast success | ⏳ Pending |
| Password change E2E | ⏳ Pending |
| Navigate → Reports | ⏳ Pending |
| Logout → Login lại | ⏳ Pending |
| Mobile viewport 375px | ⏳ Pending |
| Chrome Incognito | ⏳ Pending |
| Edge browser | ⏳ Pending |

---

## 5. Lỗi còn tồn tại

| # | Lỗi | Mức độ | Sprint |
|---|-----|--------|--------|
| 1 | Avatar upload chưa có (chỉ display initials) | Low | 14B |
| 2 | Reports không hiển thị data thật | Low | 15 |
| 3 | Profile tab chưa test E2E với Supabase thật | Medium | Trước merge |
| 4 | Legacy files V3 còn ở root (dead code) | Low | 14B |
| 5 | `PROJECT_STATUS.md` ở root chưa cập nhật | Low | 14B |
| 6 | Không có automated tests (unit/integration) | Medium | 14B |
| 7 | GAS `Code.gs` chưa có version control (clasp) | Medium | 14B |
| 8 | `config.js` chứa secrets trong public repo | High | 14B |

---

## 6. Hạng mục Deferred sang Sprint 14B

### Priority 1 — Cần làm trước khi ship rộng rãi

- [ ] **Secrets migration**: chuyển GAS URL, Spreadsheet ID, Drive ID ra khỏi `config.js` vào environment config không commit
- [ ] **Legacy cleanup**: xóa `script.js`, `data.js`, `sheets.js`, `skill-engine.js`, `skill-forms.js` (sau khi xác nhận không có gì dùng)
- [ ] **GAS version control**: set up `clasp`, pull `Code.gs` vào `gas/Code.gs`
- [ ] **E2E manual test**: full smoke test với Supabase session thật trên tất cả browsers

### Priority 2 — Cải thiện chất lượng

- [ ] **Avatar upload**: tích hợp Supabase Storage để upload ảnh thật
- [ ] **`PROJECT_STATUS.md`**: cập nhật phản ánh V4 RC1
- [ ] **Error boundary**: global error handler ở layout level để không crash toàn app
- [ ] **No-JS fallback**: `<noscript>` block trong `v4.html`

### Priority 3 — Foundation mở rộng

- [ ] **Unit tests**: test bootstrap, router, safe-storage
- [ ] **CI/CD**: GitHub Actions chạy lint + module import check
- [ ] **Onboarding flow**: wizard cho workspace mới sau đăng ký

---

## 7. Checklist Merge develop-v4 → main

Thực hiện **theo thứ tự**, không bỏ bước nào.

### Pre-merge verification

- [ ] `git status` trên `develop-v4` — clean, không có uncommitted changes
- [ ] `git log --oneline develop-v4 ^main` — review tất cả commits sẽ merge
- [ ] Mở `v4.html` trên localhost (port 3000 hoặc 5500), xác nhận không blank page
- [ ] Login thật với Supabase account → Dashboard load
- [ ] Navigate `/settings` → Workspace tab load, data đúng
- [ ] Navigate `/settings` → Profile tab load, tên/email đúng
- [ ] Navigate `/reports` → Placeholder load, không blank
- [ ] Navigate 8 Builders, xác nhận không có navigation freeze
- [ ] Chrome DevTools Console — zero errors
- [ ] Chrome DevTools Network — không có 404 (đặc biệt CSS/JS modules)
- [ ] Mobile viewport 375px — không có horizontal scroll

### Merge thực hiện

```bash
git checkout main
git pull origin main
git merge --no-ff develop-v4 -m "merge: Sprint 14A — Foundation Stabilization RC1"
git tag -a v4.0.0-rc1 -m "AIFUN OS V4 RC1 — Sprint 14A Production Hardening"
git push origin main
git push origin v4.0.0-rc1
```

### Post-merge

- [ ] Verify GitHub Actions deploy thành công (tab Actions trên GitHub)
- [ ] Mở `portal.aifun.ai.vn` — trang V2 (index.html) vẫn load bình thường
- [ ] Mở `portal.aifun.ai.vn/v4.html` — V4 boot không treo
- [ ] Merge `main` back vào `develop-v4`:
  ```bash
  git checkout develop-v4
  git merge main
  git push origin develop-v4
  ```

---

## 8. Checklist Deploy Production

> Production = GitHub Pages auto-deploy từ `main`. Không có build step.

### Trước deploy

- [ ] `config.js` có đúng `gasWebAppUrl`, `spreadsheetId`, `driveFolderId` cho production
- [ ] Supabase project URL và anonKey trong `src/config/auth.js` trỏ đúng production project
- [ ] Cloudflare DNS: CNAME `portal` → `aifunvn.github.io` (kiểm tra không bị cache)

### Sau deploy (5–10 phút sau push to main)

- [ ] `portal.aifun.ai.vn` load — không phải cached version cũ (check `<title>`)
- [ ] `portal.aifun.ai.vn/v4.html` — V4 boot trong 2 giây
- [ ] V4 boot timeout không kích hoạt (không thấy recovery UI)
- [ ] Login thật trên production domain → Dashboard
- [ ] Tạo 1 tài liệu bằng SOP Builder → verify Drive save
- [ ] AI History log xuất hiện
- [ ] GAS execution log — không có unhandled exception (Apps Script Dashboard)

### Rollback plan

Nếu production V4 có sự cố nghiêm trọng:
1. Người dùng hiện tại vẫn dùng `portal.aifun.ai.vn` → `index.html` (V2) — không bị ảnh hưởng
2. Để quay về V2: không cần làm gì, V2 đang chạy song song
3. Để tắt V4 tạm: xóa hoặc redirect `v4.html` khỏi main

---

## 9. Release Notes — AIFUN OS V4.0.0 RC1

**Ngày phát hành:** 28/06/2026  
**Loại:** Release Candidate 1 (không phải stable release)

### Tổng quan

AIFUN OS V4 RC1 là phiên bản Release Candidate đầu tiên của nền tảng AI workspace thế hệ mới. V4 được xây dựng lại hoàn toàn từ đầu với kiến trúc ES6 module, Supabase backend, và hệ thống quyền hạn đầy đủ.

V4 chạy song song với V2 production. `portal.aifun.ai.vn` vẫn phục vụ V2. V4 accessible tại `portal.aifun.ai.vn/v4.html`.

### Tính năng RC1

**Authentication**
- Đăng nhập, đăng ký, quên mật khẩu, reset mật khẩu, xác nhận email
- Session persistence qua Supabase Auth
- Safe-storage fallback cho môi trường blocked localStorage

**Dashboard**
- Tổng quan tài liệu, KPI cards, quick actions
- Recent documents widget
- Activity timeline

**AI Builders (8 builders)**
- SOP Builder, Content Builder, Email Builder
- Sales Script Builder, CRM Builder, Webinar Builder
- YouTube Builder, Prompt Builder
- Permission-gated theo plan (Free: Prompt only; Starter: +SOP; Pro/Business: all)

**Documents**
- Thư viện tài liệu với search, filter, sort, pagination
- Document viewer, metadata, versioning
- Export PDF / DOCX via Google Drive

**Marketplace**
- Browse và install builder extensions
- Installed builders management

**AI History**
- Full log AI requests với status, tokens
- Timeline view

**Settings**
- Workspace tab: display name, mô tả, timezone, ngôn ngữ AI
- Profile tab: tên hiển thị, email read-only, đổi mật khẩu
- Dirty state tracking — nút Save chỉ enable khi có thay đổi thực sự
- Realtime validation cho cả workspace và profile

**Reports**
- Professional placeholder dashboard
- Roadmap tính năng Sprint 15

**Team** *(shell — chưa implement đầy đủ)*

**Billing** *(shell — chưa implement đầy đủ)*

### Kiến trúc

- Vanilla JS ES6 Modules — không framework
- Supabase (PostgreSQL + Auth + RLS)
- Zero npm dependencies (chỉ Supabase CDN, pinned v2.44.4)
- Bootstrap với 2-giây recovery timeout + safe localStorage fallback
- Role-based permission system (owner / admin / editor / viewer)
- Plan-gated features (free / starter / pro / business)

### Known Limitations RC1

- Avatar upload chưa hỗ trợ (initials only)
- Reports không có data thật (placeholder)
- Team và Billing pages chưa implement
- Chưa có automated tests
- GAS chưa có version control (clasp)

---

## 10. Roadmap Sprint 14B

> Mục tiêu: Stabilize RC1, chuẩn bị cho GA (General Availability).

### 14B.1 — Security & Secrets (P0)

- [ ] Migrate secrets khỏi `config.js` (GAS URL, Spreadsheet ID)
- [ ] Audit toàn bộ public repo — không có production secret
- [ ] Documented secret rotation procedure

### 14B.2 — Legacy Cleanup (P1)

- [ ] Xóa `script.js`, `data.js`, `sheets.js` (V3 dead code)
- [ ] Xóa `skill-engine.js`, `skill-forms.js` (V2 dead code)
- [ ] Cập nhật `PROJECT_STATUS.md`
- [ ] Cập nhật `CLAUDE.md` — phản ánh kiến trúc V4 hiện tại

### 14B.3 — GAS Version Control (P1)

- [ ] Set up `clasp` CLI
- [ ] Pull `Code.gs` vào `gas/Code.gs`
- [ ] Tag GAS deployment cùng version với repo

### 14B.4 — Quality & Testing (P2)

- [ ] Unit tests: bootstrap, router, safe-storage (ít nhất 3 tests)
- [ ] GitHub Actions: module import check + lint
- [ ] E2E manual test matrix hoàn chỉnh (Chrome, Firefox, Edge, Mobile)
- [ ] Error boundary ở main-layout level

### 14B.5 — UX Improvements (P2)

- [ ] Avatar upload (Supabase Storage)
- [ ] Onboarding wizard cho workspace mới
- [ ] Dark mode toggle trong topbar (hiện đã có CSS, cần wire UI)
- [ ] Keyboard shortcut hints

### 14B.6 — Team & Billing Shell (P3)

- [ ] Team page: member list, invite, role assignment UI
- [ ] Billing page: plan display, usage meter
- [ ] Không cần payment integration — display only cho RC1

### Definition of Done cho Sprint 14B

Sprint 14B hoàn thành khi:
- [ ] Không có secrets trong public repo
- [ ] Legacy dead code đã xóa
- [ ] GAS có version control
- [ ] Full manual smoke test pass trên Chrome + Mobile
- [ ] Zero console errors trong production

Sau Sprint 14B: đề xuất `develop-v4` → `main` làm **GA (stable)** và retire V2 `index.html`.

---

*Tài liệu này được tạo ngày 28/06/2026 bởi Claude Code (Sonnet 4.6)*  
*Branch: `develop-v4` | Commit cuối: `eff15cd`*
