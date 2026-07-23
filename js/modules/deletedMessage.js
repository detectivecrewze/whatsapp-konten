/**
 * deletedMessage.js — WhatsApp Deleted Message ("Pesan ini telah dihapus") Feature Module
 * Handles rendering of deleted message bubbles in WhatsApp style.
 */

'use strict';

/** Return HTML for WhatsApp Deleted Message bubble */
function renderDeletedMessageBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  // Text varies slightly depending on incoming/outgoing
  const defaultText = isOut ? 'Anda telah menghapus pesan ini' : 'Pesan ini telah dihapus';
  const deletedText = msg.deletedText ? escHtmlFn(msg.deletedText) : defaultText;

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:210px; max-width:265px;
                padding:7px 10px 5px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
      ${groupBadgeHtml}

      <div style="display:flex; align-items:center; gap:7px; margin-top:2px;">
        <!-- Prohibited / Deleted Circle Icon -->
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(233,237,239,0.55)"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>

        <!-- Deleted Message Text -->
        <span style="font-size:13px; font-style:italic; color:rgba(233,237,239,0.55); font-weight:400; line-height:1.4;">
          ${deletedText}
        </span>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:3px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.45);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for Deleted Message settings */
function renderDeletedMessageControlsHtml(msg) {
  const isOut = msg.direction === 'outgoing';
  const textVal = escHtml(msg.deletedText || (isOut ? 'Anda telah menghapus pesan ini' : 'Pesan ini telah dihapus'));

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2 space-y-1.5 mt-2">
      <span class="text-[11px] font-semibold text-red-400 flex items-center gap-1">
        🚫 Pengaturan Pesan Terhapus
      </span>
      <div>
        <label class="block text-[10px] text-gray-400 mb-1">Teks Pesan Terhapus</label>
        <input type="text" value="${textVal}"
               oninput="setMsgDeletedText('${msg.id}', this.value)"
               class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                      text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      </div>
    </div>
  `;
}
