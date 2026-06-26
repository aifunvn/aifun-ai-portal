function fmtTokens(n) {
  if (n === 0) return '';
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

export function render(days) {
  if (!days?.length) {
    return '<p class="dash-empty">Không có dữ liệu token.</p>';
  }

  const W = 500, H = 180;
  const PAD_L = 10, PAD_T = 18, PAD_B = 32;
  const chartH = H - PAD_T - PAD_B;          // 130
  const N      = days.length;
  const barW   = 48;
  const gap    = Math.floor((W - PAD_L * 2 - N * barW) / (N - 1)); // 24
  const maxVal = Math.max(...days.map((d) => d.tokens), 1);

  const rects = days.map((d, i) => {
    const x    = PAD_L + i * (barW + gap);
    const barH = d.tokens > 0 ? Math.max(3, Math.round((d.tokens / maxVal) * chartH)) : 0;
    const y    = PAD_T + chartH - barH;
    const cx   = x + barW / 2;
    const val  = fmtTokens(d.tokens);
    return `
      ${barH > 0 ? `<rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4"/>` : ''}
      ${val ? `<text class="chart-label-val" x="${cx}" y="${y - 5}" text-anchor="middle">${val}</text>` : ''}
      <text class="chart-label-x" x="${cx}" y="${H - 8}" text-anchor="middle">${d.day}</text>
    `;
  }).join('');

  return `
    <div class="usage-wrap">
      <svg class="usage-svg" viewBox="0 0 ${W} ${H}"
           xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="Biểu đồ tokens sử dụng 7 ngày qua">
        ${rects}
      </svg>
    </div>
  `;
}
