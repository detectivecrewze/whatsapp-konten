/**
 * app.js — WhatsApp Asset Generator (v2 — Dynamic Messages)
 * For You, Always — Internal Tool
 * ============================================================
 * New in v2:
 *  - Fully dynamic message builder (any count, any direction)
 *  - GIF support for image messages
 *  - Fixed frame generation for variable message count
 *  - Live canvas sync on every state change
 * ============================================================
 */

'use strict';

/* ============================================================
   1. STATE
   ============================================================ */
const state = {
  name:     '',
  pfp:      null,   // data URL
  messages: [],     // array of message objects (see addMessage)
  scale:    2,
  time:     '16:12', // Custom time
  bgType:   'default', // 'default', 'color', 'image'
  bgColor:  '#111B21',
  bgImage:  null,
};

// Auto-increment ID for messages
let _msgIdCounter = 0;
function newId() { return `msg_${++_msgIdCounter}`; }

/* ============================================================
   2. UTILITIES
   ============================================================ */

/** Escape HTML special chars (safe for textContent injection via innerHTML) */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

/** Return custom time for messages */
function msgTime(index) {
  return state.time || '16:12';
}

/** Sleep helper for sequenced captures */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Debounce */
function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ============================================================
   3. SVG SNIPPETS (WA UI icons)
   ============================================================ */

