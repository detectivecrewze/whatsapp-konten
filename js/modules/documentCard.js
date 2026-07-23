/**
 * documentCard.js — WhatsApp Document / PDF Attachment Card Feature Module
 * Handles Document attachment bubble rendering & controls in WhatsApp style.
 */

'use strict';

/** Return HTML for WhatsApp Document attachment bubble */
function renderDocumentCardBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const docName = msg.docName ? escHtmlFn(msg.docName) : 'Surat_Perjanjian.pdf';
  const docSize = msg.docSize ? escHtmlFn(msg.docSize) : '2.4 MB • PDF';

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:240px; max-width:275px;
                padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.35);">
      ${groupBadgeHtml}

      <!-- Document Inner Card Container -->
      <div style="background:rgba(0,0,0,0.22); border-radius:9px; padding:9px 11px;
                  display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,0.08); margin-top:2px;">
        <!-- PDF Document Icon Circle -->
        <div style="width:36px; height:36px; border-radius:8px; background:#EB5757;
                    display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </div>

        <!-- Document Title & Meta -->
        <div style="min-width:0; flex:1;">
          <div style="font-size:13px; font-weight:600; color:#E9EDEF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">
            ${docName}
          </div>
          <div style="font-size:11px; color:rgba(233,237,239,0.55); font-weight:500;">
            ${docSize}
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

/** Return Dashboard controls HTML for Document settings */
function renderDocumentCardControlsHtml(msg) {
  const name = escHtml(msg.docName || 'Surat_Perjanjian.pdf');
  const size = escHtml(msg.docSize || '2.4 MB • PDF');

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
          📄 Lampiran File / Dokumen PDF
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nama File Dokumen</label>
          <input type="text" placeholder="e.g. Surat_Perjanjian.pdf" value="${name}"
                 oninput="setMsgDocName('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Ukuran & Format</label>
          <input type="text" placeholder="e.g. 2.4 MB • PDF" value="${size}"
                 oninput="setMsgDocSize('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
    </div>
  `;
}
