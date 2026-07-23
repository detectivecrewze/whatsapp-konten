/**
 * voiceNote.js — WhatsApp Voice Note (VN) Message Module
 * Handles Voice Note Bubble Rendering, Interactive Waveform Animations & Controls.
 */

'use strict';

// Add CSS keyframes for animated VN waveform once
if (typeof document !== 'undefined' && !document.getElementById('vn-animation-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'vn-animation-styles';
  styleEl.innerHTML = `
    @keyframes vnWavePulse {
      0%, 100% { transform: scaleY(0.35); opacity: 0.5; }
      50% { transform: scaleY(1.35); opacity: 1; }
    }
    .vn-animating .vn-bar {
      animation: vnWavePulse 0.7s ease-in-out infinite alternate;
    }
  `;
  document.head.appendChild(styleEl);
}

/** Return HTML for WhatsApp Voice Note bubble */
function renderVoiceNoteBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
  const durationText = msg.vnDuration || '0:14';
  const isPlayed = msg.vnPlayed !== false; // default true (blue mic)

  // Mic Icon Color (Blue if listened, Green if unplayed)
  const micColor = isPlayed ? '#53BDEB' : '#00A884';

  // Simulated Waveform Bars (Heights in px with staggered animation delays)
  const barHeights = [6, 12, 18, 10, 22, 14, 8, 20, 16, 24, 12, 18, 10, 14, 8, 16, 22, 12, 6, 14, 10, 18, 12, 6];
  const waveformHtml = barHeights.map((h, i) => {
    const isPast = i < 11; // active played part
    const color = isPast ? (isOut ? '#E9EDEF' : micColor) : 'rgba(233,237,239,0.35)';
    const delay = ((i % 5) * 0.12).toFixed(2);
    return `<div class="vn-bar" style="width:2.5px; height:${h}px; background:${color}; border-radius:2px; flex-shrink:0; transform-origin:center; animation-delay:${delay}s;"></div>`;
  }).join('');

  const msgId = msg.id || '';

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:240px; max-width:270px;
                padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
      ${groupBadgeHtml}
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px; margin-top:2px;">
        <!-- Play Button Circle with Mic Badge -->
        <div style="position:relative; flex-shrink:0;">
          <div id="vn-play-btn-${msgId}" onclick="toggleVnPlayback('${msgId}')"
               style="width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.12);
                      display:flex; align-items:center; justify-content:center; cursor:pointer;
                      transition:transform 0.15s ease;"
               onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
            <!-- Play Arrow SVG -->
            <svg id="vn-icon-play-${msgId}" width="18" height="18" viewBox="0 0 24 24" fill="#E9EDEF">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <!-- Pause SVG (hidden initially) -->
            <svg id="vn-icon-pause-${msgId}" width="18" height="18" viewBox="0 0 24 24" fill="#E9EDEF" style="display:none;">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </div>
          <!-- Mic badge indicator -->
          <div style="position:absolute; bottom:-1px; right:-1px; width:14px; height:14px;
                      border-radius:50%; background:#202C33; display:flex; align-items:center; justify-content:center;">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="${micColor}">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
            </svg>
          </div>
        </div>

        <!-- Waveform + Duration -->
        <div style="flex:1; min-width:0;">
          <!-- Waveform container -->
          <div id="vn-waveform-${msgId}" style="display:flex; align-items:center; gap:2px; height:24px; overflow:hidden;">
            ${waveformHtml}
          </div>
          <!-- Duration label -->
          <div id="vn-duration-${msgId}" style="font-size:11px; color:rgba(233,237,239,0.6); margin-top:2px; font-weight:500;">
            ${escHtmlFn(durationText)}
          </div>
        </div>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:2px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Global active playing timers map */
const _vnActiveTimers = {};

/** Toggle play/pause waveform animation for a Voice Note */
function toggleVnPlayback(msgId) {
  const iconPlay = document.getElementById(`vn-icon-play-${msgId}`);
  const iconPause = document.getElementById(`vn-icon-pause-${msgId}`);
  const waveform = document.getElementById(`vn-waveform-${msgId}`);

  if (!waveform) return;

  const isPlaying = waveform.classList.contains('vn-animating');

  if (isPlaying) {
    // Stop playback
    waveform.classList.remove('vn-animating');
    if (iconPlay) iconPlay.style.display = 'block';
    if (iconPause) iconPause.style.display = 'none';

    if (_vnActiveTimers[msgId]) {
      clearInterval(_vnActiveTimers[msgId]);
      delete _vnActiveTimers[msgId];
    }
  } else {
    // Start playback animation
    waveform.classList.add('vn-animating');
    if (iconPlay) iconPlay.style.display = 'none';
    if (iconPause) iconPause.style.display = 'block';

    // Auto stop after 4 seconds if clicked manually
    if (_vnActiveTimers[msgId]) clearInterval(_vnActiveTimers[msgId]);
    _vnActiveTimers[msgId] = setTimeout(() => {
      waveform.classList.remove('vn-animating');
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      delete _vnActiveTimers[msgId];
    }, 4500);
  }
}

/** Automatically trigger VN waveform animation during Play Preview */
function triggerVnAnimationOnFrame(msgId) {
  if (!msgId) return;
  const waveform = document.getElementById(`vn-waveform-${msgId}`);
  const iconPlay = document.getElementById(`vn-icon-play-${msgId}`);
  const iconPause = document.getElementById(`vn-icon-pause-${msgId}`);

  if (waveform) {
    waveform.classList.add('vn-animating');
    if (iconPlay) iconPlay.style.display = 'none';
    if (iconPause) iconPause.style.display = 'block';

    setTimeout(() => {
      waveform.classList.remove('vn-animating');
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
    }, 2800);
  }
}

/** Return Dashboard controls HTML for Voice Note settings */
function renderVoiceNoteControlsHtml(msg) {
  const duration = escHtml(msg.vnDuration || '0:14');
  const isPlayed = msg.vnPlayed !== false;

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-sky-400 flex items-center gap-1">
          🎙️ Pengaturan Voice Note (Pesan Suara)
        </span>
        <button type="button" onclick="toggleVnPlayback('${msg.id}')"
                class="px-2 py-0.5 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 rounded text-[10px] font-medium transition">
          ▶ Test Animasi
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Durasi (Menit:Detik)</label>
          <input type="text" placeholder="e.g. 0:14" value="${duration}"
                 oninput="setMsgVnDuration('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Status Mikrofon</label>
          <select onchange="setMsgVnPlayed('${msg.id}', this.value === 'true')"
                  class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent">
            <option value="true" ${isPlayed ? 'selected' : ''}>🎙️ Biru (Sudah Diputar)</option>
            <option value="false" ${!isPlayed ? 'selected' : ''}>🎙️ Hijau (Belum Diputar)</option>
          </select>
        </div>
      </div>
    </div>
  `;
}
