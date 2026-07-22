/**
 * preview.js — Clean Preview Animation Engine
 * Reads state from localStorage (key: "wa_preview") and plays
 * the chat animation with countdown + typing indicators.
 */

'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function msgTime(index) {
  return (previewState && previewState.time) ? previewState.time : '16:12';
}

function svgReadTicks() {
  return `<svg width="14" height="10" viewBox="0 0 18 11" fill="none"
               style="flex-shrink:0;">
    <path d="M1 5.5L5.5 10L11 2" stroke="#53BDEB" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 5.5L11.5 10L17 2" stroke="#53BDEB" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ── Bubble renderer ─────────────────────────────────────── */
function createBubble(msg, idx) {
  const time  = msgTime(idx);
  const isOut = msg.direction === 'outgoing';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: flex;
    justify-content: ${isOut ? 'flex-end' : 'flex-start'};
    align-items: flex-end;
    margin-bottom: 6px;
    width: 100%;
    box-sizing: border-box;
    padding: 0 4px;
  `;
  wrapper.setAttribute('data-frame-index', idx);
  wrapper.style.display = 'none'; // hidden until applyFrame reveals it

  let html = '';

  // TEXT
  if (msg.type === 'text') {
    const bg = isOut ? '#005C4B' : '#202C33';
    const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
    html = `
      <div style="background:${bg}; border-radius:${br}; max-width:270px;
                  padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                  word-break:break-word; white-space:pre-wrap;">${escHtml(msg.text || '')}</p>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; margin-top:4px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
          ${isOut ? svgReadTicks() : ''}
        </div>
      </div>`;
  }

  // IMAGE / GIF
  else if (msg.type === 'image') {
    const bg = isOut ? '#005C4B' : '#202C33';
    const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
    if (!msg.dataUrl) {
      html = `<div style="background:${bg}; border-radius:${br}; width:200px; height:120px;
                          display:flex; align-items:center; justify-content:center; opacity:0.4;">
                <span style="font-size:11px; color:#8696A0;">Image / GIF</span>
              </div>`;
    } else {
      const gifLabel = msg.isGif
        ? `<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.6);
                       color:#00A884;font-size:10px;font-weight:700;padding:2px 5px;
                       border-radius:4px;letter-spacing:0.5px;">GIF</div>`
        : '';
        
      const imgPadding = msg.caption ? 'padding: 4px; padding-bottom: 0;' : 'padding: 0;';
      const borderRadiusImg = msg.caption ? 'border-radius: 8px;' : '';
        
      html = `
        <div style="background:${bg}; border-radius:${br}; max-width:260px;
                    overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.3); ${imgPadding}">
          <div style="position:relative;">
            <img src="${msg.dataUrl}"
                 style="display:block; max-width:260px; max-height:300px;
                        width:100%; object-fit:contain; ${borderRadiusImg}" />
            ${gifLabel}
          </div>
          ${msg.caption ? `
          <div style="padding: 4px 6px 2px;">
            <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                      word-break:break-word; white-space:pre-wrap;">${escHtml(msg.caption)}</p>
          </div>
          ` : ''}
          <div style="display:flex; justify-content:flex-end; align-items:center;
                      gap:3px; padding:3px 8px 6px;">
            <span style="font-size:11px; color:${isOut ? 'rgba(233,237,239,0.55)' : '#8696A0'};">${time}</span>
            ${isOut ? svgReadTicks() : ''}
          </div>
        </div>`;
    }
  }

  // QR CODE
  else if (msg.type === 'qr') {
    html = `
      <div style="background:#005C4B; border-radius:12px 0 12px 12px; max-width:240px;
                  overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <div style="padding:8px 12px 4px;">
          <p style="font-size:11px; color:rgba(233,237,239,0.7); margin:0;">🎁 Your Gift QR Code</p>
        </div>
        <div style="background:white; margin:8px; border-radius:8px; padding:8px;
                    min-width:184px; min-height:184px;
                    display:flex; align-items:center; justify-content:center;">
          ${msg.dataUrl
            ? `<img src="${msg.dataUrl}"
                    style="width:184px; height:184px; object-fit:contain;
                           image-rendering:pixelated; display:block;" />`
            : `<span style="font-size:11px; color:#8696A0; opacity:0.5;">QR Code</span>`}
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; padding:0 8px 8px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
          ${svgReadTicks()}
        </div>
      </div>`;
  }

  wrapper.innerHTML = html;
  return wrapper;
}

/* ── State ─────────────────────────────────────────────────── */
let previewState = null;

function loadState() {
  try {
    const raw = localStorage.getItem('wa_preview');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function applyFrame(n) {
  document.querySelectorAll('#wa-messages > div[data-frame-index]').forEach(el => {
    const idx = parseInt(el.getAttribute('data-frame-index'), 10);
    if (idx < n) {
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  });
  // Scroll to bottom
  const area = document.getElementById('wa-chat-area');
  if (area) area.scrollTop = area.scrollHeight;
}

function showTyping() {
  const el = document.getElementById('wa-typing');
  if (el) el.style.display = 'block';
  const area = document.getElementById('wa-chat-area');
  if (area) area.scrollTop = area.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById('wa-typing');
  if (el) el.style.display = 'none';
}

/* ── Clock ─────────────────────────────────────────────────── */
function updateClock() {
  const el = document.getElementById('wa-time');
  if (!el || !previewState) return;
  el.textContent = previewState.time || '16:12';
}

/* ── Main animation ──────────────────────────────────────── */
const notificationSound = new Audio('assets/notification.mp3');
const outSound = new Audio('assets/sfx-out.mp3');

function initAnimation() {
  document.getElementById('btn-start').style.display = 'none';
  document.getElementById('countdown-num').style.display = 'block';
  document.getElementById('countdown-label').style.display = 'block';
  
  // "Warm up" audio to bypass browser policy
  Promise.all([
    notificationSound.play().then(() => {
      notificationSound.pause();
      notificationSound.currentTime = 0;
    }).catch(e => console.log('Audio init blocked:', e)),
    outSound.play().then(() => {
      outSound.pause();
      outSound.currentTime = 0;
    }).catch(e => console.log('Audio init blocked:', e))
  ]).finally(() => {
    startAnimation();
  });
}

async function startAnimation() {
  if (!previewState) return;

  const messages  = previewState.messages || [];
  const holdMs    = previewState.holdMs   || 2000;
  const useTyping = previewState.useTyping !== false;
  const totalF    = messages.length;

  const replayBtn = document.getElementById('btn-replay');
  if (replayBtn) replayBtn.style.display = 'none';

  // Reset: hide all messages
  applyFrame(0);
  hideTyping();

  // Countdown
  const overlay = document.getElementById('countdown-overlay');
  const numEl   = document.getElementById('countdown-num');
  const lblEl   = document.getElementById('countdown-label');
  overlay.classList.remove('hidden');
  for (let i = 3; i >= 1; i--) {
    numEl.textContent  = i;
    lblEl.textContent  = 'Starting animation…';
    await sleep(900);
  }
  numEl.textContent = '▶';
  lblEl.textContent = 'Recording!';
  await sleep(400);
  overlay.classList.add('hidden');

  // Animate frame by frame
  for (let f = 0; f < totalF; f++) {
    // Typing indicator before each message (except first)
    // ONLY show if the NEXT message is from the other person ('incoming')
    if (useTyping && f > 0 && messages[f].direction === 'incoming') {
      showTyping();
      await sleep(1400);
      hideTyping();
      await sleep(120);
    }

    // Reveal this message with slide-in animation
    applyFrame(f + 1);
    
    // Play sound
    const useSoundIn = previewState.useSoundIn !== false;
    const useSoundOut = previewState.useSoundOut !== false;
    
    if (messages[f].direction === 'incoming' && useSoundIn) {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(e => console.log('Audio play blocked:', e));
    } else if (messages[f].direction === 'outgoing' && useSoundOut) {
      outSound.currentTime = 0;
      outSound.play().catch(e => console.log('Audio play blocked:', e));
    }

    const msgEl = document.querySelector(`#wa-messages > div[data-frame-index="${f}"]`);
    if (msgEl) {
      const isOut = messages[f].direction === 'outgoing';
      const animClass = isOut ? 'msg-enter-out' : 'msg-enter-in';
      msgEl.classList.add(animClass);
      setTimeout(() => msgEl.classList.remove(animClass), 400);
    }

    // Hold
    await sleep(holdMs);
  }

  // End
  if (replayBtn) {
    replayBtn.style.display = 'flex';
  }
}

