/**
 * contactCard.js — WhatsApp Contact Sharing Card Feature Module
 * Handles rendering of WhatsApp "Share Contact" (Bagikan Kontak) bubbles.
 */

'use strict';

/** Return HTML for WhatsApp Contact Card bubble */
function renderContactCardBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const name  = msg.contactName ? escHtmlFn(msg.contactName) : 'Budi Kantor';
  const phone = msg.contactPhone ? escHtmlFn(msg.contactPhone) : '+62 812-3456-7890';
  const pfp   = msg.contactDataUrl || null;

  return `
    <div style="background:${bg}; border-radius:${br}; width:230px; overflow:hidden;
                box-shadow:0 1px 3px rgba(0,0,0,0.35); text-align:left;">
      ${groupBadgeHtml}

      <!-- Contact Header Info -->
      <div style="padding:10px 12px; display:flex; align-items:center; gap:10px;">
        <!-- Contact Avatar -->
        <div style="position:relative; width:44px; height:44px; border-radius:50%; flex-shrink:0; overflow:hidden; background:#00A884; display:flex; align-items:center; justify-content:center;">
          ${pfp ? `
            <img src="${pfp}" style="width:100%; height:100%; object-fit:cover; display:block;" />
          ` : `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          `}
        </div>

        <!-- Name & Number -->
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:700; color:#E9EDEF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.25;">
            ${name}
          </div>
          <div style="font-size:11.5px; color:#8696A0; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${phone}
          </div>
        </div>
      </div>

      <!-- Action Button: Kirim Pesan -->
      <div style="border-top:1px solid rgba(255,255,255,0.08); padding:8px 10px;
                  display:flex; align-items:center; justify-content:center; gap:6px; color:#00A884;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
        </svg>
        <span style="font-size:12.5px; font-weight:700;">Kirim Pesan</span>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; padding:0 8px 5px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for Contact Card settings */
function renderContactCardControlsHtml(msg) {
  const name  = escHtml(msg.contactName || 'Budi Kantor');
  const phone = escHtml(msg.contactPhone || '+62 812-3456-7890');
  const hasPfp = !!msg.contactDataUrl;

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          👤 Kartu Kontak WA / Bagikan Kontak
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nama Kontak</label>
          <input type="text" placeholder="e.g. Budi Kantor" value="${name}"
                 oninput="setMsgContactName('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nomor Telepon / Subtitle</label>
          <input type="text" placeholder="e.g. +62 812-3456-7890" value="${phone}"
                 oninput="setMsgContactPhone('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-1">Foto Profil Kontak</label>
        <label class="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-wa-accent transition">
          <span class="text-xs text-gray-300 truncate">${hasPfp ? '👤 Foto Profil Terpasang' : 'Upload Foto Profil Kontak…'}</span>
          <input type="file" accept="image/*" class="hidden" onchange="handleContactPfpUpload('${msg.id}', this)" />
          <span class="text-[10px] bg-wa-accent/20 text-wa-accent px-1.5 py-0.5 rounded font-bold">Pilih</span>
        </label>
      </div>
    </div>
  `;
}
