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
  if (typeof index === 'number' && previewState && previewState.messages && previewState.messages[index] && previewState.messages[index].time) {
    return previewState.messages[index].time;
  }
  return (previewState && previewState.time) ? previewState.time : '16:12';
}

function svgReadTicks() {
  return `<svg width="16" height="11" viewBox="0 0 16 11" fill="none" style="flex-shrink:0;">
    <path d="M11.01 1.8L4.62 8.19L2.3 5.87L1.24 6.93L4.62 10.31L12.07 2.86L11.01 1.8Z" fill="#53BDEB"/>
    <path d="M14.77 1.8L8.38 8.19L7.15 6.96L6.09 8.02L8.38 10.31L15.83 2.86L14.77 1.8Z" fill="#53BDEB"/>
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

  const groupBadgeHtml = (previewState && previewState.chatType === 'group' && !isOut && typeof renderGroupSenderBadge === 'function')
    ? renderGroupSenderBadge(msg)
    : '';

  // TEXT
  if (msg.type === 'text') {
    const bg = isOut ? '#005C4B' : '#202C33';
    const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
    html = `
      <div style="background:${bg}; border-radius:${br}; max-width:270px;
                  padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        ${groupBadgeHtml}
        <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                  word-break:break-word; white-space:pre-wrap;">${escHtml(msg.text || '')}</p>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; margin-top:4px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
          ${isOut ? svgReadTicks() : ''}
        </div>
      </div>`;
  }

  // VOICE NOTE
  else if (msg.type === 'voice' && typeof renderVoiceNoteBubble === 'function') {
    html = renderVoiceNoteBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // NOTIFICATION PUSH BANNER (Floating overlay, hidden from message stream)
  else if (msg.type === 'notification') {
    wrapper.style.display = 'none';
    return wrapper;
  }

  // BUKTI TRANSFER
  else if (msg.type === 'transfer' && typeof renderTransferCardBubble === 'function') {
    html = renderTransferCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // PESAN TERHAPUS
  else if (msg.type === 'deleted' && typeof renderDeletedMessageBubble === 'function') {
    html = renderDeletedMessageBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // LOKASI LANGSUNG
  else if (msg.type === 'location' && typeof renderLocationCardBubble === 'function') {
    html = renderLocationCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // FOTO SEKALI LIHAT
  else if (msg.type === 'view_once' && typeof renderViewOnceBubble === 'function') {
    html = renderViewOnceBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // DOKUMEN PDF
  else if (msg.type === 'document' && typeof renderDocumentCardBubble === 'function') {
    html = renderDocumentCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // RIWAYAT PANGGILAN (VOICE / VIDEO)
  else if (msg.type === 'call' && typeof renderCallCardBubble === 'function') {
    html = renderCallCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // BALASAN STATUS / STORY WA
  else if (msg.type === 'status_reply' && typeof renderStatusReplyBubble === 'function') {
    html = renderStatusReplyBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // KARTU PRODUK KATALOG OLSHOP WA
  else if (msg.type === 'product' && typeof renderProductCardBubble === 'function') {
    html = renderProductCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
  }

  // KARTU KONTAK WA (BAGIKAN KONTAK)
  else if (msg.type === 'contact' && typeof renderContactCardBubble === 'function') {
    html = renderContactCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupBadgeHtml);
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

function updatePushNotifOverlay(msg) {
  const overlay = document.getElementById('wa-push-notif-overlay');
  if (!overlay) return;
  if (msg && msg.type === 'notification') {
    const senderEl = document.getElementById('wa-notif-overlay-sender');
    const textEl   = document.getElementById('wa-notif-overlay-text');
    const timeEl   = document.getElementById('wa-notif-overlay-time');
    if (senderEl) senderEl.textContent = msg.senderName || 'Notifikasi Baru';
    if (textEl) textEl.textContent = msg.text || '';
    if (timeEl) timeEl.textContent = msg.time || (previewState ? previewState.time : '20:00');

    overlay.style.display = 'block';
    requestAnimationFrame(() => {
      overlay.style.transform = 'translateY(0)';
      overlay.style.opacity = '1';
    });
  } else {
    overlay.style.transform = 'translateY(-25px)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.style.opacity === '0') overlay.style.display = 'none';
    }, 350);
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

  const currentMsg = (n > 0 && previewState && previewState.messages) ? previewState.messages[n - 1] : null;
  updatePushNotifOverlay(currentMsg);

  // Trigger VN animation if newly revealed message is a Voice Note
  if (n > 0 && previewState && previewState.messages && previewState.messages[n - 1]?.type === 'voice') {
    if (typeof triggerVnAnimationOnFrame === 'function') {
      triggerVnAnimationOnFrame(previewState.messages[n - 1].id);
    }
  }

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

let currentBaseScale = 1;

function resetZoom() {
  const messagesContainer = document.getElementById('wa-messages');
  if (!messagesContainer) return;
  const zoomSpeed = previewState ? (previewState.zoomSpeed || 0.45) : 0.45;
  messagesContainer.style.transition = `transform ${zoomSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`;
  messagesContainer.style.transformOrigin = 'bottom center';
  messagesContainer.style.transform = 'scale(1)';
}

function triggerAutoZoom(msgEl, isOut, customScaleOverride) {
  if (!previewState || !msgEl) return;
  const messagesContainer = document.getElementById('wa-messages');
  if (!messagesContainer) return;

  const scaleInput    = (previewState && previewState.zoomScale) ? previewState.zoomScale : 1.15;
  const zoomIntensity = parseFloat(customScaleOverride || scaleInput || '1.15');
  const zoomSpeed     = (previewState && previewState.zoomSpeed) ? previewState.zoomSpeed : 0.45;

  const originX = isOut ? '85%' : '15%';

  messagesContainer.style.transition = `transform ${zoomSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`;
  messagesContainer.style.transformOrigin = `${originX} bottom`;
  messagesContainer.style.transform = `scale(${zoomIntensity})`;
}

async function fetchElevenLabsAudioBlob(rawText, voiceId = 'pNInz6obpgDQGcFmaJgB', apiKey = '') {
  if (!rawText) return null;
  const cleanText = rawText.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
  if (!cleanText) return null;

  const keyToUse = apiKey || localStorage.getItem('wa_eleven_api_key') || 'sk_aec3efa2efccb7f5155c04757341c942e1dccdb5fb7e9e20';
  let targetVoice = (!voiceId || voiceId === 'custom' || voiceId === 'google-mp3') ? 'EXAVITQu4vr4xnSDxMaL' : voiceId;
  const emotionMode = (previewState && previewState.ttsEmotion) ? previewState.ttsEmotion : 'horror';

  // Horror & Suspense settings: Low stability (0.25) + High style exaggeration (0.50)
  const settingsMap = {
    horror:         { stability: 0.25, similarity_boost: 0.85, style: 0.50, use_speaker_boost: true },
    dramatic:       { stability: 0.35, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true },
    conversational: { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true }
  };
  const voiceSettings = settingsMap[emotionMode] || settingsMap.horror;

  console.log(`🎙️ [ElevenLabs API] Generating ${emotionMode.toUpperCase()} voice for "${cleanText.slice(0, 30)}..." | VoiceID: ${targetVoice}`);

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': keyToUse,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ ElevenLabs API Error (${res.status}):`, errText);
      alert(`⚠️ ElevenLabs API Error (${res.status}): ${errText}`);
      return null;
    }

    const blob = await res.blob();
    console.log(`✅ ElevenLabs AI Audio fetched! Size: ${blob.size} bytes`);
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('❌ ElevenLabs fetch exception:', err);
    return null;
  }
}

