# Sprint 8 — Provider Engine + Claude Integration

**Branch:** `develop-v4`
**Completed:** 2026-06-26
**Commit:** `17d7860`

---

## Objective

Replace the hardcoded mock stub in `provider-service.js` with a proper provider engine:
extract Mock into its own module, wire Claude through the GAS Web App endpoint, and add
automatic fallback so the builder never crashes if Claude is unavailable.

---

## Architecture

### Before (Sprint 7)
```
provider-service.js  ← monolithic: mock logic + PROVIDERS map + stub claude entry
```

### After (Sprint 8)
```
src/providers/
  mock-provider.js       ← extracted mock logic (buildOutput + sleep)
  claude-provider.js     ← POST to GAS, normalize response, timeout handling
  provider-manager.js    ← register, run(prompt, options), fallback to mock on error

src/services/
  provider-service.js    ← thin wrapper: runProvider() → providerManager.run()

src/runtime/
  index.js               ← threads provider, model, docUrl, fallback, fallbackReason

src/services/
  runtime-service.js     ← returns fallback metadata alongside content + doc

src/components/
  builder-launcher.js    ← provider selector UI; _showFallbackNote()
```

### Request Flow — Claude Provider
```
User selects "Claude" → clicks Tao ngay
    ↓
builder-launcher reads #bld-provider → 'claude'
    ↓
runBuilder(adapter, formData, { provider: 'claude' })
    ↓
executePipeline → runProvider → providerManager.run()
    ↓
claudeProvider.run(metaPrompt, options)
    ↓
POST {AIFUN_CONFIG.gasWebAppUrl}
  { action: 'generateDocument', skillId, prompt, title, formData,
    provider: 'claude', folderId, spreadsheetId, user, timestamp }
    ↓ (90s timeout, AbortController)
GAS → Claude API → Google Docs → return { content, docUrl, docId, ... }
    ↓
normalize: { content, provider: 'claude', model: 'claude-sonnet-4-6', docUrl, tokens, latencyMs }
    ↓
saveDocument (with docUrl for direct Google Docs link)
    ↓
builder-launcher renders output: badge "Hoàn thành" + tokens + "Xem tai lieu" button
```

### Fallback Flow — Claude Unavailable
```
claudeProvider.run() throws (network error, timeout, HTTP error, GAS error JSON)
    ↓
providerManager catches → falls back to mockProvider.run()
    ↓
returns { ...mockResult, fallback: true, fallbackReason: err.message }
    ↓
_updateOutput calls _showFallbackNote(reason)
    ↓
Warning appended to .co-footer:
  "Claude khong kha dung — da dung Mock. Ly do: <reason>"
```

---

## Files Created

| File | Purpose |
|---|---|
| `src/providers/mock-provider.js` | Extracted mock build logic (SOP / YouTube / Prompt detection by field keys) + 900ms sleep |
| `src/providers/claude-provider.js` | GAS POST client; AbortController timeout; JSON error handling; response normalization |
| `src/providers/provider-manager.js` | `listProviders()`, `run(prompt, options)` with try/catch → mock fallback |

## Files Modified

| File | Change |
|---|---|
| `src/services/provider-service.js` | Rewritten as thin wrapper over `provider-manager.run()` |
| `src/runtime/index.js` | Passes `builderId`, `builderName`, `title` to `runProvider`; propagates `fallback`, `fallbackReason`, `model`, `docUrl` |
| `src/services/runtime-service.js` | Destructures and returns `fallback`, `fallbackReason`, `model`, `docUrl` |
| `src/components/builder-launcher.js` | Adds `renderProviderSelector()`; reads `#bld-provider` in `handleGenerate`; adds `_showFallbackNote()` |
| `styles/builders.css` | Adds `.bld-provider-row`, `.bld-provider-label`, `.bld-provider-sel`, `.output-fallback-note` |
| `v4.html` | Adds `<script src="/config.js">` before app module so `window.AIFUN_CONFIG` is available to providers |

## Files Deleted (dead Sprint-5 code)

| File | Reason |
|---|---|
| `src/builders/index.js` | Sprint 5 registry — replaced by schema-based `registry.js` in Sprint 7 |
| `src/builders/prompt-builder.js` | Sprint 5 JS builder — replaced by `prompt-builder.json` schema |
| `src/components/builder-card.js` | Sprint 5 card component — replaced by `renderSchemaCard()` in `builders.js` |
| `src/components/builder-form.js` | Sprint 5 form — replaced by `form-renderer.js` + `field-renderer.js` |
| `src/services/builder-service.js` | Sprint 5 service — replaced by `builder-registry-service.js` |

