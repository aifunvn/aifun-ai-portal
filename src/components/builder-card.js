// Builder card for the Builders page grid — distinct from the compact
// installed-builders.js card used on the Dashboard.

export function render(builder) {
  return `
    <div class="bld-card"
         data-builder-id="${builder.id}"
         role="button"
         tabindex="0"
         aria-label="Mở ${builder.name}">
      <div class="bld-card-icon" aria-hidden="true">
        ${builder.iconSvg}
      </div>
      <div class="bld-card-body">
        <div class="bld-card-meta">
          <span class="bld-tag">${builder.category}</span>
        </div>
        <h3 class="bld-card-name">${builder.name}</h3>
        <p class="bld-card-desc">${builder.description}</p>
      </div>
      <span class="bld-card-arrow" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="14" y2="9"/><polyline points="10 5 14 9 10 13"/></svg>
      </span>
    </div>
  `;
}
