/**
 * locationCard.js — WhatsApp Live Location Card Feature Module
 * Handles rendering of WhatsApp Live Location bubbles & Map styling.
 */

'use strict';

/** Return HTML for WhatsApp Live Location bubble */
function renderLocationCardBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const locTitle = msg.locTitle ? escHtmlFn(msg.locTitle) : 'Lokasi terkini';
  const locSub = msg.locSub ? escHtmlFn(msg.locSub) : 'Berbagi lokasi langsung';

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:240px; max-width:275px;
                padding:7px 8px 5px; box-shadow:0 1px 3px rgba(0,0,0,0.35);">
      ${groupBadgeHtml}

      <!-- Map Card Container -->
      <div style="background:#131B20; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-top:2px;">
        <!-- Simulated Map View -->
        <div style="height:100px; background:#1C2930; position:relative; display:flex; align-items:center; justify-content:center;
                    background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 0); background-size:12px 12px;">
          <!-- Map Roads simulation lines -->
          <div style="position:absolute; width:100%; height:2px; background:rgba(255,255,255,0.1); top:40%;"></div>
          <div style="position:absolute; width:2px; height:100%; background:rgba(255,255,255,0.1); left:55%;"></div>

          <!-- Red Map Pin Pulse Circle -->
          <div style="position:relative; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:rgba(235,87,87,0.25); animation:pulse 1.8s infinite;"></div>
            <div style="width:28px; height:28px; border-radius:50%; background:#EB5757; border:2px solid #FFFFFF;
                        display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.4); z-index:2;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Location Info Details -->
        <div style="padding:8px 10px; background:#1F2C34;">
          <div style="font-size:13px; font-weight:600; color:#E9EDEF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">
            📍 ${locTitle}
          </div>
          <div style="font-size:11px; color:#00A884; font-weight:500;">
            ${locSub}
          </div>
        </div>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:4px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for Live Location settings */
function renderLocationCardControlsHtml(msg) {
  const title = escHtml(msg.locTitle || 'Monas, Jakarta Pusat');
  const sub = escHtml(msg.locSub || 'Berbagi lokasi sampai 17:30');

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          📍 Kartu Lokasi Langsung (Live Location)
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nama Tempat / Alamat</label>
          <input type="text" placeholder="e.g. Monas, Jakarta Pusat" value="${title}"
                 oninput="setMsgLocTitle('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Keterangan / Waktu</label>
          <input type="text" placeholder="e.g. Berbagi lokasi sampai 17:30" value="${sub}"
                 oninput="setMsgLocSub('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
    </div>
  `;
}