/* ── Scale to fit window ────────────────────────────────────── */
function fitToScreen() {
  const wrapper = document.getElementById('scale-wrapper');
  const canvas = document.getElementById('wa-canvas');
  if (!wrapper || !canvas) return;
  
  const vh = window.innerHeight;
  canvas.style.transformOrigin = 'top left';

  if (vh < 884) {
    const scale = vh / 884;
    canvas.style.transform = `scale(${scale})`;
    wrapper.style.width = `${390 * scale}px`;
    wrapper.style.height = `${844 * scale}px`;
  } else {
    canvas.style.transform = `scale(1)`;
    wrapper.style.width = `390px`;
    wrapper.style.height = `844px`;
  }
}

window.addEventListener('resize', fitToScreen);

/* ── Boot ─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  fitToScreen();
  updateClock();
  setInterval(updateClock, 30_000);

  previewState = loadState();

  const chatArea = document.getElementById('wa-chat-area');
  if (previewState && chatArea) {
    const bgType = previewState.bgType || 'default';
    chatArea.style.backgroundAttachment = 'local';
    if (bgType === 'default') {
      chatArea.style.backgroundColor = '#111B21';
      chatArea.style.backgroundImage = "url('assets/wa-pattern.svg')";
      chatArea.style.backgroundRepeat = 'repeat';
      chatArea.style.backgroundSize = '400px';
      chatArea.style.backgroundPosition = 'center top';
    } else if (bgType === 'color') {
      chatArea.style.backgroundColor = previewState.bgColor || '#111B21';
      chatArea.style.backgroundImage = "url('assets/wa-pattern.svg')";
      chatArea.style.backgroundRepeat = 'repeat';
      chatArea.style.backgroundSize = '400px';
      chatArea.style.backgroundPosition = 'center top';
    } else if (bgType === 'image') {
      chatArea.style.backgroundColor = '#111B21';
      if (previewState.bgImage) {
        chatArea.style.backgroundImage = `url('${previewState.bgImage}')`;
        chatArea.style.backgroundRepeat = 'repeat';
        chatArea.style.backgroundSize = 'auto';
        chatArea.style.backgroundPosition = 'center top';
      } else {
        chatArea.style.backgroundImage = "url('assets/wa-pattern.svg')";
        chatArea.style.backgroundRepeat = 'repeat';
        chatArea.style.backgroundSize = '400px';
        chatArea.style.backgroundPosition = 'center top';
      }
    }
  }

  if (!previewState || !previewState.messages || previewState.messages.length === 0) {
    document.getElementById('countdown-overlay').classList.add('hidden');
    document.getElementById('wa-canvas').innerHTML +=
      `<div id="error-msg" style="position:absolute; inset:0; display:flex;
           align-items:center; justify-content:center; flex-direction:column; gap:12px;
           background:#111B21; color:#8696A0; font-size:14px; text-align:center; padding:32px;">
         <svg width="48" height="48" viewBox="0 0 24 24" fill="#8696A0">
           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
         </svg>
         <p>No preview data found.</p>
         <p style="font-size:12px;">Go back to the editor and click<br><strong style="color:#00A884;">🎬 Open Clean Preview</strong></p>
       </div>`;
    return;
  }

  // Apply name & PFP
  const nameEl = document.getElementById('wa-name');
  if (nameEl && previewState.name) nameEl.textContent = previewState.name;

  const pfpEl = document.getElementById('wa-pfp');
  const pfpFallback = document.getElementById('wa-pfp-fallback');
  if (pfpEl && previewState.pfp) {
    pfpEl.src = previewState.pfp;
    pfpEl.style.display = 'block';
    if (pfpFallback) pfpFallback.style.display = 'none';
  } else if (pfpEl) {
    pfpEl.dispatchEvent(new Event('error'));
  }

  // Render all bubbles (hidden, applyFrame reveals them)
  const container = document.getElementById('wa-messages');
  previewState.messages.forEach((msg, idx) => {
    const el = createBubble(msg, idx);
    if (el) container.appendChild(el);
  });
});
