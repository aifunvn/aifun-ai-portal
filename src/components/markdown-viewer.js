// Line-by-line markdown renderer — no external library.
// Handles the output patterns produced by AI builders: headings, bold,
// italic, inline code, bullet lists, and horizontal rules.

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="md-code">$1</code>');
}

export function renderMarkdown(md) {
  const escaped = (md ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const out   = [];
  let inList  = false;

  for (const line of lines) {
    if (/^## (.+)/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="md-h3">${inline(line.slice(3))}</h3>`);
    } else if (/^# (.+)/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="md-h2">${inline(line.slice(2))}</h2>`);
    } else if (line === '---') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr class="md-hr">');
    } else if (/^- (.+)/.test(line)) {
      if (!inList) { out.push('<ul class="md-ul">'); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (!line.trim()) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<br>');
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p class="md-p">${inline(line)}</p>`);
    }
  }

  if (inList) out.push('</ul>');
  return `<div class="md-content">${out.join('')}</div>`;
}