function svgReadTicks() {
  return `<svg width="14" height="10" viewBox="0 0 18 11" fill="none">
    <path d="M1 5.5L5.5 10L17 1" stroke="#53BDEB" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 5.5L11.5 10" stroke="#53BDEB" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

/* ============================================================
   4. FILE → DATA URL
   ============================================================ */
function fileToDataUrl(file, maxDim = 1000) {
  return new Promise((resolve, reject) => {
    // Preserve animated GIFs as raw data URL
    if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to web-friendly JPEG (0.85 quality)
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    reader.readAsDataURL(file);
  });
}

/* ============================================================
   5. DASHBOARD MESSAGE BUILDER
   Renders the list of editable message slots in the sidebar.
   ============================================================ */

/**
 * Render the full dashboard message list from state.messages.
 * Called after any state.messages mutation.
 */
function renderDashboard() {
  const builder = document.getElementById('msg-builder');
  const hint    = document.getElementById('msg-empty-hint');

  if (state.messages.length === 0) {
    builder.innerHTML = '';
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
    builder.innerHTML = state.messages.map((msg, idx) => dashboardItemHtml(msg, idx)).join('');
  }

  updateFrameButtons();
  renderCanvas();
  triggerAutoSave();
}

/**
 * Build the HTML string for one message item in the dashboard.
 */
function dashboardItemHtml(msg, idx) {
  const isFirst = idx === 0;
  const isLast  = idx === state.messages.length - 1;

  const isOut  = msg.direction === 'outgoing';
  const isText = msg.type === 'text';
  const isImg  = msg.type === 'image';
  const isQr   = msg.type === 'qr';

  const outActiveCls  = isOut  ? 'active-dir' : '';
  const inActiveCls   = !isOut ? 'active-dir' : '';

  const textHide  = isText ? '' : 'hidden';
  const imgHide   = isImg  ? '' : 'hidden';
  const qrHide    = isQr   ? '' : 'hidden';

  // QR only available for outgoing
  const qrOption = msg.direction === 'outgoing'
    ? `<option value="qr" ${isQr ? 'selected' : ''}>QR Code (Gift)</option>`
    : '';

  // Preview thumbnail
  const hasThumbnail = (isImg || isQr) && msg.dataUrl;
  const thumbnailHtml = hasThumbnail
    ? `<img src="${msg.dataUrl}" class="mt-2 max-h-16 rounded-lg object-contain border border-gray-700 block" />`
    : '';

  // GIF badge
  const gifBadgeHtml = isImg && msg.isGif
    ? `<span class="ml-1.5 inline-block bg-wa-accent/20 text-wa-accent text-xs px-1.5 py-0.5 rounded font-bold">GIF</span>`
    : '';

  return `
  <div class="msg-item bg-gray-800/60 border border-gray-700 rounded-xl p-3 space-y-2.5"
       data-msg-id="${msg.id}">

    <!-- Row 1: Direction + Type + Controls -->
    <div class="flex items-center gap-2 flex-wrap">

      <!-- Direction toggle -->
      <div class="flex rounded-lg overflow-hidden border border-gray-700 text-xs flex-shrink-0">
        <button onclick="setMsgDir('${msg.id}', 'incoming')"
                class="dir-btn ${inActiveCls} px-2.5 py-1.5 font-medium transition"
                style="${!isOut ? 'background:#00A884;color:white;' : 'color:#8696A0;'}">
          ← In
        </button>
        <button onclick="setMsgDir('${msg.id}', 'outgoing')"
                class="dir-btn ${outActiveCls} px-2.5 py-1.5 font-medium transition"
                style="${isOut ? 'background:#005C4B;color:#E9EDEF;' : 'color:#8696A0;'}">
          Out →
        </button>
      </div>

      <!-- Type selector -->
      <select onchange="setMsgType('${msg.id}', this.value)"
              class="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5
                     text-base md:text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent">
        <option value="text"  ${isText ? 'selected' : ''}>✏️ Text</option>
        <option value="image" ${isImg  ? 'selected' : ''}>🖼 Image / GIF</option>
        ${qrOption}
      </select>

      <!-- Move up -->
      <button onclick="moveMsg('${msg.id}', -1)" ${isFirst ? 'disabled' : ''}
              class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white
                     hover:bg-gray-700 transition disabled:opacity-30 flex-shrink-0 text-xs">↑</button>
      <!-- Move down -->
      <button onclick="moveMsg('${msg.id}', 1)" ${isLast ? 'disabled' : ''}
              class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white
                     hover:bg-gray-700 transition disabled:opacity-30 flex-shrink-0 text-xs">↓</button>
      <!-- Remove -->
      <button onclick="removeMsg('${msg.id}')"
              class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400
                     hover:bg-red-900/20 transition flex-shrink-0 text-xs">✕</button>
    </div>

    <!-- Row 2: Content input (conditional) -->

    <!-- TEXT -->
    <div class="${textHide}">
      <textarea rows="2"
                placeholder="Type your message…"
                oninput="setMsgText('${msg.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${escHtml(msg.text ?? '')}</textarea>
    </div>

    <!-- IMAGE / GIF -->
    <div class="${imgHide} space-y-2">
      <!-- File upload -->
      <label class="flex items-center gap-2 bg-gray-700 border border-gray-600 border-dashed
                    rounded-lg px-3 py-2 cursor-pointer hover:border-wa-accent transition group">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-wa-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span class="text-xs text-gray-400 group-hover:text-gray-200 truncate">
          ${msg.fileName || 'Upload image or GIF…'}${gifBadgeHtml}
        </span>
        <input type="file" accept="image/*,.gif" class="hidden"
               onchange="handleMsgFile('${msg.id}', this)" />
      </label>
      
      <!-- GIF Link Input -->
      <input type="text" placeholder="Or paste direct GIF link (.gif)..."
             value="${msg.gifUrl || ''}"
             oninput="setMsgGifUrl('${msg.id}', this.value)"
             class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5
                    text-base md:text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      
      <!-- Caption Input -->
      <textarea rows="1" placeholder="Caption (optional)..."
                oninput="setMsgCaption('${msg.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${escHtml(msg.caption ?? '')}</textarea>

      ${thumbnailHtml}
    </div>

    <!-- QR CODE -->
    <div class="${qrHide}">
      <label class="flex items-center gap-2 bg-gray-700 border border-gray-600 border-dashed
                    rounded-lg px-3 py-2 cursor-pointer hover:border-wa-accent transition group">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-wa-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
        </svg>
        <span class="text-xs text-gray-400 group-hover:text-gray-200 truncate">
          ${msg.fileName || 'Upload QR code image…'}
        </span>
        <input type="file" accept="image/*" class="hidden"
               onchange="handleMsgFile('${msg.id}', this)" />
      </label>
      ${hasThumbnail && isQr ? `<img src="${msg.dataUrl}" class="mt-2 w-16 h-16 object-contain border border-gray-600 rounded-lg bg-white p-1 block" />` : thumbnailHtml}
    </div>

    <!-- Frame label -->
    <p class="text-xs text-gray-600">Frame ${idx + 2} — ${msg.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} ${isText ? 'Text' : isImg ? 'Image/GIF' : 'QR Code'}</p>
  </div>
  `;
}

/* ============================================================
   6. CANVAS RENDERER
   Builds message DOM elements inside #wa-messages from state.
   ============================================================ */

function renderCanvas() {
  const container = document.getElementById('wa-messages');
  if (!container) return;
  container.innerHTML = '';

  state.messages.forEach((msg, idx) => {
    const el = createCanvasBubble(msg, idx);
    if (el) {
      el.setAttribute('data-frame-index', idx);
      container.appendChild(el);
    }
  });
}

/**
 * Create the DOM element for a single message bubble.
 */
function createCanvasBubble(msg, idx) {
  const time    = msgTime(idx);
  const isOut   = msg.direction === 'outgoing';

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
  wrapper.setAttribute('data-canvas-msg', msg.id);

  let bubbleHtml = '';

  // ── TEXT bubble ──────────────────────────────────────────
  if (msg.type === 'text') {
    const bg = isOut ? '#005C4B' : '#202C33';
    const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

    bubbleHtml = `
      <div style="background:${bg}; border-radius:${br}; max-width:270px;
                  padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                  word-break:break-word; white-space:pre-wrap;">${escHtml(msg.text || '')}</p>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; margin-top:4px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
          ${isOut ? svgReadTicks() : ''}
        </div>
      </div>
    `;
  }

  // ── IMAGE / GIF bubble ────────────────────────────────────
  else if (msg.type === 'image') {
    if (!msg.dataUrl) {
      // Placeholder
      const bg = isOut ? '#005C4B' : '#202C33';
      const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
      bubbleHtml = `
        <div style="background:${bg}; border-radius:${br}; width:200px; height:120px;
                    display:flex; align-items:center; justify-content:center; opacity:0.4;">
          <span style="font-size:11px; color:#8696A0;">Image / GIF</span>
        </div>
      `;
    } else {
      const bg = isOut ? '#005C4B' : '#202C33';
      const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
      const gifLabel = msg.isGif
        ? `<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.6);
                      color:#00A884;font-size:10px;font-weight:700;padding:2px 5px;
                      border-radius:4px;letter-spacing:0.5px;">GIF</div>`
        : '';
        
      const imgPadding = msg.caption ? 'padding: 4px; padding-bottom: 0;' : 'padding: 0;';
      const borderRadiusImg = msg.caption ? 'border-radius: 8px;' : '';
        
      bubbleHtml = `
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
        </div>
      `;
    }
  }

  // ── QR CODE bubble ────────────────────────────────────────
  else if (msg.type === 'qr') {
    const hasQr = !!msg.dataUrl;
    bubbleHtml = `
      <div style="background:#005C4B; border-radius:12px 0 12px 12px; max-width:240px;
                  overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <div style="padding:8px 12px 4px;">
          <p style="font-size:11px; color:rgba(233,237,239,0.7); margin:0;">🎁 Your Gift QR Code</p>
        </div>
        <div style="background:white; margin:8px; border-radius:8px; padding:8px;
                    min-width:184px; min-height:184px;
                    display:flex; align-items:center; justify-content:center;">
          ${hasQr
            ? `<img src="${msg.dataUrl}"
                    style="width:184px; height:184px; object-fit:contain;
                           image-rendering:pixelated; image-rendering:-webkit-optimize-contrast;
                           display:block;" />`
            : `<span style="font-size:11px; color:#8696A0; opacity:0.5;">QR Code</span>`
          }
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; padding:0 8px 8px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
          ${svgReadTicks()}
        </div>
      </div>
    `;
  }

  wrapper.innerHTML = bubbleHtml;
  return wrapper;
}

/* ============================================================
   7. FRAME BUTTONS (dynamic, based on message count)
   ============================================================ */

function updateFrameButtons() {
  const container = document.getElementById('frame-buttons');
  if (!container) return;

  const total = state.messages.length + 1; // Frame 1 = no messages

  if (state.messages.length === 0) {
    container.innerHTML = `<span class="text-xs text-gray-600 italic">Add messages to see frames</span>`;
    return;
  }

  let html = '';
  for (let i = 0; i < total; i++) {
    const label = i === 0
      ? 'Frame 1 — Base'
      : `Frame ${i + 1} — Msg ${i}`;
    html += `
      <button onclick="previewFrame(${i})"
              class="frame-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              style="border-color:#2A3942; color:#8696A0;"
              data-frame="${i}">${label}</button>
    `;
  }
  container.innerHTML = html;
}

/* ============================================================
   8. MESSAGE CRUD
   ============================================================ */

/** Add a new message slot (default: outgoing text) */
function addMessage() {
  const msg = {
    id:        newId(),
    direction: 'outgoing',
    type:      'text',
    text:      '',
    caption:   '',
    gifUrl:    '',
    dataUrl:   null,
    fileName:  '',
    isGif:     false,
  };
  state.messages.push(msg);
  renderDashboard();

  // Scroll to the new item
  setTimeout(() => {
    const el = document.querySelector(`[data-msg-id="${msg.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

/** Remove a message by ID */
function removeMsg(id) {
  state.messages = state.messages.filter(m => m.id !== id);
  renderDashboard();
}

/** Move a message up (-1) or down (+1) */
function moveMsg(id, dir) {
  const idx = state.messages.findIndex(m => m.id === id);
  if (idx < 0) return;
  const target = idx + dir;
  if (target < 0 || target >= state.messages.length) return;
  [state.messages[idx], state.messages[target]] = [state.messages[target], state.messages[idx]];
  renderDashboard();
}

/** Change direction (incoming / outgoing) */
function setMsgDir(id, direction) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.direction = direction;
  // If switching to incoming and type is QR, reset to text
  if (direction === 'incoming' && msg.type === 'qr') {
    msg.type = 'text';
  }
  renderDashboard();
}

