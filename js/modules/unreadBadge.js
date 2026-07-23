/**
 * unreadBadge.js — WhatsApp Unread Chat Count Badge Module
 * Handles rendering & toggling of unread chat count badge next to back arrow in WA header.
 */

'use strict';

/** Render or update Unread Badge UI in header */
function updateUnreadBadgeUI(stateObj) {
  const badgeEl = document.getElementById('wa-unread-badge');
  if (!badgeEl) return;

  const count = stateObj.unreadCount ?? '';
  const show = !!stateObj.showUnreadBadge && count !== '';

  if (show) {
    badgeEl.textContent = count;
    badgeEl.style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
  }
}

/** Return Dashboard controls HTML for Unread Badge settings */
function renderUnreadBadgeControlsHtml(stateObj) {
  const show = !!stateObj.showUnreadBadge;
  const count = stateObj.unreadCount ?? '99+';

  return `
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-emerald-400 flex items-center gap-1">
          🟢 Unread Chat Count Badge (&lt; 99+)
        </span>
        <button onclick="toggleUnreadBadge()"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${show ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
          ${show ? 'ON' : 'OFF'}
        </button>
      </div>

      <div class="${show ? '' : 'hidden'} space-y-2" id="wrap-unread-controls">
        <label class="block text-[10px] text-gray-400 mb-1">Jumlah Pesan Belum Dibaca</label>
        <div class="flex gap-2">
          <input type="text" placeholder="e.g. 99+ atau 14" value="${count}"
                 oninput="setUnreadCount(this.value)"
                 class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
          <button onclick="setUnreadCount('99+')"
                  class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-700 font-semibold">
            99+
          </button>
          <button onclick="setUnreadCount('14')"
                  class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-700 font-semibold">
            14
          </button>
        </div>
      </div>
    </div>
  `;
}
