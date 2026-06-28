import { safeStorage }              from '../utils/safe-storage.js';
import { updateWorkspaceSettings }   from '../services/settings-service.js';
import { resetBrandColor }           from '../services/theme-service.js';
import { showToast }                 from '../components/toast.js';

function _esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _showConfirm({ title, body, confirmLabel, onConfirm }) {
  // Remove any existing modal
  document.getElementById('stt-confirm-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id        = 'stt-confirm-overlay';
  overlay.className = 'stt-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="stt-dialog">
      <div class="stt-dialog-icon">⚠️</div>
      <div class="stt-dialog-title">${_esc(title)}</div>
      <div class="stt-dialog-body">${body}</div>
      <div class="stt-dialog-actions">
        <button class="stt-btn stt-btn--ghost"  id="stt-confirm-cancel"  type="button">Huỷ</button>
        <button class="stt-btn stt-btn--danger"  id="stt-confirm-ok"      type="button">${_esc(confirmLabel)}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('stt-confirm-cancel')?.addEventListener('click', close);
  document.getElementById('stt-confirm-ok')?.addEventListener('click', () => {
    close();
    onConfirm();
  });

  const _onKey = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', _onKey); }
  };
  document.addEventListener('keydown', _onKey);

  // Focus cancel by default (safe choice)
  setTimeout(() => document.getElementById('stt-confirm-cancel')?.focus(), 50);
}

export function renderDangerZone(canWrite) {
  if (!canWrite) return '';
  return `
    <div class="stt-danger-section">
      <div class="stt-danger-header">
        <span class="stt-danger-badge">Khu vực nguy hiểm</span>
        <p class="stt-danger-desc">Những thao tác này không thể hoàn tác. Hãy cân nhắc kỹ trước khi thực hiện.</p>
      </div>

      <div class="stt-danger-item">
        <div class="stt-danger-item-info">
          <div class="stt-danger-item-label">Xóa cache trình duyệt</div>
          <div class="stt-danger-item-note">
            Xóa dữ liệu lưu cục bộ: theme, màu thương hiệu, workspace đã chọn. Trang sẽ tải lại.
          </div>
        </div>
        <button class="stt-btn stt-btn--outline-danger" id="stt-danger-clear-cache" type="button">
          Xóa cache
        </button>
      </div>

      <div class="stt-danger-item">
        <div class="stt-danger-item-info">
          <div class="stt-danger-item-label">Khôi phục cài đặt mặc định</div>
          <div class="stt-danger-item-note">
            Đặt lại mô tả, timezone, màu thương hiệu về mặc định. Không xóa tài liệu hay lịch sử AI.
          </div>
        </div>
        <button class="stt-btn stt-btn--outline-danger" id="stt-danger-reset-ws" type="button">
          Khôi phục
        </button>
      </div>
    </div>`;
}

export function wireDangerZone(wsId, wsName, onReset) {
  document.getElementById('stt-danger-clear-cache')?.addEventListener('click', () => {
    _showConfirm({
      title:        'Xóa cache trình duyệt?',
      body:         'Toàn bộ dữ liệu lưu cục bộ (theme, màu, workspace đã chọn) sẽ bị xóa. Trang sẽ tải lại sau khi xóa.',
      confirmLabel: 'Xóa cache',
      onConfirm:    () => {
        safeStorage.clear();
        showToast('Đã xóa cache. Đang tải lại…', 'success');
        setTimeout(() => window.location.reload(), 1200);
      },
    });
  });

  document.getElementById('stt-danger-reset-ws')?.addEventListener('click', () => {
    _showConfirm({
      title:        'Khôi phục cài đặt mặc định?',
      body:         `Cài đặt workspace <strong>${_esc(wsName)}</strong> sẽ được đặt lại về mặc định. Tài liệu và lịch sử AI sẽ không bị ảnh hưởng.`,
      confirmLabel: 'Khôi phục',
      onConfirm:    async () => {
        const ok = await updateWorkspaceSettings(wsId, {
          description: '', timezone: 'Asia/Ho_Chi_Minh',
          ai_language: 'vi', logo_url: '',
          brand_color: '#6366f1', favicon_url: '',
        });
        if (ok) {
          resetBrandColor();
          showToast('Đã khôi phục cài đặt mặc định', 'success');
          onReset();
        } else {
          showToast('Không thể khôi phục. Vui lòng thử lại.', 'error');
        }
      },
    });
  });
}
