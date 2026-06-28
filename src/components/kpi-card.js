const ICONS = {
  'ai-requests': `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l1.8 5.4L17 9l-5.2 1.6L10 16l-1.8-5.4L3 9l5.2-1.6L10 2z"/></svg>`,
  'documents':   `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7l-4-5z"/><polyline points="12 2 12 7 17 7"/><line x1="8" y1="12" x2="14" y2="12"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`,
  'tokens':      `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><line x1="6" y1="10" x2="14" y2="10"/><line x1="10" y1="6" x2="10" y2="14"/></svg>`,
  'builders':    `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>`,
};

function fmtValue(value, unit) {
  if (unit === 'tk') {
    return value >= 1000
      ? `${(value / 1000).toFixed(1).replace('.0', '')}k`
      : String(value);
  }
  return value.toLocaleString('vi-VN');
}

function changeLabel(change, positive) {
  if (positive === null) return '';
  if (change === 0) return '<span class="kpi-change kpi-change--neutral">Không đổi</span>';
  const sign  = change > 0 ? '+' : '';
  const cls   = positive ? 'kpi-change--up' : 'kpi-change--down';
  return `<span class="kpi-change ${cls}">${sign}${change} tháng này</span>`;
}

export function render(kpi) {
  const icon = ICONS[kpi.id] ?? ICONS['builders'];
  return `
    <div class="kpi-card kpi-card--${kpi.id}">
      <div class="kpi-icon" aria-hidden="true">${icon}</div>
      <div class="kpi-body">
        <div class="kpi-value">${fmtValue(kpi.value, kpi.unit)}</div>
        <div class="kpi-label">${kpi.label}</div>
        ${changeLabel(kpi.change, kpi.positive)}
      </div>
    </div>
  `;
}
