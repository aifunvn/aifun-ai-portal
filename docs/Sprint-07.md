# Sprint 7 — Schema-driven Builder Engine

**Branch:** `develop-v4`
**Completed:** 2026-06-26

---

## Objective

Replace the hardcoded Sprint-5 builder system with a JSON schema-driven engine where builders are defined as declarative data, not code. Adding a new builder now requires only a JSON file — no JS changes.

---

## Architecture

### Before (Sprint 5)
```
src/builders/prompt-builder.js   ← JS object with methods
src/builders/index.js            ← hardcoded import list
builders.js                      ← directly uses builder.buildPrompt(), builder.buildTitle()
```

### After (Sprint 7)
```
src/builders/schemas/*.json      ← declarative data (id, fields, prompt_template, …)
src/builders/registry.js         ← fetch() loader + in-memory cache
src/services/builder-registry-service.js  ← filter, group, createAdapter()
src/services/prompt-template-service.js   ← {{variable}} template engine
src/services/validation-service.js        ← rule-based form validation
src/components/field-renderer.js          ← renders one field by type
src/components/form-renderer.js           ← renders full form; get/init/showErrors
src/components/builder-launcher.js        ← detail view + generate orchestration
src/pages/builders.js            ← thin shell: load schemas → grid → launcher
```

### Schema → Runtime Flow

```
builder-registry-service.createAdapter(schema)
    ↓
{ buildPrompt(data), buildTitle(data), id, name }   ← implements runtime-service interface
    ↓
runtime-service.runBuilder(adapter, formData)        ← unchanged from Sprint 6
    ↓
prompt-template-service.buildPrompt(schema, data)
    │  replaces {{field_id}}, {{workspace_name}}, {{builder_name}}, {{user_name}}
    ↓
provider-service.runProvider(prompt, options)        ← mock now, Claude later
    ↓
document-service.saveDocument(doc)                   ← in-memory, workspace-scoped
    ↓
chat-output renders result + "Xem tai lieu" button
```

The adapter pattern means `runtime-service.js` and `document-service.js` are **unchanged** — the new schema engine plugs in through the existing interface.

---

## Builder Schema Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (kebab-case) |
| `name` | string | Display name |
| `description` | string | One-line card description |
| `category` | string | Group label shown on card badge |
| `icon` | string | Icon name: `sparkle`, `document`, `video` |
| `version` | string | Semver (`1.0.0`) |
| `status` | string | `active`, `draft`, `disabled` |
| `provider` | string | Default provider key (`mock`, `claude`) |
| `plan` | string | Minimum plan: `free`, `pro`, `business`, `enterprise` |
| `fields` | Field[] | Form field definitions |
| `prompt_template` | string | Mustache-style template with `{{variable}}` |
| `output_type` | string | `text` or `document` |

### Field Definition

```json
{
  "id": "process_name",
  "label": "Ten quy trinh",
  "type": "text",
  "required": true,
  "placeholder": "Vi du: Quy trinh onboard nhan vien moi",
  "rows": 3,
  "options": ["A", "B", "C"],
  "checkboxLabel": "...",
  "validation": { "minLength": 2, "maxLength": 150, "min": 0, "max": 100 }
}
```

### Supported Field Types

