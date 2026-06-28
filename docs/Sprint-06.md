# Sprint 6 — AI Runtime + Document Center

**Branch:** `develop-v4`
**Completed:** 2026-06-26

---

## Objective

Connect the AI Builder engine to a runtime layer that auto-saves outputs, then build the first Document Center where users can browse, search, read, copy, and export their generated documents.

---

## Architecture

### Full Workflow

```
Builder Form
    ↓
builders.js  →  runBuilder(builder, formData)
    ↓
runtime/index.js  →  executePipeline()
    ↓
provider-service.js  →  runProvider()         ← mock now, Claude/GPT later
    ↓
{ content, tokens, provider }
    ↓
document-service.js  →  saveDocument()        ← in-memory, workspace-scoped
    ↓
{ content, tokens, doc }                       ← returned to builders.js
    ↓
chat-output.js renders result + "Xem tai lieu" button
    ↓
documents.js  →  shows list with new doc at top
    ↓
document-view.js  →  markdown-viewer renders content + toolbar
```

### Runtime Layer (`src/runtime/`)

`executePipeline(builder, formData, options)` is stateless — it only handles prompt construction and provider invocation. Workspace context and persistence are added by `runtime-service.js` above it.

This separation means the pipeline can be reused for background jobs, batch processing, or streaming in future sprints.

### Document Service

In-memory store (`Map<workspaceId, Document[]>`) keyed by workspace ID. Newest documents first. Survives navigation between pages within a session (module singleton). Sprint 7 will add Supabase + Google Drive persistence.

### Markdown Renderer

Line-by-line parser in `markdown-viewer.js` — no external library. Handles:

| Pattern | Output |
|---|---|
| `## Heading` | `<h3 class="md-h3">` |
| `# Heading` | `<h2 class="md-h2">` |
| `- item` | `<ul class="md-ul"><li>` |
| `---` | `<hr class="md-hr">` |
| `**bold**` | `<strong>` |
| `*italic*` | `<em>` |
| `` `code` `` | `<code class="md-code">` |

HTML is escaped before markdown parsing — user-supplied content cannot inject HTML through the renderer.

---

## Files Created

| File | Purpose |
|---|---|
| `src/runtime/index.js` | `executePipeline()` — stateless prompt → provider → response |
| `src/services/runtime-service.js` | `runBuilder()` — orchestrates pipeline + workspace + auto-save |
| `src/services/document-service.js` | In-memory document store: `saveDocument`, `listDocuments`, `getDocument`, `hasDocuments` |
| `src/components/chat-output.js` | Output panel: idle / thinking / ready / error states; uses `markdown-viewer`; wires Copy + "Xem tai lieu" buttons |
| `src/components/markdown-viewer.js` | Safe line-by-line markdown renderer; exports `renderMarkdown(md)` |
| `src/components/document-list.js` | Document list with empty state; accepts workspace ID + search query |
| `src/components/document-view.js` | Single document viewer; uses `markdown-viewer` + `document-toolbar`; exports `render(doc)` + `initView(doc, {onBack})` |
| `src/components/document-toolbar.js` | Toolbar: back button, Copy, Export .txt |
| `styles/markdown.css` | Shared markdown typography tokens — used by both builder output and document view |
| `styles/documents.css` | Document center styles: list, rows, search, toolbar, view, empty state, chat-output states |

## Files Modified

| File | Change |
|---|---|
| `src/pages/builders.js` | Import `runBuilder` from `runtime-service`; import `chatOutput` from `chat-output`; remove `builder-service` and `builder-output` dependencies |
| `src/pages/documents.js` | Full rewrite — two-view state machine (list + single doc), workspace-reactive, debounced search |
| `src/app/app.js` | Import `initDocuments`; pass as `initFn` to `mountPage('/documents', ...)` |
| `v4.html` | Add `markdown.css` and `documents.css` stylesheet links |

## Files Deleted

| File | Reason |
|---|---|
| `src/components/builder-output.js` | Superseded by `chat-output.js` which adds markdown rendering and document navigation |

---

## Document Object Shape

```js
{
  id:          'doc_1719388800000_ab3xy',   // timestamp + 5-char random suffix
  title:       'Prompt — Viet email cold outreach hieu qua',
  content:     '...',                        // raw text from provider
  builderId:   'prompt-builder',
  builderName: 'Prompt Builder',
  workspace:   { id: 'ws_aifun_001', name: 'AIFUN Workspace', ... },
  formData:    { role: '...', goal: '...', ... },
  tokens:      { prompt: 80, completion: 60, total: 140 },
  provider:    'mock',
  createdAt:   '2026-06-26T10:00:00.000Z',
}
```

---

## Documents Page State Machine

```
init()
  └─ workspaceStore.subscribe()
       └─ showList(workspaceId, query='')
            ├─ renderList(workspaceId, query)   ← list or empty state
            ├─ #doc-search.input → debounce → showList(ws, newQuery)
            └─ .doc-row.click → openDoc(workspaceId, docId)
                   ├─ renderDoc(doc)             ← toolbar + header + markdown body
                   └─ initView(doc, { onBack })
                          ├─ #doc-toolbar-back.click → showList(ws, lastQuery)
                          ├─ #doc-toolbar-copy.click → clipboard API
                          └─ #doc-toolbar-export.click → Blob download .txt
```

Workspace switch (e.g. sidebar dropdown) triggers `showList` for the new workspace automatically via the store subscription.

---

## Chat Output States

| State | Trigger | Renders |
|---|---|---|
| `'idle'` | Page load | Icon + instruction text |
| `'thinking'` | Generate clicked | Spinner + "AI dang tao noi dung..." |
| `{ content, tokens, doc }` | Provider returned | Markdown content + token badge + Copy + "Xem tai lieu" |
| `{ error }` | Provider threw | Red error panel with message |

---

## Browser Verification (Sprint 6)

| Check | Result |
|---|---|
| Builders page loads, 1 builder card visible | ✓ |
| Fill form and click "Tao ngay" — output shows "HOAN THANH" + token count | ✓ 140 tokens |
| Markdown headings render (NHIEM VU, YEU CAU OUTPUT) | ✓ |
| "Sao chep" + "Xem tai lieu" buttons present in output panel | ✓ |
| Navigate to Documents — doc appears in list with correct title + relative time | ✓ "vua xong" |
| Click doc row — opens document view with toolbar + formatted content | ✓ |
| Toolbar shows: "Tat ca tai lieu", "Sao chep", "Xuat .txt" | ✓ |
| Document view shows: title, builder tag, date, token badge, provider badge | ✓ |
| No console errors | ✓ |

---

## Known Limitations (deferred)

| Issue | Sprint |
|---|---|
| Documents not persisted — lost on page reload | Sprint 7 |
| Search is substring only — no fuzzy or ranked results | Sprint 7 |
| Export format: plain .txt only — no PDF or DOCX | Sprint 7 |
| "Xem tai lieu" button navigates to list, not directly to the document | Sprint 7 |
| No delete document action | Sprint 7 |
| No provider selector — always uses mock | Sprint 7 |

---

## Next: Sprint 7

- Wire real Claude API through GAS Web App (`PROVIDERS.claude`)
- Add Supabase persistence for documents (or localStorage bridge)
- Add SOP Builder (second builder definition)
- Add document delete action
- Navigate directly to document from "Xem tai lieu" button
