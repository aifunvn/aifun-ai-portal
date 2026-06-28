// Renders an install/uninstall button for a marketplace item.
// Attributes drive the click handler wired by the parent.

const PLAN_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' };

export function render(item, { isInstalled = false, isAccessible = true } = {}) {
  if (!isAccessible) {
    return `
      <button class="btn btn-sm btn-secondary" disabled
              title="Yeu cau goi ${PLAN_LABEL[item.plan] ?? item.plan}">
        Yeu cau ${PLAN_LABEL[item.plan] ?? item.plan}
      </button>`;
  }
  if (isInstalled) {
    return `
      <button class="btn btn-sm btn-installed" data-uninstall="${item.id}"
              aria-label="Go cai dat ${item.name}">
        ✓ Da cai &nbsp;·&nbsp; Go
      </button>`;
  }
  return `
    <button class="btn btn-sm btn-primary" data-install="${item.id}"
            aria-label="Cai dat ${item.name}">
      Cai dat
    </button>`;
}