function playBlobAudio(blobUrl, speedRate = 1.0) {
  return new Promise((resolve) => {
    if (!blobUrl) {
      resolve();
      return;
    }

    const audio = new Audio();
    audio.src = blobUrl;
    audio.playbackRate = speedRate;

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    audio.onended = finish;
    audio.onerror = finish;

    audio.onloadedmetadata = () => {
      const durMs = Math.max(1200, Math.round((audio.duration / speedRate) * 1000));
      setTimeout(finish, durMs + 400);
    };

    audio.play().catch(err => {
      console.warn('Audio playback error:', err);
      finish();
    });
  });
}

async function startAnimation() {
  if (!previewState) return;

  const messages   = previewState.messages || [];
  const holdMs     = previewState.holdMs   || 2000;
  const replyDelay = previewState.replyDelay || 1400;
  const useTyping  = previewState.useTyping !== false;
  const autoZoom   = previewState.autoZoom === true;
  const enableTts  = previewState.enableTts === true;
  const totalF     = messages.length;

  const replayBtn = document.getElementById('btn-replay');
  if (replayBtn) replayBtn.style.display = 'none';

  // Reset: hide all messages & reset zoom
  resetZoom();
  applyFrame(0);
  hideTyping();

  // Countdown
  const overlay = document.getElementById('countdown-overlay');
  const numEl   = document.getElementById('countdown-num');
  const lblEl   = document.getElementById('countdown-label');
  overlay.classList.remove('hidden');

  // Pre-fetch ElevenLabs Audio Blobs sequentially to strictly obey rate limits (max 2 parallel)
  const ttsAudioMap = {};
  if (enableTts) {
    const apiKey = previewState.elevenKey || localStorage.getItem('wa_eleven_api_key') || 'sk_aec3efa2efccb7f5155c04757341c942e1dccdb5fb7e9e20';

    for (let idx = 0; idx < messages.length; idx++) {
      const msg = messages[idx];
      const textToSpeak = msg.type === 'notification'
        ? `${msg.senderName || 'Notifikasi'}: ${msg.text || ''}`
        : (msg.text || msg.caption || '');

      if (textToSpeak) {
        lblEl.textContent = `Mengunduh ElevenLabs AI (${idx + 1}/${messages.length})… 🎙️✨`;
        const isOut = msg.direction === 'outgoing';
        const defaultInVoice  = 'dvWFQHCY2Y64dYruqGaE'; // Indonesian Female Native (Incoming)
        const defaultOutVoice = 'h9T2LVqn08GUmYXqjOIE'; // Indonesian Male Native (Outgoing)

        let voiceId = isOut
          ? (previewState.ttsVoiceOut && previewState.ttsVoiceOut !== 'google-mp3' ? previewState.ttsVoiceOut : defaultOutVoice)
          : (previewState.ttsVoiceIn  && previewState.ttsVoiceIn  !== 'google-mp3' ? previewState.ttsVoiceIn  : defaultInVoice);

        ttsAudioMap[idx] = await fetchElevenLabsAudioBlob(textToSpeak, voiceId, apiKey);
        await sleep(150); // Short delay to prevent ElevenLabs concurrent limit 429
      }
    }
  }

  for (let i = 3; i >= 1; i--) {
    numEl.textContent  = i;
    lblEl.textContent  = 'Starting animation…';
    await sleep(900);
  }
  overlay.classList.add('hidden');

  // Animate frame by frame
  for (let f = 0; f < totalF; f++) {
    const isOut = messages[f].direction === 'outgoing';

    // Check if any message has explicit selective zoom enabled (msg.enableZoom === true)
    const hasSelectiveZoom = messages.some(m => m.enableZoom === true);
    const shouldZoomThisMsg = hasSelectiveZoom ? !!messages[f].enableZoom : autoZoom;

    // Typing indicator / Reply delay before incoming replies
    if (f > 0 && messages[f].direction === 'incoming') {
      const isTextMsg = messages[f].type === 'text';
      if (useTyping && isTextMsg) {
        if (typeof showTypingIndicatorHeader === 'function') {
          showTypingIndicatorHeader('mengetik');
        }
        showTyping();
        await sleep(replyDelay);
        hideTyping();
        if (typeof updateHeaderStatusUI === 'function') {
          updateHeaderStatusUI(previewState);
        } else if (typeof restoreStatusHeader === 'function') {
          restoreStatusHeader(previewState);
        }
        await sleep(120);
      } else {
        await sleep(replyDelay);
      }
    }

    // Reveal this message with slide-in animation
    applyFrame(f + 1);
    
    // Auto-Zoom Punch-In Camera Effect to new message
    const msgEl = document.querySelector(`#wa-messages > div[data-frame-index="${f}"]`);
    if (shouldZoomThisMsg && msgEl) {
      triggerAutoZoom(msgEl, isOut, messages[f].customScale);
    } else {
      resetZoom();
    }

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

    if (msgEl) {
      const animClass = isOut ? 'msg-enter-out' : 'msg-enter-in';
      msgEl.classList.add(animClass);
      setTimeout(() => msgEl.classList.remove(animClass), 400);
    }

    // ElevenLabs AI Voice Over Playback
    if (enableTts) {
      const blobUrl = ttsAudioMap[f];
      const speedRate = parseFloat(previewState.ttsSpeed || '1.00');

      if (blobUrl) {
        await playBlobAudio(blobUrl, speedRate);
        await sleep(250);
      } else {
        const frameHoldMs = (messages[f].customHoldMs ? parseInt(messages[f].customHoldMs, 10) : holdMs);
        await sleep(frameHoldMs);
      }
    } else {
      const frameHoldMs = (messages[f].customHoldMs ? parseInt(messages[f].customHoldMs, 10) : holdMs);
      await sleep(frameHoldMs);
    }

    // Zoom OUT back to full screen view after message hold, before next frame/typing starts
    if (shouldZoomThisMsg && f < totalF - 1) {
      resetZoom();
      const zoomOutDelay = Math.min(350, Math.round((previewState.zoomSpeed || 0.45) * 1000 * 0.7));
      await sleep(zoomOutDelay);
    }
  }

  // End: reset camera zoom to full view
  resetZoom();

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
  currentBaseScale = (vh < 884) ? (vh / 884) : 1;

  canvas.style.transformOrigin = 'top left';
  canvas.style.transform = `scale(${currentBaseScale})`;
  wrapper.style.width = `${390 * currentBaseScale}px`;
  wrapper.style.height = `${844 * currentBaseScale}px`;
}

