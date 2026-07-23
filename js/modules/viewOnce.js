/**
 * viewOnce.js — WhatsApp View Once Photo (Foto Sekali Lihat ①) Feature Module
 * Pixel-perfect WhatsApp View Once photo bubble rendering with dashed ring SVG.
 */

'use strict';

/** Return HTML for WhatsApp View Once Photo bubble */
function renderViewOnceBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const isOpened = !!msg.viewOnceOpened;
  const customText = msg.viewOnceText ? escHtmlFn(msg.viewOnceText) : '';
  const defaultText = isOpened ? 'Opened' : 'Photo';
  const labelText = customText || defaultText;

  // Colors based on opened/unopened state
  const accentColor = isOpened ? '#8696A0' : '#00A884';
  const fontStyle = isOpened ? 'font-style:italic;' : 'font-weight:600;';
  const labelColor = isOpened ? 'rgba(233,237,239,0.6)' : '#E9EDEF';

  // SVG Dashed Circle with number 1 (Official WhatsApp View Once icon)
  const viewOnceSvgIcon = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
      <circle cx="12" cy="12" r="9.5" stroke="${accentColor}" stroke-width="2" stroke-dasharray="3.5 2.2" stroke-linecap="round"/>
      <text x="12" y="15.5" font-size="11.5" font-weight="800" fill="${accentColor}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">1</text>
    </svg>
  `;

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:175px; max-width:220px;
                padding:7px 10px 5px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
      ${groupBadgeHtml}

      <div style="display:flex; align-items:center; gap:9px; margin-top:2px;">
        <!-- Dashed Ring View Once SVG Icon -->
        ${viewOnceSvgIcon}

        <!-- Label: Photo / Opened -->
        <span style="font-size:14px; color:${labelColor}; ${fontStyle} letter-spacing:0.1px;">
          ${labelText}
        </span>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:3px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for View Once Photo settings */
function renderViewOnceControlsHtml(msg) {
  const isOpened = !!msg.viewOnceOpened;
  const customText = escHtml(msg.viewOnceText || '');

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          📸 Foto Sekali Lihat (View Once ①)
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Status Foto</label>
          <select onchange="setMsgViewOnceOpened('${msg.id}', this.value === 'true')"
                  class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent">
            <option value="false" ${!isOpened ? 'selected' : ''}>① Photo (Belum Dibuka — Hijau)</option>
            <option value="true" ${isOpened ? 'selected' : ''}>① Opened (Sudah Dibuka — Abu-abu)</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Label Custom (Opsional)</label>
          <input type="text" placeholder="e.g. Photo / Opened / Foto" value="${customText}"
                 oninput="setMsgViewOnceText('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
    </div>
  `;
}
