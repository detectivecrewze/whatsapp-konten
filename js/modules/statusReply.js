/**
 * statusReply.js — WhatsApp Status / Story Reply Feature Module
 * Pixel-perfect WhatsApp status reply bubble matching official WhatsApp Android UI.
 */

'use strict';

/** Return HTML for WhatsApp Status Reply bubble */
function renderStatusReplyBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const innerQuoteBg = isOut ? '#024D3E' : '#182229';
  const replyText = msg.text ? escHtmlFn(msg.text) : 'sayangg, hari ini tanggal 1 loh';
  const statusContent = msg.statusText ? escHtmlFn(msg.statusText) : 'Status Anda';
  const statusAuthor = msg.statusAuthor ? escHtmlFn(msg.statusAuthor) : (isOut ? 'Anda' : 'Status Anda');
  const statusImg = msg.statusDataUrl || null;

  // Small Camera SVG Icon
  const cameraIconSvg = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#8696A0" style="flex-shrink:0;">
      <path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm9-9h-3.17l-1.86-2H8.03L6.17 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-9 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
  `;

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:210px; max-width:280px;
                padding:4px 4px 5px; box-shadow:0 1px 3px rgba(0,0,0,0.35); text-align:left !important; display:block !important;">
      ${groupBadgeHtml}

      <!-- Status Quote Header Card -->
      <div style="background:${innerQuoteBg}; border-radius:8px; overflow:hidden;
                  display:flex; align-items:stretch; margin-bottom:6px; text-align:left !important; width:100% !important;">
        <!-- Left Vertical Accent Pill Bar -->
        <div style="width:4px; background:#06CF9C; flex-shrink:0;"></div>

        <!-- Content -->
        <div style="padding:6px 9px 6px 8px; flex:1; min-width:0; text-align:left !important;">
          <!-- Status Author (Green) -->
          <div style="font-size:12px; font-weight:700; color:#06CF9C; line-height:1.2; margin-bottom:3px; text-align:left !important;">
            ${statusAuthor}
          </div>

          <!-- Status Content (Camera Icon + Italicized Text) -->
          <div style="display:flex; align-items:center; gap:5px; text-align:left !important; justify-content:flex-start !important;">
            ${cameraIconSvg}
            <span style="font-size:12px; color:#8696A0; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left !important;">
              ${statusContent}
            </span>
          </div>
        </div>

        <!-- Optional Status Image Thumbnail -->
        ${statusImg ? `
          <img src="${statusImg}" style="width:44px; height:44px; object-fit:cover; flex-shrink:0;" />
        ` : ''}
      </div>

      <!-- Main Reply Message Text (Strictly Left Aligned) -->
      <div style="padding:4px 8px 2px; text-align:left !important; width:100% !important; box-sizing:border-box !important;">
        <p style="color:#E9EDEF; font-size:14px; line-height:1.45; margin:0; word-break:break-word; white-space:pre-wrap; text-align:left !important; display:block !important; width:100% !important;">${replyText}</p>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:2px; padding-right:4px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for Status Reply settings */
function renderStatusReplyControlsHtml(msg) {
  const replyText = escHtml(msg.text || 'sayangg, hari ini tanggal 1 loh');
  const statusText = escHtml(msg.statusText || 'Status Anda');
  const statusAuthor = escHtml(msg.statusAuthor || 'Status Anda');
  const hasImg = !!msg.statusDataUrl;

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          💬 Balasan Status / Story WA
        </span>
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-1">Teks Balasan Kamu</label>
        <input type="text" placeholder="e.g. sayangg, hari ini tanggal 1 loh" value="${replyText}"
               oninput="setMsgText('${msg.id}', this.value)"
               class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                      text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nama Pembuat Status</label>
          <input type="text" placeholder="e.g. Status Anda" value="${statusAuthor}"
                 oninput="setMsgStatusAuthor('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Teks Keterangan Status</label>
          <input type="text" placeholder="e.g. Status Anda / Foto" value="${statusText}"
                 oninput="setMsgStatusText('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-1">Foto Thumbnail Story (Opsional)</label>
        <label class="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-wa-accent transition">
          <span class="text-xs text-gray-300 truncate">${hasImg ? '📷 Foto Story Terpasang' : 'Upload Foto Story…'}</span>
          <input type="file" accept="image/*" class="hidden" onchange="handleStatusImgUpload('${msg.id}', this)" />
          <span class="text-[10px] bg-wa-accent/20 text-wa-accent px-1.5 py-0.5 rounded font-bold">Pilih</span>
        </label>
      </div>
    </div>
  `;
}