window.addEventListener('resize', fitToScreen);

async function checkPreviewUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const presetParam = urlParams.get('preset') || urlParams.get('p') || urlParams.get('id');
  if (!presetParam) return null;

  const cleanId = presetParam.replace(/^(cloud_|local_)/, '');
  const cloudKey = `cloud_${cleanId}`;

  const WORKER_URL = 'https://wa-templates-worker.aldoramadhan16.workers.dev/templates';
  const TEAM_PASSCODE = 'loves2026';

  try {
    const res = await fetch(WORKER_URL, {
      headers: { 'X-Team-Passcode': TEAM_PASSCODE }
    });
    if (res.ok) {
      const json = await res.json();
      const templates = json.templates || {};
      const tpl = templates[cleanId] || templates[cloudKey];
      if (tpl && tpl.data) {
        return tpl.data;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch shared preview preset:', e);
  }
  return null;
}

/* ── Boot ─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  fitToScreen();
  updateClock();
  setInterval(updateClock, 30_000);

  const urlState = await checkPreviewUrlParams();
  previewState = urlState || loadState();

  const chatArea = document.getElementById('wa-chat-area');
  if (previewState && chatArea) {
    const bgType = previewState.bgType || 'default';
    chatArea.style.backgroundAttachment = 'scroll';
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
        chatArea.style.backgroundRepeat = 'no-repeat';
        chatArea.style.backgroundSize = 'cover';
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

  // Apply Status Bar (iOS vs Android, battery level)
  if (typeof renderCustomStatusBarHtml === 'function') {
    const statusBarEl = document.getElementById('wa-status-bar');
    if (statusBarEl) {
      statusBarEl.innerHTML = renderCustomStatusBarHtml({
        phoneOs: previewState.phoneOs,
        clockTime: previewState.time,
        batteryLevel: previewState.batteryLevel,
      });
    }
  }

  // Apply Header Status Subtitle (Online vs Custom Last Seen)
  if (typeof updateHeaderStatusUI === 'function') {
    updateHeaderStatusUI(previewState);
  } else if (typeof restoreStatusHeader === 'function') {
    restoreStatusHeader(previewState);
  }

  // Apply Unread Chat Badge (&lt; 99+)
  if (typeof updateUnreadBadgeUI === 'function') {
    updateUnreadBadgeUI(previewState);
  }

  // Apply Pinned Message Banner
  if (typeof updatePinnedBannerUI === 'function') {
    updatePinnedBannerUI(previewState);
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
    pfpEl.style.display = 'none';
    if (pfpFallback) pfpFallback.style.display = 'flex';
  }

  // Render all bubbles (hidden, applyFrame reveals them)
  const container = document.getElementById('wa-messages');
  previewState.messages.forEach((msg, idx) => {
    const el = createBubble(msg, idx);
    if (el) container.appendChild(el);
  });
});