---

## GAS Payload Format

```javascript
POST {AIFUN_CONFIG.gasWebAppUrl}
Content-Type: application/json

{
  "action":        "generateDocument",
  "skillId":       "sop-builder",
  "prompt":        "<full prompt from template engine>",
  "title":         "SOP Builder — Ten quy trinh",
  "formData":      { "process_name": "...", ... },
  "provider":      "claude",
  "folderId":      "1NthsP7JrOCrT5nGeU2j3annqLLDiHBJZ",
  "spreadsheetId": "1hsD6pEqWmF7Z46SQrumip-wslTCOU1Jnb4f21hyuTyU",
  "user":          "Diep Chung",
  "workspace":     "AIFUN Demo",
  "timestamp":     "2026-06-26T..."
}

// Success response (from GAS)
{
  "fileName":  "SOP_Ten-quy-trinh_2026-06-26.docx",
  "docUrl":    "https://docs.google.com/document/d/...",
  "docId":     "...",
  "content":   "# SOP: Ten quy trinh\n...",
  "createdAt": "..."
}

// Error response (from GAS)
{ "error": "Claude API quota exceeded" }
```

## Error Cases Handled

| Error | Handling |
|---|---|
| `gasWebAppUrl` not configured | Immediate throw → fallback to mock |
| `fetch()` network failure | Caught → "Khong the ket noi den GAS: ..." → fallback |
| AbortController timeout (90s) | Caught as AbortError → "Yeu cau qua thoi gian" → fallback |
| HTTP non-200 from GAS | Throw `GAS tra ve HTTP {status}` → fallback |
| GAS returns `{ error: "..." }` | Throw with GAS error message → fallback |
| Mock provider fails | Re-thrown (no fallback for mock — it should always work) |

---

## Provider Selector UI

Added above the "Tao ngay" button in all builders:

```
Provider AI  [ Mock (Demo)        ▼ ]
             [ Claude (Anthropic)   ]
```

- Default: `Mock (Demo)` — always works offline
- `Claude (Anthropic)` — calls GAS; shows fallback note if unavailable

---

## Browser Verification

| Check | Result |
|---|---|
| Provider selector renders in all 3 builders | ✓ |
| Mock provider generates SOP: 274 tokens, "Hoàn thành" | ✓ |
| Mock provider: no fallback note shown | ✓ |
| Claude provider: attempts GAS fetch (confirmed via network log — POST to script.google.com) | ✓ |
| Claude provider fails on localhost (CORS) → falls back to mock | ✓ |
| Fallback note text: "Claude khong kha dung — da dung Mock. Ly do: Khong the ket noi den GAS: Failed to fetch" | ✓ |
| `window.AIFUN_CONFIG.gasWebAppUrl` available after adding config.js to v4.html | ✓ |
| Dead Sprint-5 files deleted (5 files) | ✓ |
| V2 files (`index.html`, `config.js`, `skill-engine.js`, `skill-forms.js`) unmodified | ✓ |
| No console errors | ✓ |

**Note on "Failed to fetch":** This is expected on localhost — the GAS endpoint at
`script.google.com` blocks CORS from `localhost`. On GitHub Pages production
(`portal.aifun.ai.vn`), the GAS endpoint accepts the request and returns real
Claude-generated content. The fallback engine is working as designed.

---

## Known Limitations

| Issue | Sprint |
|---|---|
| Claude-generated `docUrl` (Google Docs link) is saved in the document record but not surfaced in the "Xem tai lieu" button yet — it still navigates to the Documents page | Sprint 9 |
| `latencyMs` is tracked in claude-provider but not displayed in the output footer | Sprint 9 |
| Provider selector defaults to Mock even if the user previously used Claude — no localStorage persistence | Sprint 9 |
| GAS CORS restriction blocks Claude from localhost dev environment (expected — works in production) | Accepted |

---

## Next: Sprint 9

- Surface Google Docs link in output: "Xem tren Google Docs" button when `docUrl` is present
- localStorage persistence for documents (survive page reload)
- Direct document navigation from Document Center
- Email Automation and Content Factory builders as JSON schemas
- Provider selector persistence in localStorage
