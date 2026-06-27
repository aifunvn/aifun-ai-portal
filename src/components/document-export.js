// Export dropdown — PDF, DOCX (HTML-compatible), Markdown, TXT.
// No external libraries. PDF uses browser print API.

const ICON_EXPORT = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 13h10"/></svg>`;
const ICON_CHV    = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 4.5 6 7.5 9 4.5"/></svg>`;

export function render() {
  return `
    <div class="doc-export-wrap" id="doc-export-wrap">
      <button class="btn btn-secondary" id="doc-export-trigger" aria-haspopup="true" aria-expanded="false">
        ${ICON_EXPORT} Xuat ${ICON_CHV}
      </button>
      <ul class="doc-export-menu" id="doc-export-menu" role="menu" aria-label="Xuat tai lieu" hidden>
        <li role="menuitem" tabindex="-1" data-fmt="pdf">Xuat PDF</li>
        <li role="menuitem" tabindex="-1" data-fmt="docx">Xuat DOCX (Word)</li>
        <li role="menuitem" tabindex="-1" data-fmt="md">Xuat Markdown (.md)</li>
        <li role="menuitem" tabindex="-1" data-fmt="txt">Xuat Van ban (.txt)</li>
      </ul>
    </div>
  `;
}

export function initExport(doc) {
  const trigger = document.getElementById('doc-export-trigger');
  const menu    = document.getElementById('doc-export-menu');
  if (!trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !menu.hidden;
    menu.hidden = open;
    trigger.setAttribute('aria-expanded', String(!open));
    if (!open) menu.querySelector('[role="menuitem"]')?.focus();
  });

  menu.addEventListener('keydown', (e) => {
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const idx   = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Escape')    { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
  });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-fmt]');
    if (!item) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    _doExport(item.dataset.fmt, doc);
  });

  document.addEventListener('click', (e) => {
    if (!document.getElementById('doc-export-wrap')?.contains(e.target)) {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  }, { once: false, capture: false });
}

function _slug(title) {
  return (title ?? 'tai-lieu').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

function _doExport(fmt, doc) {
  const name = _slug(doc.title);
  if (fmt === 'txt') {
    _download(`${name}.txt`, doc.content ?? '', 'text/plain;charset=utf-8');
    return;
  }
  if (fmt === 'md') {
    _download(`${name}.md`, doc.content ?? '', 'text/markdown;charset=utf-8');
    return;
  }
  if (fmt === 'pdf') {
    _exportPdf(doc);
    return;
  }
  if (fmt === 'docx') {
    _exportDocx(doc);
  }
}

function _download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function _exportPdf(doc) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
    <title>${doc.title}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; color: #0f172a; line-height: 1.7; }
      h1,h2,h3 { margin-top: 1.4em; } pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; }
      code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: .9em; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>${doc.title}</h1>
    <p style="color:#64748b;font-size:.88em">${doc.builderName ?? 'AI Builder'} &middot; ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
    <hr>
    <div>${_mdToHtml(doc.content ?? '')}</div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

function _exportDocx(doc) {
  // Word-compatible HTML file (.doc)
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="UTF-8"><title>${doc.title}</title>
<style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.5}h1{font-size:16pt}h2{font-size:14pt}h3{font-size:12pt}</style>
</head><body><h1>${doc.title}</h1><p><em>${doc.builderName ?? 'AI Builder'} &bull; ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}</em></p>
<hr>${_mdToHtml(doc.content ?? '')}</body></html>`;
  _download(`${_slug(doc.title)}.doc`, html, 'application/msword');
}

function _mdToHtml(md) {
  return md
    .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,    '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/^- (.+)$/gm,     '<li>$1</li>')
    .replace(/\n\n/g,          '</p><p>')
    .replace(/\n/g,            '<br>');
}