/** Change type (text / image / qr) */
function setMsgType(id, type) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.type = type;
  renderDashboard();
}

/** Update text content */
function setMsgText(id, text) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.text = text;
  renderCanvas();
}

/** Update caption content */
function setMsgCaption(id, text) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.caption = text;
  renderCanvas();
}

/** Update direct GIF URL */
function setMsgGifUrl(id, url) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.gifUrl = url;
  
  // Directly load it as dataUrl if it's a URL
  msg.dataUrl = url;
  msg.isGif = url.toLowerCase().includes('.gif');
  msg.fileName = 'Direct Link';
  
  renderCanvas();
}

/** Handle file upload for image/gif/qr messages */
async function handleMsgFile(id, input) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg || !input.files?.[0]) return;

  const file = input.files[0];
  msg.fileName = file.name.length > 30 ? file.name.slice(0, 27) + '…' : file.name;
  msg.isGif    = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

  try {
    msg.dataUrl = await fileToDataUrl(file);
  } catch (e) {
    console.error('File read error:', e);
    return;
  }

  renderDashboard();
}

/* ============================================================
   9. PFP UPLOAD
   ============================================================ */

async function handlePfpUpload(input) {
  if (!input.files?.[0]) return;
  const file = input.files[0];

  document.getElementById('pfp-label').textContent =
    file.name.length > 28 ? file.name.slice(0, 25) + '…' : file.name;

  const dataUrl = await fileToDataUrl(file);
  state.pfp = dataUrl;

  // Show preview
  const wrap    = document.getElementById('pfp-preview-wrap');
  const img     = document.getElementById('pfp-preview');
  const nameEl  = document.getElementById('pfp-preview-name');
  img.src       = dataUrl;
  nameEl.textContent = file.name;
  wrap.style.display = 'flex';

  // Update canvas PFP
  const cPfp = document.getElementById('wa-pfp');
  const fallback = document.getElementById('wa-pfp-fallback');
  if (cPfp) {
    cPfp.src = dataUrl;
    cPfp.style.display = 'block';
    if (fallback) fallback.style.display = 'none';
  }

  triggerAutoSave();
}

/* ============================================================
   10. FRAME CONTROLLER
   Show only first N canvas messages for frame N.
   Frame 0 = no messages, Frame N = first N messages visible.
   ============================================================ */

let currentFrame = -1;

function applyFrame(frameIndex) {
  currentFrame = frameIndex;

  // ─── CRITICAL FIX ─────────────────────────────────────────────────────────
  // Must use 'flex' (not '' empty string) when showing a wrapper.
  // Setting display:'' removes the INLINE display:flex we set in createCanvasBubble,
  // causing the browser to fall back to display:block — which breaks
  // justify-content:flex-end and makes ALL bubbles appear left-aligned.
  // ──────────────────────────────────────────────────────────────────────────
  const allMessages = document.querySelectorAll('#wa-messages > div');
  allMessages.forEach((el) => {
    const idx = parseInt(el.getAttribute('data-frame-index') ?? '9999', 10);
    el.style.display = (idx < frameIndex) ? 'flex' : 'none';
  });

  // Update button highlights
  document.querySelectorAll('.frame-btn').forEach(btn => {
    const fi = parseInt(btn.getAttribute('data-frame'), 10);
    const isActive = fi === frameIndex;
    btn.style.borderColor = isActive ? '#00A884' : '#2A3942';
    btn.style.color       = isActive ? '#00A884' : '#8696A0';
    btn.style.background  = isActive ? 'rgba(0,168,132,0.1)' : '';
  });
}

