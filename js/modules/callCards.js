/**
 * callCards.js — WhatsApp Voice & Video Call Logs Feature Module
 * Handles rendering of Voice Call & Video Call bubbles (Missed & Call Ended with duration).
 */

'use strict';

/** Return HTML for WhatsApp Voice & Video Call Log bubble */
function renderCallCardBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const isVideo = msg.callType === 'video';
  const isMissed = !!msg.callMissed;
  const duration = msg.callDuration ? escHtmlFn(msg.callDuration) : (isMissed ? '' : '12:34');

  // Colors & Labels
  const iconColor = isMissed ? '#EB5757' : (isOut ? '#E9EDEF' : '#00A884');
  
  let callTitle = '';
  if (isVideo) {
    callTitle = isMissed ? 'Panggilan video tak terjawab' : 'Panggilan video';
  } else {
    callTitle = isMissed ? 'Panggilan suara tak terjawab' : 'Panggilan suara';
  }

  if (!isMissed && duration) {
    callTitle += ` (${duration})`;
  }

  // Icons
  const voiceIconSvg = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}" style="flex-shrink:0;">
      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
    </svg>
  `;

  const videoIconSvg = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}" style="flex-shrink:0;">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  `;

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:210px; max-width:265px;
                padding:8px 11px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.35);">
      ${groupBadgeHtml}

      <div style="display:flex; align-items:center; gap:10px; margin-top:2px;">
        <!-- Icon Circle -->
        <div style="width:34px; height:34px; border-radius:50%; background:rgba(0,0,0,0.2);
                    display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          ${isVideo ? videoIconSvg : voiceIconSvg}
        </div>

        <!-- Title & Status -->
        <div style="min-width:0; flex:1;">
          <div style="font-size:13px; font-weight:600; color:${isMissed ? '#EB5757' : '#E9EDEF'}; line-height:1.35; word-break:break-word;">
            ${callTitle}
          </div>
          <div style="font-size:11px; color:rgba(233,237,239,0.55); margin-top:1px;">
            ${isMissed ? 'Ketuk untuk memanggil balik' : 'Selesai'}
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

/** Return Dashboard controls HTML for Call Log settings */
function renderCallCardControlsHtml(msg) {
  const isVideo = msg.callType === 'video';
  const isMissed = !!msg.callMissed;
  const duration = escHtml(msg.callDuration || '12:34');

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          📞/📹 Riwayat Panggilan (Voice / Video Call)
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Jenis Panggilan</label>
          <select onchange="setMsgCallType('${msg.id}', this.value)"
                  class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent">
            <option value="voice" ${!isVideo ? 'selected' : ''}>📞 Panggilan Suara</option>
            <option value="video" ${isVideo ? 'selected' : ''}>📹 Panggilan Video</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Status Panggilan</label>
          <select onchange="setMsgCallMissed('${msg.id}', this.value === 'true')"
                  class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent">
            <option value="false" ${!isMissed ? 'selected' : ''}>🟢 Terhubung / Selesai</option>
            <option value="true" ${isMissed ? 'selected' : ''}>🔴 Tak Terjawab (Missed)</option>
          </select>
        </div>
      </div>
      <div class="${isMissed ? 'hidden' : ''}">
        <label class="block text-[10px] text-gray-400 mb-1">Durasi Panggilan</label>
        <input type="text" placeholder="e.g. 12:34 atau 45 mnt" value="${duration}"
               oninput="setMsgCallDuration('${msg.id}', this.value)"
               class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                      text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      </div>
    </div>
  `;
}