| type | Renders as |
|---|---|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` with configurable `rows` |
| `select` | `<select>` with `-- Chon --` placeholder + `options[]` |
| `checkbox` | `<input type="checkbox">` with `checkboxLabel` |
| `number` | `<input type="number">` with `min`/`max` |

### Supported Validation Rules

| Rule | Applies to | Behaviour |
|---|---|---|
| `required` | all | Error if empty after trim |
| `minLength` | text, textarea | Error if `length < minLength` |
| `maxLength` | text, textarea | Error if `length > maxLength` (also sets HTML `maxlength`) |
| `min` | number | Error if `value < min` |
| `max` | number | Error if `value > max` |

### Prompt Template Variables

| Variable | Source |
|---|---|
| `{{workspace_name}}` | `workspaceStore.getWorkspace().name` |
| `{{builder_name}}` | `schema.name` |
| `{{user_name}}` | `userStore.getUser().email` |
| `{{field_id}}` | `formData[field.id]` for every field |

Unresolved placeholders are silently removed before the prompt is sent.

---

## Files Created

| File | Purpose |
|---|---|
| `src/builders/schemas/prompt-builder.json` | Prompt Builder — 5 fields, text output |
| `src/builders/schemas/sop-builder.json` | SOP Builder — 6 fields, document output |
| `src/builders/schemas/youtube-builder.json` | YouTube Script Builder — 6 fields, document output |
| `src/builders/registry.js` | `loadAll()` + `loadById()` with in-memory cache; `invalidateCache()` |
| `src/services/builder-registry-service.js` | `getBuilders()`, `getBuildersByCategory()`, `getBuilder()`, `createAdapter()` |
| `src/services/prompt-template-service.js` | `buildPrompt(schema, data)`, `buildTitle(schema, data)` |
| `src/services/validation-service.js` | `validate(schema, formData)` → `{ valid, errors }` |
| `src/components/field-renderer.js` | `renderField(field)` — all 5 field types |
| `src/components/form-renderer.js` | `renderForm`, `getFormData`, `initForm`, `showErrors` |
| `src/components/builder-launcher.js` | `render(schema)`, `initLauncher(schema, {onBack})`, `getIcon(name)` |

## Files Modified

| File | Change |
|---|---|
| `src/pages/builders.js` | Full rewrite — async schema loading, schema card renderer, launcher wiring |
| `src/services/provider-service.js` | `mockBuildOutput` made schema-aware: detects SOP/YouTube/Prompt by field keys |
| `styles/builders.css` | Add `.bld-plan-badge`, `.bld-loading`, `.bld-load-error`; flex `.bld-card-meta` |

## Files Unchanged (still present, not yet removed per Rule 3)

| File | Status |
|---|---|
| `src/builders/index.js` | Sprint 5 registry — no longer imported |
| `src/builders/prompt-builder.js` | Sprint 5 definition — no longer imported |
| `src/components/builder-card.js` | Sprint 5 card — no longer imported |
| `src/components/builder-form.js` | Sprint 5 form — no longer imported |
| `src/services/builder-service.js` | Sprint 5 service — no longer imported |

---

## Demo Builders

### Prompt Builder (`prompt-builder.json`)
- **Category:** Nang suat | **Plan:** free
- **Fields:** Vai tro (text), Muc tieu (text), Ngu canh (textarea), Rang buoc (textarea), Dinh dang output (select)
- **Output type:** text

### SOP Builder (`sop-builder.json`)
- **Category:** Van ban | **Plan:** free
- **Fields:** Ten quy trinh (text), Phong ban (text), Muc tieu (textarea), Cac buoc (textarea), Nguoi chiu trach nhiem (text), Tan suat (select)
- **Output type:** document

### YouTube Script Builder (`youtube-builder.json`)
- **Category:** Noi dung | **Plan:** free
- **Fields:** Chu de (text), Doi tuong (text), Thoi luong (select), Phong cach (select), Y chinh (textarea), CTA (text)
- **Output type:** document

---

## Browser Verification

| Check | Result |
|---|---|
| Builders page renders 3 builder cards with correct names, categories, icons | ✓ |
| Each card opens its generated form with correct field types | ✓ Prompt: 5 fields, SOP: 6 fields, YouTube: 6 fields |
| Validation fires on empty required fields | ✓ SOP: 4 errors shown; "Ten quy trinh la bat buoc", etc. |
| SOP Builder generates structured output | ✓ 309 tokens, SOP format with checklist |
| YouTube Builder generates script structure | ✓ 387 tokens, Hook + sections + CTA + Tags |
| Prompt Builder generates prompt template | ✓ 127 tokens |
| "Sao chep" and "Xem tai lieu" buttons present after generation | ✓ |
| All 3 docs appear in Document Center | ✓ Correct titles, builder names, relative timestamps |
| No console errors | ✓ |
| V2 files (`index.html`, `config.js`, `skill-engine.js`, `skill-forms.js`) unmodified | ✓ |

---

## Known Limitations (deferred)

| Issue | Sprint |
|---|---|
| Old Sprint-5 builder files (`builder-card.js`, `builder-form.js`, `builder-service.js`, `builders/index.js`, `builders/prompt-builder.js`) are dead code — not yet removed | Sprint 8 |
| Schemas loaded via `fetch()` — will fail on `file://` (need a server) | Accepted: GitHub Pages always serves via HTTP |
| `status: "draft"` and `status: "disabled"` builders are filtered out but no admin UI exists to manage them | Sprint 9+ |
| Plan gating (`plan: "pro"`) shows a badge but does not block access | Sprint 9+ |
| Mock provider output is template-based, not real AI | Sprint 8 (Claude via GAS) |

---

## Adding a New Builder

1. Create `src/builders/schemas/{id}.json` with the full schema
2. Add the URL to `SCHEMA_URLS` in `src/builders/registry.js`
3. The builder appears automatically in the grid — no JS changes needed

---

## Next: Sprint 8

- Wire real Claude API through GAS Web App (`PROVIDERS.claude`)
- Clean up dead Sprint-5 builder files (after confirming new engine is stable)
- Add `Email Automation` and `Content Factory` builders as JSON schemas
- Add localStorage persistence bridge for documents (survive page reload)
- Navigate directly to a specific document from the "Xem tai lieu" button