function previewFrame(frameIndex) {
  syncBaseFields();
  applyFrame(frameIndex);
}

/* ============================================================
   11. LIVE SYNC — name field
   ============================================================ */

function syncBaseFields() {
  state.name  = document.getElementById('inp-name').value;
  state.scale = parseInt(document.getElementById('inp-scale').value, 10);
  state.time  = document.getElementById('inp-time').value || '16:12';

  const nameEl = document.getElementById('wa-name');
  if (nameEl) nameEl.textContent = state.name || 'Contact Name';
  
  const timeEl = document.getElementById('wa-time');
  if (timeEl) timeEl.textContent = state.time;
  
  const chatArea = document.getElementById('wa-chat-area');
  const bgPattern = document.getElementById('wa-bg-pattern');
  if (chatArea && bgPattern) {
    if (state.bgType === 'default') {
      chatArea.style.backgroundColor = '#111B21';
      bgPattern.style.backgroundImage = "url('assets/wa-pattern.svg')";
      bgPattern.style.opacity = '0.04';
      bgPattern.style.backgroundSize = '400px';
    } else if (state.bgType === 'color') {
      chatArea.style.backgroundColor = state.bgColor;
      bgPattern.style.backgroundImage = "url('assets/wa-pattern.svg')";
      bgPattern.style.opacity = '0.04'; // Keep doodle over custom color
      bgPattern.style.backgroundSize = '400px';
    } else if (state.bgType === 'image') {
      chatArea.style.backgroundColor = '#111B21'; // fallback
      if (state.bgImage) {
        bgPattern.style.backgroundImage = `url('${state.bgImage}')`;
        bgPattern.style.opacity = '1';
        bgPattern.style.backgroundSize = 'cover';
      } else {
        bgPattern.style.backgroundImage = "url('assets/wa-pattern.svg')";
        bgPattern.style.opacity = '0.04';
      }
    }
  }
  
  renderCanvas(); // Re-render canvas to update time inside bubbles
}

const syncName = debounce(() => syncBaseFields(), 200);
document.getElementById('inp-name').addEventListener('input', syncName);
document.getElementById('inp-time').addEventListener('input', syncName);

// Background Handlers
document.getElementById('inp-bg-type').addEventListener('change', (e) => {
  state.bgType = e.target.value;
  document.getElementById('inp-bg-color').classList.toggle('hidden', state.bgType !== 'color');
  document.getElementById('lbl-bg-image').classList.toggle('hidden', state.bgType !== 'image');
  syncBaseFields();
});

document.getElementById('inp-bg-color').addEventListener('input', (e) => {
  state.bgColor = e.target.value;
  syncBaseFields();
});

document.getElementById('inp-bg-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state.bgImage = await fileToDataUrl(file);
    document.getElementById('bg-image-name').textContent = file.name;
    syncBaseFields();
  } catch (err) {
    console.error('Failed to load bg image:', err);
  }
});

/* ============================================================
   12. CAPTURE ENGINE — html2canvas
   ============================================================ */

async function captureFrame(scale) {
  const target = document.getElementById('wa-canvas');

  const canvas = await html2canvas(target, {
    scale:           scale,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: '#111B21',
    logging:         false,
    scrollX:         0,
    scrollY:         0,
    width:           target.offsetWidth,
    height:          target.offsetHeight,
    imageTimeout:    20000,
    onclone: (doc) => {
      // Force crisp QR rendering in clone
      doc.querySelectorAll('[data-canvas-msg] img').forEach(img => {
        if (img.closest('[data-qr]')) {
          img.style.imageRendering = 'pixelated';
        }
      });
    }
  });

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png', 1.0);
  });
}

/* ============================================================
   13. GENERATE ASSETS — main entry point
   ============================================================ */

async function generateAssets() {
  syncBaseFields();

  // Validation
  const missing = [];
  if (!state.name.trim())        missing.push('Contact Name');
  if (!state.pfp)                missing.push('Profile Picture');
  if (state.messages.length < 1) missing.push('At least 1 message');

  // Check all image/gif/qr messages have files
  state.messages.forEach((msg, i) => {
    if ((msg.type === 'image' || msg.type === 'qr') && !msg.dataUrl) {
      missing.push(`Message ${i + 1}: missing file upload`);
    }
    if (msg.type === 'text' && !msg.text?.trim()) {
      missing.push(`Message ${i + 1}: text is empty`);
    }
  });

  if (missing.length > 0) {
    alert(`⚠️ Please complete the following:\n\n• ${missing.join('\n• ')}`);
    return;
  }

  const scale      = state.scale;
  const totalFrames = state.messages.length + 1; // Frame 1 = base (no messages)
  const statusBar  = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const progress   = document.getElementById('status-progress');
  const btn        = document.getElementById('btn-generate');

  // UI — start
  statusBar.classList.remove('hidden');
  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');

  const zip = new JSZip();

  for (let i = 0; i < totalFrames; i++) {
    const frameNum = (i + 1).toString().padStart(2, '0');
    const frameName = `Frame_${frameNum}`;

    statusText.textContent = `Rendering ${frameName}… (${i + 1}/${totalFrames})`;
    progress.style.width   = `${(i / totalFrames) * 100}%`;

    // Apply frame state (i = number of visible messages)
    applyFrame(i);
    await sleep(150);

    try {
      const blob = await captureFrame(scale);
      zip.file(`${frameName}.png`, blob);
    } catch (err) {
      console.error(`Capture failed for ${frameName}:`, err);
      statusText.textContent = `❌ Error on ${frameName}`;
    }

    progress.style.width = `${((i + 1) / totalFrames) * 100}%`;
  }

  // Package ZIP
  statusText.textContent = 'Packaging ZIP…';
  progress.style.width   = '95%';

  try {
    const content   = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(content, `WA_Assets_${state.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.zip`);

    progress.style.width   = '100%';
    statusText.textContent = `✅ ${totalFrames} frames downloaded!`;
    statusText.style.color = '#00A884';
  } catch (err) {
    console.error('ZIP error:', err);
    statusText.textContent = `❌ ZIP error: ${err.message}`;
  }

  // Re-enable
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    statusText.style.color = '';
  }, 3000);

  // Restore last frame preview (show all)
  applyFrame(totalFrames);
}

