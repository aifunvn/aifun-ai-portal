// ─────────────────────────────────────────────────────────────
// Reports Page — Sprint 14A placeholder
// Professional dashboard shell; analytics engine in Sprint 15+
// ─────────────────────────────────────────────────────────────

const _METRICS = [
  { label: 'Tài liệu đã tạo',    value: '—', icon: '📄', note: 'Tháng này' },
  { label: 'AI Requests',         value: '—', icon: '⚡', note: 'Tháng này' },
  { label: 'Token đã dùng',       value: '—', icon: '🔢', note: 'Tháng này' },
  { label: 'Thành viên hoạt động', value: '—', icon: '👥', note: 'Tháng này' },
];

function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _renderMetricCard(m) {
  return `
    <div style="
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:var(--r-lg);
      padding:20px;
      display:flex;
      flex-direction:column;
      gap:8px;
      box-shadow:var(--sh-sm);
      opacity:.7;
    ">
      <div style="font-size:22px">${_esc(m.icon)}</div>
      <div style="font-size:24px;font-weight:700;color:var(--text-1)">${_esc(m.value)}</div>
      <div style="font-size:12px;font-weight:600;color:var(--text-1)">${_esc(m.label)}</div>
      <div style="font-size:11px;color:var(--text-3)">${_esc(m.note)}</div>
    </div>`;
}

function _renderRoadmapItem(text) {
  return `
    <li style="display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);">
      <span style="color:var(--c-primary);font-size:14px;flex-shrink:0">○</span>
      <span style="font-size:13px;color:var(--text-2)">${_esc(text)}</span>
    </li>`;
}

export function render() {
  const cards  = _METRICS.map(_renderMetricCard).join('');
  const items  = [
    'Số tài liệu tạo theo ngày / tuần / tháng',
    'Biểu đồ AI usage — token, cost, provider breakdown',
    'Top builders được dùng nhiều nhất',
    'Hoạt động thành viên trong workspace',
    'Export báo cáo sang PDF / Google Sheets',
  ].map(_renderRoadmapItem).join('');

  return `
    <div style="padding:24px 20px;max-width:780px">

      <div style="margin-bottom:24px">
        <h2 style="font-size:22px;font-weight:700;color:var(--text-1);margin:0 0 4px">Báo cáo &amp; Phân tích</h2>
        <p style="font-size:13px;color:var(--text-2);margin:0">Theo dõi hiệu quả sử dụng AI và tài liệu của workspace</p>
      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(160px,1fr));
        gap:12px;
        margin-bottom:24px;
      ">
        ${cards}
      </div>

      <div style="
        background:var(--surface);
        border:1px solid var(--border);
        border-radius:var(--r-lg);
        padding:24px;
        margin-bottom:16px;
        box-shadow:var(--sh-sm);
      ">
        <div style="
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:6px;
        ">
          <span style="
            background:var(--c-primary-l);
            color:var(--c-primary);
            font-size:11px;
            font-weight:700;
            padding:3px 8px;
            border-radius:999px;
            letter-spacing:.3px;
            text-transform:uppercase;
          ">Sắp ra mắt</span>
          <span style="font-size:15px;font-weight:700;color:var(--text-1)">Analytics Dashboard</span>
        </div>
        <p style="font-size:13px;color:var(--text-2);margin:0 0 16px;line-height:1.6">
          Module Báo cáo sẽ được xây dựng trong Sprint 15. Dữ liệu phân tích sẽ giúp bạn
          theo dõi ROI khi ứng dụng AI vào quy trình làm việc của doanh nghiệp.
        </p>
        <ul style="list-style:none;padding:0;margin:0">
          ${items}
        </ul>
      </div>

    </div>`;
}

export function init() {
  // Analytics engine not yet implemented — placeholder only
}
