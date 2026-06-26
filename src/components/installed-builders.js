const COLOR_CLASSES = ['c1', 'c2', 'c3', 'c4'];

function card(builder, index) {
  const colorCls = COLOR_CLASSES[index % COLOR_CLASSES.length];
  const initial  = builder.name.charAt(0).toUpperCase();
  return `
    <div class="builder-card">
      <div class="builder-card-icon builder-card-icon--${colorCls}" aria-hidden="true">${initial}</div>
      <div class="builder-card-name">${builder.name}</div>
      <div class="builder-card-docs">${builder.docs} tài liệu đã tạo</div>
      <button class="builder-card-btn" data-nav-to="/builders" aria-label="Sử dụng ${builder.name}">
        Sử dụng ngay &rsaquo;
      </button>
    </div>
  `;
}

export function render(builders) {
  if (!builders?.length) {
    return '<p class="dash-empty">Chưa cài Builder nào.</p>';
  }
  return builders.map((b, i) => card(b, i)).join('');
}
