import { safeStorage } from '../utils/safe-storage.js';

const _DEFAULT  = '#6366f1';
const _CACHE_KEY = 'aifun_brand_color';

function _hexToRgb(hex) {
  const h = (hex ?? '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function _toHex(r, g, b) {
  return '#' + [r, g, b]
    .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

// Apply a hex brand color as CSS custom properties on :root
export function applyBrandColor(color) {
  const hex = /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : _DEFAULT;
  const rgb = _hexToRgb(hex);
  const root = document.documentElement;

  root.style.setProperty('--c-primary', hex);
  if (rgb) {
    // hover: ~12% darker
    root.style.setProperty('--c-primary-h', _toHex(...rgb.map((v) => v * 0.88)));
    // light bg: mix 6% color into white
    root.style.setProperty('--c-primary-l', _toHex(...rgb.map((v) => v + (255 - v) * 0.94)));
  }
  safeStorage.setItem(_CACHE_KEY, hex);
}

// Re-apply brand color from localStorage cache (call on page load)
export function restoreCachedBrandColor() {
  const cached = safeStorage.getItem(_CACHE_KEY);
  if (cached) applyBrandColor(cached);
}

// Remove inline overrides — falls back to tokens.css defaults
export function resetBrandColor() {
  const root = document.documentElement;
  root.style.removeProperty('--c-primary');
  root.style.removeProperty('--c-primary-h');
  root.style.removeProperty('--c-primary-l');
  safeStorage.removeItem(_CACHE_KEY);
}
