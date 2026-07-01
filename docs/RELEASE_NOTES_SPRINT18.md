# Release Notes — Sprint 18: Builder Runtime Engine

**Branch:** develop-v4-sprint18
**Date:** 2026-07-01
**Status:** READY FOR TEST ⚡

---

## Overview

Sprint 18 turns Builder Studio from an authoring tool into a live AI execution platform. Any Builder created in `/builder-studio` can now be run at `/run?builderId=<uuid>` with real AI providers via GAS proxy.

---

## Modules Delivered

### 18B — Provider Layer (`src/services/providers/`)

| File | Status | Description |
|---|---|---|
| `provider-interface.js` | ✅ Full | BaseProvider, callGasRunBuilder(), createProvider factory, streaming simulation |
| `claude.js` | ✅ Full | ClaudeProvider — GAS proxy, models: sonnet-4-6 / haiku-4-5 / opus-4-8 |
| `openai.js` | ✅ Full | OpenAIProvider — GAS proxy, models: gpt-4o / gpt-4o-mini |
| `gemini.js` | 🔲 Stub | Clear error + Sprint 19 note when selected |
| `openrouter.js` | 🔲 Stub | Clear error + Sprint 19 note when selected |

**Key design:** `registerProvider(id, instance)` pattern — adding a new provider in Sprint 19 requires only one new file, zero changes to the engine.

### 18C — Runtime Engine (`src/services/builder-runtime.js`)

Single entry point. UI never calls providers or DB directly.

| Function | Description |
|---|---|
| `runBuilder(id, vars, callbacks)` | Full pipeline: load → render → build → route → stream → log |
| `renderTemplate(template, vars)` | `{{variable}}` substitution, unknown tokens preserved as-is |
| `buildPayload(builder, rendered)` | OpenAI-compatible messages[] with system + knowledge + user |
| `extractVariables(template)` | Parse `{{var}}` names → used to auto-generate input form |

### 18D — Runtime UI

| File | Description |
|---|---|
| `src/pages/builder-run.js` | Run page — auto-generated variable form + streaming output |
| `src/components/builder-run-widget.js` | Reusable output widget: empty/loading/streaming/done/error |
| `styles/builder-run.css` | Design token CSS, responsive, dark mode |

**Route:** `#/run?builderId=<uuid>` — no router changes (query param approach)

---

## Architecture

```
Browser → builder-run.js (UI)
              ↓
         builder-runtime.js  ← SINGLE ENTRY POINT
              ↓
         providers/createProvider(builder.model)
              ↓
         claude.js / openai.js
              ↓
         callGasRunBuilder() → POST GAS action:runBuilder
              ↓
         GAS Code.gs (see below ↓)
              ↓
         Claude / OpenAI API
              ↓
         Full response → simulate stream client-side (28ms/4-word chunks)
              ↓
         onChunk → appendChunk → live typewriter output
```

---

## ⚠️ GAS Update Required

The client sends `action: 'runBuilder'` — GAS Code.gs must handle this new action. **The existing `generateDocument` path is untouched** (still used by Builder Studio Playground).

Add to `Code.gs` `doPost()` switch:

```javascript
case 'runBuilder': {
  const body        = JSON.parse(e.postData.contents);
  const provider    = body.provider    ?? 'claude';
  const model       = body.model       ?? 'claude-sonnet-4-6';
  const messages    = body.messages    ?? [];
  const temperature = body.temperature ?? 0.7;
  const maxTokens   = body.maxTokens   ?? 4096;

  let content = '';
  let promptTokens = 0, completionTokens = 0;

  if (provider === 'claude') {
    // Call Claude Messages API
    const claudeResp = callClaude({ model, messages, temperature, max_tokens: maxTokens });
    content          = claudeResp.content[0].text;
    promptTokens     = claudeResp.usage.input_tokens;
    completionTokens = claudeResp.usage.output_tokens;

  } else if (provider === 'openai') {
    // Call OpenAI Chat Completions API
    const oaiResp    = callOpenAI({ model, messages, temperature, max_tokens: maxTokens });
    content          = oaiResp.choices[0].message.content;
    promptTokens     = oaiResp.usage.prompt_tokens;
    completionTokens = oaiResp.usage.completion_tokens;
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      content,
      tokens:   { prompt: promptTokens, completion: completionTokens, total: promptTokens + completionTokens },
      model,
      provider,
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## How to Test (Manual Checklist)

### Pre-condition
- [ ] GAS Code.gs has been updated with `runBuilder` handler and redeployed

### R1 — Route
- [ ] Open `#/run?builderId=<valid-uuid>`
- [ ] Builder name, description, status badge render correctly
- [ ] Builder icon renders (emoji mapping)

### R2 — Variable form
- [ ] Builder with `{{ten}}`, `{{cong_ty}}` → 2 input fields auto-generated
- [ ] Field label formatted ("Ten", "Cong Ty")
- [ ] Builder with no `{{variable}}` → "Builder này không yêu cầu nhập liệu"

### R3 — Run (Claude)
- [ ] Fill fields → Run button
- [ ] Skeleton loading appears immediately
- [ ] Typewriter streaming text appears
- [ ] Blinking cursor visible during stream
- [ ] Cursor disappears when done
- [ ] Token count + latency displayed in footer
- [ ] Copy button copies full text to clipboard

### R4 — Stop button
- [ ] Click Run → click Stop before stream completes
- [ ] Partial output frozen in place (no error message)
- [ ] Run button re-enabled after Stop

### R5 — Error state
- [ ] Disconnect network → Run → error panel with hint appears
- [ ] Error is recoverable — Run button re-enabled, can retry

### R6 — Stub providers
- [ ] Create a Builder with model = Gemini → Run → clear error "Sprint 19"

### R7 — Analytics
- [ ] After a successful run, check `custom_builder_analytics` — `event_type = 'used'` row inserted
- [ ] After a failed run — `success = false` row inserted

### R8 — Responsive / Dark mode
- [ ] 375px viewport: form stacks above output panel
- [ ] Dark mode toggle: all colors via CSS vars (no hardcoded hex)

---

## What Was NOT Modified

- `index.html` (V2 fallback) — untouched
- Builder Studio module (Sprint 17 frozen) — untouched
- Dashboard, Auth, Session, Router, Workspace Engine — untouched
- `src/providers/` (old provider system) — untouched
- `src/services/builder-studio-db.js` — read-only imports only

---

## Sprint 19 Extension Points

All hooks already reserved in the codebase:

| Feature | Where to add |
|---|---|
| Conversation memory | `buildPayload()` — insert prior turns into messages[] |
| RAG / Knowledge Base | `buildPayload()` — replace raw `knowledgeSources` with retrieval results |
| Tool calling | `buildPayload()` — add `tools: []` field; providers forward to API |
| Gemini full | `providers/gemini.js` — implement `_fetch()`, update `MODEL_MAP` |
| OpenRouter full | `providers/openrouter.js` — implement `_fetch()` |
| True SSE streaming | Override `stream()` in provider when GAS supports SSE (Sprint 19+) |
| Embed in Playground | Import `builder-run-widget.js` in `bs-test-playground.js` |

---

*Sprint 18 completed: 2026-07-01*
*GAS update required before E2E test can pass.*
