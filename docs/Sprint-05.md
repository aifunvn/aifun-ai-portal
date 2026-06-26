# Sprint 5 — AI Builder Engine

**Branch:** `develop-v4`
**Completed:** 2026-06-26

---

## Objective

Build the first working AI Builder system on top of the Dashboard and Workspace Engine established in Sprints 1–4. Introduce a provider abstraction layer so Claude, GPT, Gemini, and OpenRouter can be swapped in without touching builder or page code.

---

## Architecture

### Provider Abstraction

```
Form Data
    ↓
builder.buildPrompt(formData)        — constructs meta-prompt
    ↓
runProvider(metaPrompt, options)     — provider-service.js
    ↓
PROVIDERS[key].run(...)              — mock | claude | gpt | gemini
    ↓
{ content, tokens, provider }        — normalised response
    ↓
builder-output.js renders result
```

All providers implement the same interface: `run(metaPrompt, options) → { content, tokens, provider }`. Swapping providers in Sprint 6 requires only adding an entry to `PROVIDERS` in `provider-service.js` — no changes to builders or UI code.

### Builder Definition

Each builder is a plain object with:

| Key | Type | Purpose |
|---|---|---|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `description` | string | One-line description |
| `category` | string | Label tag on card |
| `iconSvg` | string | Inline SVG for card and detail header |
| `fields` | Field[] | Form field definitions |
| `buildPrompt(data)` | function | Constructs the meta-prompt sent to the provider |
| `buildTitle(data)` | function | Generates the document title for save |

### Field Types

| type | Renders as |
|---|---|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` with configurable `rows` |
| `select` | `<select>` with hard-coded `options[]` |

Required fields validated before generation. `maxLength` enforced client-side. First invalid field receives focus automatically.

---

## Files Created

| File | Purpose |
|---|---|
| `src/builders/index.js` | Builder registry — import all builders, expose `BUILDERS[]` and `getBuilder(id)` |
| `src/builders/prompt-builder.js` | Prompt Builder definition: 5 fields, `buildPrompt`, `buildTitle` |
| `src/services/provider-service.js` | Provider abstraction with mock + Claude stub; exports `runProvider()` and `listProviders()` |
| `src/services/builder-service.js` | `generateOutput(builder, formData)` and `saveOutput(builder, formData, output)` |
| `src/components/builder-card.js` | Clickable builder card for the Builders page grid |
| `src/components/builder-form.js` | Dynamic form renderer; exports `render`, `initForm`, `validate`, `getData` |
| `src/components/builder-output.js` | Output panel; states: empty / loading / ready / error; exports `render` and `initOutput` |
| `src/pages/builders.js` | Full builders page — grid view + detail view with internal state machine |
| `styles/builders.css` | All builder-specific styles: cards, form fields, buttons, output panel, spinner, responsive |

## Files Modified

| File | Change |
|---|---|
| `src/app/app.js` | Import `initBuilders`; pass as `initFn` to `mountPage('/builders', ...)` |
| `v4.html` | Add `<link rel="stylesheet" href="/styles/builders.css">` |

---

## Prompt Builder

**Input fields:**

| Field | Required | Type | Max |
|---|---|---|---|
| Vai trò | Yes | text | 200 chars |
| Mục tiêu cần đạt | Yes | text | 300 chars |
| Ngữ cảnh | No | textarea (4 rows) | 1000 chars |
| Ràng buộc | No | textarea (3 rows) | 500 chars |
| Định dạng output | Yes | select | — |

**Output format options:** Đoạn văn / Bullet points / Có đánh số / Bảng / Markdown

**`buildPrompt(data)` output example:**
```
Hãy tạo một prompt AI chuyên nghiệp và chi tiết dựa trên thông tin sau:

Vai trò: Chuyên gia marketing B2B với 10 năm kinh nghiệm
Mục tiêu: Viết email cold outreach cho khách hàng doanh nghiệp SME
Ngữ cảnh: Sản phẩm là AIFUN OS, giá 2.5 triệu/tháng
Ràng buộc: Không quá 200 từ, giọng văn thân thiện
Định dạng output mong muốn: Đoạn văn

Tạo một prompt hoàn chỉnh, chuyên nghiệp và hiệu quả bằng tiếng Việt.
Prompt phải đủ chi tiết để Claude hoặc GPT có thể thực hiện chính xác.
```

---

## Mock Provider

The mock provider (`PROVIDERS.mock`) simulates AI generation without a real API call:

- **Latency:** 900 ms simulated delay
- **Output:** Structured Vietnamese prompt built from `options.formData`
- **Token estimate:** `Math.ceil(charCount / 4)` for prompt and completion

The mock constructs a well-formatted prompt with sections (Nhiệm vụ, Ngữ cảnh, Ràng buộc, Yêu cầu Output) so the UI demo is meaningful before Claude is wired in Sprint 6.

---

## Builders Page — State Machine

The page (`src/pages/builders.js`) manages two views using internal module state — no separate routes:

```
init()
  └─ showGrid()
       └─ card.click → showBuilder(id)
              ├─ renderForm(builder)
              ├─ initForm(builder)        ← clears errors on input
              └─ #bld-generate.click
                   ├─ validate(builder)  ← shows inline errors, focuses first invalid
                   ├─ getData(builder)
                   ├─ generateOutput()
                   └─ updateOutput(state)
                        └─ initOutput()  ← wires Copy + Save buttons
```

Back button returns to grid. Module-level `_unsub` slot reserved for workspace reactivity in Sprint 6.

---

## Browser Verification (Sprint 5)

| Check | Result |
|---|---|
| Title: "AI Builders — AIFUN Workspace \| AIFUN OS" | ✓ |
| Builder card renders with icon, category tag, name, description | ✓ |
| Clicking card opens detail view (5 form fields, back button, generate button) | ✓ |
| Empty submit shows validation errors on required fields | ✓ "Vai trò là bắt buộc", "Mục tiêu cần đạt là bắt buộc" |
| Filled form generates output in ~900ms | ✓ |
| Output shows structured prompt with correct sections | ✓ |
| Token badge shows accurate count | ✓ 251 tokens |
| Copy and Save buttons present | ✓ |
| No console errors | ✓ |

---

## Known Limitations (deferred to Sprint 6)

| Issue | Sprint |
|---|---|
| No real Claude API call — mock returns structured output from `formData` | Sprint 6 |
| Save is mock only — no Google Drive / Sheets persistence | Sprint 6 |
| Only one builder (Prompt Builder) — SOP, Content, Email etc. added in Sprint 6+ | Sprint 6 |
| No provider selector in UI — always uses mock | Sprint 6 |
| `saveOutput` in `builder-output.js` doesn't call `builder-service.saveOutput` yet — mock delay only | Sprint 6 |

---

## Next: Sprint 6

- Wire GAS Web App for real Claude API calls via `PROVIDERS.claude`
- Implement real `saveOutput` → GAS → Google Drive + Sheets log
- Add remaining builders: SOP Builder, Content Factory, Email Automation
- Add Documents page listing saved outputs