/* ============================================================
   14. CLOCK
   ============================================================ */

function updateClock() {
  const el = document.getElementById('wa-time');
  if (!el) return;
  const now = new Date();
  el.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
}
updateClock();
setInterval(updateClock, 30_000);

/* ============================================================
   15. VIDEO GENERATION ENGINE
   Records an animated WebM video: each frame fades in, typing
   indicator plays between messages.
   ============================================================ */

function getBestVideoMimeType() {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

function showTyping() {
  const el = document.getElementById('wa-typing');
  if (el) el.style.display = 'block';
}
function hideTyping() {
  const el = document.getElementById('wa-typing');
  if (el) el.style.display = 'none';
}

/** Draw a source canvas onto ctx for durationMs, driven by rAF. */
function drawStatic(ctx, sourceCanvas, durationMs) {
  return new Promise(resolve => {
    const start = performance.now();
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const tick = (now) => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sourceCanvas, 0, 0, w, h);
      if (now - start < durationMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

/** Cross-fade from fromCanvas → toCanvas over durationMs. */
function drawFadeIn(ctx, fromCanvas, toCanvas, durationMs) {
  return new Promise(resolve => {
    const start = performance.now();
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(fromCanvas, 0, 0, w, h);
      ctx.globalAlpha = ease;
      ctx.drawImage(toCanvas, 0, 0, w, h);
      ctx.globalAlpha = 1;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

async function generateVideo() {
  syncBaseFields();

  const missing = [];
  if (!state.name.trim())        missing.push('Contact Name');
  if (!state.pfp)                missing.push('Profile Picture');
  if (state.messages.length < 1) missing.push('At least 1 message');
  if (missing.length) {
    alert(`⚠️ Please complete:\n\n• ${missing.join('\n• ')}`);
    return;
  }

  const holdMs      = parseInt(document.getElementById('inp-hold-duration')?.value || '2500', 10);
  const useTyping   = document.getElementById('inp-typing')?.checked ?? true;
  const totalFrames = state.messages.length + 1;

  // ── UI ─────────────────────────────────────────────────────
  const statusBar  = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const progress   = document.getElementById('status-progress');
  const btnV       = document.getElementById('btn-video');
  const btnZ       = document.getElementById('btn-generate');

  statusBar.classList.remove('hidden');
  [btnV, btnZ].forEach(b => { b.disabled = true; b.classList.add('opacity-50', 'cursor-not-allowed'); });
  statusText.style.color = '';

  const waTarget = document.getElementById('wa-canvas');
  const H2C_OPTS = {
    scale: 1, useCORS: true, allowTaint: true,
    backgroundColor: '#111B21', logging: false,
    scrollX: 0, scrollY: 0,
    width: waTarget.offsetWidth,
    height: waTarget.offsetHeight,
  };

  // ── Phase 1: Pre-capture frames ─────────────────────────────
  const frameCanvases  = [];   // static frame[i]
  const typingCanvases = [];   // typing indicator after frame[i]

  for (let i = 0; i <= state.messages.length; i++) {
    applyFrame(i);
    hideTyping();
    await sleep(130);

    const pct = Math.round((i / (totalFrames * 2)) * 100);
    progress.style.width = `${pct}%`;
    statusText.textContent = `Capturing frame ${i + 1} / ${totalFrames}…`;

    frameCanvases.push(await html2canvas(waTarget, H2C_OPTS));

    // Capture typing frame between messages
    if (useTyping && i < state.messages.length) {
      showTyping();
      await sleep(80);
      typingCanvases.push(await html2canvas(waTarget, H2C_OPTS));
      hideTyping();
    }
  }

  progress.style.width = '52%';
  statusText.textContent = 'Setting up recorder…';
  await sleep(80);

  // ── Phase 2: Recording canvas ───────────────────────────────
  const recCanvas  = document.createElement('canvas');
  recCanvas.width  = waTarget.offsetWidth;
  recCanvas.height = waTarget.offsetHeight;
  const ctx = recCanvas.getContext('2d');

  // ── Phase 3: MediaRecorder ──────────────────────────────────
  const mimeType = getBestVideoMimeType();
  const stream   = recCanvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  statusText.textContent = 'Recording animation…';

  // ── Phase 4: Animate ────────────────────────────────────────
  const FADE_MS   = 380;
  const TYPING_MS = useTyping ? 1600 : 0;

  for (let i = 0; i < frameCanvases.length; i++) {
    const pct = 52 + Math.round((i / frameCanvases.length) * 44);
    progress.style.width = `${pct}%`;
    statusText.textContent = `Animating frame ${i + 1} / ${frameCanvases.length}…`;

    if (i === 0) {
      // First frame: just show it
      await drawStatic(ctx, frameCanvases[0], holdMs);
    } else {
      // Fade in from previous frame
      await drawFadeIn(ctx, frameCanvases[i - 1], frameCanvases[i], FADE_MS);
      await drawStatic(ctx, frameCanvases[i], holdMs);
    }

    // Show typing before next message
    if (useTyping && i < frameCanvases.length - 1 && typingCanvases[i]) {
      await drawStatic(ctx, typingCanvases[i], TYPING_MS);
    }
  }

  // Hold last frame 0.8s extra
  await drawStatic(ctx, frameCanvases.at(-1), 800);

  // ── Phase 5: Finish ─────────────────────────────────────────
  progress.style.width = '98%';
  statusText.textContent = 'Finalizing video…';

  recorder.stop();
  await new Promise(r => recorder.onstop = r);

  const ext       = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const blob      = new Blob(chunks, { type: mimeType });
  const safeName  = state.name.replace(/[^a-z0-9]/gi, '_').slice(0, 20);
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  saveAs(blob, `WA_Video_${safeName}_${timestamp}.${ext}`);

  progress.style.width = '100%';
  statusText.textContent = `✅ Video saved! (${ext.toUpperCase()}, ${(blob.size / 1024 / 1024).toFixed(1)} MB)`;
  statusText.style.color = '#00A884';

  setTimeout(() => {
    [btnV, btnZ].forEach(b => { b.disabled = false; b.classList.remove('opacity-50', 'cursor-not-allowed'); });
    statusText.style.color = '';
    applyFrame(totalFrames);
    statusBar.classList.add('hidden');
    progress.style.width = '0%';
  }, 4000);
}

/* ============================================================
   16. PLAY PREVIEW (browser-side frame animation — editor)
   ============================================================ */

let _previewTimer = null;
const notificationSound = new Audio('assets/notification.mp3');
const outSound = new Audio('assets/sfx-out.mp3');

function playPreview() {
  const btn = document.getElementById('btn-play');
  if (!btn) return;

  if (_previewTimer !== null) {
    clearInterval(_previewTimer);
    _previewTimer = null;
    btn.innerHTML = `
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg> Play Preview`;
    hideTyping();
    applyFrame(state.messages.length + 1);
    return;
  }

  if (state.messages.length < 1) {
    alert('Add at least one message first!');
    return;
  }

  btn.innerHTML = `
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg> Stop`;

  const totalF    = state.messages.length + 1;
  const holdMs    = parseInt(document.getElementById('inp-hold-duration')?.value || '1500', 10);
  const useTyping = document.getElementById('inp-typing')?.checked ?? true;

  let frame = 0;
  applyFrame(0);

  _previewTimer = setInterval(() => {
    frame++;
    if (frame > totalF) {
      clearInterval(_previewTimer);
      _previewTimer = null;
      btn.innerHTML = `
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg> Play Preview`;
      hideTyping();
      applyFrame(state.messages.length + 1);
      return;
    }
    
    const useSoundIn = document.getElementById('inp-sound-in')?.checked ?? true;
    const useSoundOut = document.getElementById('inp-sound-out')?.checked ?? false;
    const playSoundIfIncoming = (idx) => {
      const msg = state.messages[idx - 1];
      if (msg) {
        if (msg.direction === 'incoming' && useSoundIn) {
          notificationSound.currentTime = 0;
          notificationSound.play().catch(e => console.log('Audio play blocked:', e));
        } else if (msg.direction === 'outgoing' && useSoundOut) {
          outSound.currentTime = 0;
          outSound.play().catch(e => console.log('Audio play blocked:', e));
        }
      }
    };

    if (useTyping && frame >= 1 && frame <= state.messages.length) {
      showTyping();
      setTimeout(() => { 
        hideTyping(); 
        applyFrame(frame); 
        playSoundIfIncoming(frame);
      }, 800);
    } else {
      hideTyping();
      applyFrame(frame);
      if (frame >= 1 && frame <= state.messages.length) {
        playSoundIfIncoming(frame);
      }
    }
  }, holdMs);
}

/* ============================================================
   17. OPEN CLEAN PREVIEW (new tab, screen-record-ready)
   ============================================================ */

function openCleanPreview() {
  syncBaseFields();

  const missing = [];
  if (!state.name.trim())        missing.push('Contact Name');
  if (!state.pfp)                missing.push('Profile Picture');
  if (state.messages.length < 1) missing.push('At least 1 message');
  if (missing.length) {
    alert(`⚠️ Please fill in:\n\n• ${missing.join('\n• ')}`);
    return;
  }

  const holdMs    = parseInt(document.getElementById('inp-hold-duration')?.value || '2000', 10);
  const useTyping = document.getElementById('inp-typing')?.checked ?? true;
  const useSoundIn  = document.getElementById('inp-sound-in')?.checked ?? true;
  const useSoundOut = document.getElementById('inp-sound-out')?.checked ?? false;

  // Serialize state to localStorage
  const payload = {
    name:      state.name,
    pfp:       state.pfp,
    messages:  state.messages,
    time:      state.time,
    bgType:    state.bgType,
    bgColor:   state.bgColor,
    bgImage:   state.bgImage,
    holdMs,
    useTyping,
    useSoundIn,
    useSoundOut,
  };

  try {
    localStorage.setItem('wa_preview', JSON.stringify(payload));
  } catch (e) {
    alert('⚠️ Could not save preview data. Images may be too large — try fewer images or reduce their size.');
    return;
  }

  window.open('preview.html', '_blank');
}

/* ============================================================
   18. AUTO-SAVE & PRESET TEMPLATE MANAGEMENT
   ============================================================ */

let _autoSaveTimer = null;
let _isRestoringState = false;

function triggerAutoSave() {
  if (_isRestoringState) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    saveDraftToLocalStorage();
  }, 400);
}

function getProjectPayload() {
  const holdMs       = parseInt(document.getElementById('inp-hold-duration')?.value || '2000', 10);
  const useTyping    = document.getElementById('inp-typing')?.checked ?? true;
  const useSoundIn   = document.getElementById('inp-sound-in')?.checked ?? true;
  const useSoundOut  = document.getElementById('inp-sound-out')?.checked ?? false;

  return {
    name:        state.name,
    pfp:         state.pfp,
    messages:    state.messages,
    scale:       state.scale,
    time:        state.time,
    bgType:      state.bgType,
    bgColor:     state.bgColor,
    bgImage:     state.bgImage,
    holdMs,
    useTyping,
    useSoundIn,
    useSoundOut,
    updatedAt:   Date.now()
  };
}

function saveDraftToLocalStorage() {
  try {
    const payload = getProjectPayload();
    localStorage.setItem('wa_autosave_draft', JSON.stringify(payload));
    showAutoSaveBadge();
  } catch (e) {
    console.warn('Auto-save failed:', e);
  }
}

function showAutoSaveBadge() {
  const badge = document.getElementById('save-status-badge');
  if (!badge) return;
  badge.classList.remove('opacity-0');
  badge.classList.add('opacity-100');
  setTimeout(() => {
    badge.classList.remove('opacity-100');
    badge.classList.add('opacity-0');
  }, 1500);
}

const TPL_KEY = 'wa_saved_templates';

function getSavedTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TPL_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

// Configure your Cloudflare Worker URL & Secret Passcode here
const WORKER_URL    = window.WORKER_URL || 'https://wa-templates-worker.aldoramadhan16.workers.dev/templates';
const TEAM_PASSCODE = window.TEAM_PASSCODE || 'loves2026';

let _cloudTemplates = {};

async function fetchCloudTemplates() {
  if (!WORKER_URL) return;

  try {
    const res = await fetch(WORKER_URL, {
      headers: { 'X-Team-Passcode': TEAM_PASSCODE }
    });
    if (!res.ok) throw new Error('Cloud fetch failed');
    const json = await res.json();
    _cloudTemplates = json.templates || {};
    renderTemplateDropdown(document.getElementById('tpl-select')?.value || 'auto');
  } catch (e) {
    console.warn('Failed to fetch Cloud templates from Worker:', e);
  }
}

function renderTemplateDropdown(selectedId = 'auto') {
  const select = document.getElementById('tpl-select');
  if (!select) return;

  const localTemplates = getSavedTemplates();
  let html = `<option value="auto" ${selectedId === 'auto' ? 'selected' : ''}>Draft (Auto-saved)</option>`;

  // Local templates
  const localKeys = Object.keys(localTemplates);
  if (localKeys.length) {
    html += `<optgroup label="💾 Local Presets">`;
    localKeys.forEach(id => {
      const tpl = localTemplates[id];
      const isSelected = selectedId === `local_${id}` ? 'selected' : '';
      html += `<option value="local_${tpl.id}" ${isSelected}>📁 ${escHtml(tpl.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  // Cloud templates
  const cloudKeys = Object.keys(_cloudTemplates);
  if (cloudKeys.length) {
    html += `<optgroup label="☁️ Team Cloud Presets">`;
    cloudKeys.forEach(id => {
      const tpl = _cloudTemplates[id];
      const isSelected = selectedId === `cloud_${id}` ? 'selected' : '';
      html += `<option value="cloud_${tpl.id}" ${isSelected}>🌐 ${escHtml(tpl.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  select.innerHTML = html;
}

function applyProjectPayload(data) {
  _isRestoringState = true;

  state.name     = data.name || '';
  state.pfp      = data.pfp || null;
  state.messages = Array.isArray(data.messages) ? data.messages : [];
  state.scale    = data.scale || 2;
  state.time     = data.time || '16:12';
  state.bgType   = data.bgType || 'default';
  state.bgColor  = data.bgColor || '#111B21';
  state.bgImage  = data.bgImage || null;

  // Max msg counter ID sync
  _msgIdCounter = state.messages.reduce((max, m) => {
    const num = parseInt((m.id || '').replace('msg_', ''), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  // Restore DOM controls
  const inpName = document.getElementById('inp-name');
  if (inpName) inpName.value = state.name;

  const inpTime = document.getElementById('inp-time');
  if (inpTime) inpTime.value = state.time;

  const inpScale = document.getElementById('inp-scale');
  if (inpScale) inpScale.value = state.scale;

  const inpBgType = document.getElementById('inp-bg-type');
  if (inpBgType) inpBgType.value = state.bgType;

  const inpBgColor = document.getElementById('inp-bg-color');
  if (inpBgColor) inpBgColor.value = state.bgColor;

  // PFP UI
  const pfpWrap  = document.getElementById('pfp-preview-wrap');
  const pfpImg   = document.getElementById('pfp-preview');
  const pfpName  = document.getElementById('pfp-preview-name');
  const pfpLabel = document.getElementById('pfp-label');
  if (state.pfp) {
    if (pfpImg) pfpImg.src = state.pfp;
    if (pfpName) pfpName.textContent = 'Uploaded Image';
    if (pfpWrap) pfpWrap.style.display = 'flex';
    if (pfpLabel) pfpLabel.textContent = 'Change image…';
  } else {
    if (pfpWrap) pfpWrap.style.display = 'none';
    if (pfpLabel) pfpLabel.textContent = 'Upload image…';
  }

  // Background UI toggles
  document.getElementById('inp-bg-color')?.classList.toggle('hidden', state.bgType !== 'color');
  document.getElementById('lbl-bg-image')?.classList.toggle('hidden', state.bgType !== 'image');
  const bgImgName = document.getElementById('bg-image-name');
  if (bgImgName) bgImgName.textContent = state.bgImage ? 'Image Loaded' : 'Upload custom image…';

  // Video options UI
  if (data.holdMs !== undefined && document.getElementById('inp-hold-duration')) {
    document.getElementById('inp-hold-duration').value = data.holdMs;
  }
  if (data.useTyping !== undefined && document.getElementById('inp-typing')) {
    document.getElementById('inp-typing').checked = data.useTyping;
  }
  if (data.useSoundIn !== undefined && document.getElementById('inp-sound-in')) {
    document.getElementById('inp-sound-in').checked = data.useSoundIn;
  }
  if (data.useSoundOut !== undefined && document.getElementById('inp-sound-out')) {
    document.getElementById('inp-sound-out').checked = data.useSoundOut;
  }

  syncBaseFields();
  renderDashboard();

  _isRestoringState = false;
}

function handleSelectTemplate(val) {
  if (val === 'auto') {
    loadDraftFromLocalStorage();
    renderTemplateDropdown('auto');
    return;
  }

  if (val.startsWith('local_')) {
    const id = val.replace('local_', '');
    const templates = getSavedTemplates();
    if (templates[id]) {
      applyProjectPayload(templates[id].data);
      renderTemplateDropdown(val);
    }
  } else if (val.startsWith('cloud_')) {
    const id = val.replace('cloud_', '');
    if (_cloudTemplates[id]) {
      applyProjectPayload(_cloudTemplates[id].data);
      renderTemplateDropdown(val);
    }
  }
}

async function saveCurrentTemplate(isCloud = false) {
  const currentVal = document.getElementById('tpl-select')?.value || 'auto';
  const localTemplates = getSavedTemplates();

  let defaultName = 'My WA Preset';
  if (currentVal.startsWith('local_')) {
    const id = currentVal.replace('local_', '');
    if (localTemplates[id]) defaultName = localTemplates[id].name;
  } else if (currentVal.startsWith('cloud_')) {
    const id = currentVal.replace('cloud_', '');
    if (_cloudTemplates[id]) defaultName = _cloudTemplates[id].name;
  }

  const targetLabel = isCloud ? '☁️ Team Cloud' : '💾 Local';
  const tplName = prompt(`Simpan Template ke [${targetLabel}]:`, defaultName);
  if (!tplName || !tplName.trim()) return;

  const payload = getProjectPayload();

  if (isCloud) {
    if (!WORKER_URL) {
      alert('⚠️ Silakan masukkan URL Cloudflare Worker milikmu pada variabel WORKER_URL di app.js terlebih dahulu!');
      return;
    }

    const cloudId = `cloud_${Date.now()}`;
    _cloudTemplates[cloudId] = {
      id: cloudId,
      name: tplName.trim(),
      updatedAt: Date.now(),
      data: payload
    };

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Team-Passcode': TEAM_PASSCODE
        },
        body: JSON.stringify({ templates: _cloudTemplates })
      });
      if (!res.ok) throw new Error('Cloud save failed');
      alert(`✅ Template "${tplName.trim()}" berhasil tersimpan ke Team Cloud!`);
      renderTemplateDropdown(`cloud_${cloudId}`);
      showAutoSaveBadge();
    } catch (e) {
      alert('⚠️ Gagal menyimpan ke Cloud Worker. Periksa URL Worker di app.js');
    }
  } else {
    const id = currentVal.startsWith('local_') ? currentVal.replace('local_', '') : `tpl_${Date.now()}`;
    localTemplates[id] = {
      id,
      name: tplName.trim(),
      updatedAt: Date.now(),
      data: payload
    };

    try {
      localStorage.setItem(TPL_KEY, JSON.stringify(localTemplates));
      renderTemplateDropdown(`local_${id}`);
      showAutoSaveBadge();
    } catch (e) {
      alert('⚠️ Gagal menyimpan template lokal. Penyimpanan browser mungkin penuh jika gambar terlalu besar.');
    }
  }
}

async function deleteCurrentTemplate() {
  const currentVal = document.getElementById('tpl-select')?.value;
  if (!currentVal || currentVal === 'auto') {
    alert('⚠️ Template Draft (Auto-saved) tidak dapat dihapus.');
    return;
  }

  if (currentVal.startsWith('local_')) {
    const id = currentVal.replace('local_', '');
    const templates = getSavedTemplates();
    if (!templates[id]) return;

    if (confirm(`Hapus template lokal "${templates[id].name}"?`)) {
      delete templates[id];
      localStorage.setItem(TPL_KEY, JSON.stringify(templates));
      loadDraftFromLocalStorage();
      renderTemplateDropdown('auto');
    }
  } else if (currentVal.startsWith('cloud_')) {
    const id = currentVal.replace('cloud_', '');
    if (!_cloudTemplates[id]) return;

    if (confirm(`Hapus template Cloud "${_cloudTemplates[id].name}" dari Team Cloud?`)) {
      delete _cloudTemplates[id];

      if (WORKER_URL) {
        try {
          await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Team-Passcode': TEAM_PASSCODE
            },
            body: JSON.stringify({ templates: _cloudTemplates })
          });
        } catch (e) {
          console.error(e);
        }
      }

      loadDraftFromLocalStorage();
      renderTemplateDropdown('auto');
    }
  }
}

function createNewProject() {
  if (confirm('Buat project baru yang kosong? (Draft saat ini akan di-reset)')) {
    applyProjectPayload({
      name: '',
      pfp: null,
      messages: [],
      scale: 2,
      time: '16:12',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null
    });
    localStorage.removeItem('wa_autosave_draft');
    renderTemplateDropdown('auto');
  }
}

function loadDraftFromLocalStorage() {
  try {
    const raw = localStorage.getItem('wa_autosave_draft');
    if (raw) {
      const data = JSON.parse(raw);
      applyProjectPayload(data);
      return true;
    }
  } catch (e) {
    console.error('Failed to load auto-saved draft:', e);
  }
  return false;
}

function exportTemplateJson() {
  const payload = getProjectPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob    = new Blob([jsonStr], { type: 'application/json' });
  const nameSlug = (state.name.trim() || 'wa_template').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${nameSlug}_template.json`;

  if (window.saveAs) {
    window.saveAs(blob, filename);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
}

function importTemplateJson(input) {
  if (!input.files?.[0]) return;
  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') throw new Error('Invalid format');
      applyProjectPayload(data);
      alert(`✅ Template "${file.name}" berhasil di-import!`);
    } catch (err) {
      alert('⚠️ Gagal memuat file template JSON. Pastikan file berformat .json yang valid.');
    }
  };

  reader.readAsText(file);
  input.value = '';
}

/* ============================================================
   19. INIT
   ============================================================ */

window.addEventListener('DOMContentLoaded', async () => {
  renderTemplateDropdown('auto');
  await fetchCloudTemplates();
  const loaded = loadDraftFromLocalStorage();
  if (!loaded) {
    renderDashboard();
  }
});

