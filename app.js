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

/** Toggle Section Accordion (collapsible cards with arrow indicator) */
function toggleSectionAccordion(contentId, iconId) {
  const content = document.getElementById(contentId);
  const icon = document.getElementById(iconId);
  if (!content) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

/* ============================================================
   1. STATE
   ============================================================ */
const state = {
  name:          '',
  pfp:           null,   // data URL
  messages:      [],     // array of message objects (see addMessage)
  scale:         2,
  time:          '16:12', // Custom time
  bgType:        'default', // 'default', 'color', 'image'
  bgColor:       '#111B21',
  bgImage:       null,
  phoneOs:       'ios',   // 'ios' or 'android'
  chatType:      'personal', // 'personal' or 'group'
  groupSubtitle: 'Sinta, Budi, Anda, Agus',
  batteryLevel:  85,     // 1 - 100
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

/**
 * Strip ElevenLabs Audio Emotion Tags from visible text.
 * Tags like [scared], [whispers], [nervous] are used only for TTS — never shown visually.
 */
function stripAudioTags(str) {
  if (!str) return '';
  let cleaned = str.replace(/\[[^\]]{1,40}\]/g, '').replace(/^\s+/, '').trim();
  return cleaned.replace(/\.{3,}/g, '..');
}

/** Return custom time for messages */
function msgTime(index) {
  if (typeof index === 'number' && state.messages[index] && state.messages[index].time) {
    return state.messages[index].time;
  }
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
  return `<svg width="16" height="11" viewBox="0 0 16 11" fill="none" style="flex-shrink:0;">
    <path d="M11.01 1.8L4.62 8.19L2.3 5.87L1.24 6.93L4.62 10.31L12.07 2.86L11.01 1.8Z" fill="#53BDEB"/>
    <path d="M14.77 1.8L8.38 8.19L7.15 6.96L6.09 8.02L8.38 10.31L15.83 2.86L14.77 1.8Z" fill="#53BDEB"/>
  </svg>`;
}

/* ============================================================
   4. FILE → DATA URL
   ============================================================ */
function fileToDataUrl(file, maxDim = 1000) {
  console.log('[fileToDataUrl] Starting processing for file:', file?.name, file?.size, file?.type);
  return new Promise((resolve, reject) => {
    if (!file) {
      console.warn('[fileToDataUrl] No file provided');
      reject(new Error('No file provided'));
      return;
    }

    // Preserve animated GIFs as raw data URL
    if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
      console.log('[fileToDataUrl] Processing as GIF...');
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('[fileToDataUrl] GIF loaded successfully, length:', e.target.result?.length);
        resolve(e.target.result);
      };
      reader.onerror = (e) => {
        console.error('[fileToDataUrl] GIF reader error:', e);
        reject(e);
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('[fileToDataUrl] FileReader loaded base dataUrl, length:', e.target.result?.length);
      const dataUrl = e.target.result;
      const img = new Image();

      img.onload = () => {
        console.log('[fileToDataUrl] HTML Image loaded, original size:', img.width, 'x', img.height);
        let width = img.width || 300;
        let height = img.height || 300;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          console.log('[fileToDataUrl] Canvas compression complete, final length:', compressed.length);
          resolve(compressed);
        } catch (err) {
          console.warn('[fileToDataUrl] Canvas compression failed, falling back to raw dataUrl:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = (err) => {
        console.warn('[fileToDataUrl] HTML Image onError, falling back to raw dataUrl:', err);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => {
      console.error('[fileToDataUrl] FileReader error:', err);
      reject(err);
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

  const isOut      = msg.direction === 'outgoing';
  const isText     = msg.type === 'text';
  const isImg      = msg.type === 'image';
  const isQr       = msg.type === 'qr';
  const isVoice    = msg.type === 'voice';
  const isTransfer = msg.type === 'transfer';
  const isDeleted  = msg.type === 'deleted';
  const isLocation = msg.type === 'location';
  const isViewOnce = msg.type === 'view_once';
  const isDocument    = msg.type === 'document';
  const isCall        = msg.type === 'call';
  const isStatusReply = msg.type === 'status_reply';
  const isProduct     = msg.type === 'product';
  const isContact     = msg.type === 'contact';
  const isNotif       = msg.type === 'notification';

  const outActiveCls  = isOut  ? 'active-dir' : '';
  const inActiveCls   = !isOut ? 'active-dir' : '';

  const textHide        = isText        ? '' : 'hidden';
  const notifHide       = isNotif       ? '' : 'hidden';
  const imgHide         = isImg         ? '' : 'hidden';
  const qrHide          = isQr          ? '' : 'hidden';
  const voiceHide       = isVoice       ? '' : 'hidden';
  const transferHide    = isTransfer    ? '' : 'hidden';
  const deletedHide     = isDeleted     ? '' : 'hidden';
  const locationHide    = isLocation    ? '' : 'hidden';
  const viewOnceHide    = isViewOnce    ? '' : 'hidden';
  const documentHide    = isDocument    ? '' : 'hidden';
  const callHide        = isCall        ? '' : 'hidden';
  const statusReplyHide = isStatusReply ? '' : 'hidden';
  const productHide     = isProduct     ? '' : 'hidden';
  const contactHide     = isContact     ? '' : 'hidden';

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
    <div class="flex items-center justify-between gap-1.5 w-full">

      <!-- Direction toggle -->
      <div class="flex rounded-lg overflow-hidden border border-gray-700 text-xs flex-shrink-0">
        <button onclick="setMsgDir('${msg.id}', 'incoming')"
                class="dir-btn ${inActiveCls} px-2 py-1.5 font-medium transition text-xs"
                style="${!isOut ? 'background:#00A884;color:white;' : 'color:#8696A0;'}">
          ← In
        </button>
        <button onclick="setMsgDir('${msg.id}', 'outgoing')"
                class="dir-btn ${outActiveCls} px-2 py-1.5 font-medium transition text-xs"
                style="${isOut ? 'background:#005C4B;color:#E9EDEF;' : 'color:#8696A0;'}">
          Out →
        </button>
      </div>

      <!-- Type selector (clean & concise) -->
      <select onchange="setMsgType('${msg.id}', this.value)"
              class="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5
                     text-xs text-white truncate font-medium focus:outline-none focus:ring-1 focus:ring-wa-accent cursor-pointer">
        <option value="text"         ${isText        ? 'selected' : ''}>✏️ Teks</option>
        <option value="notification" ${msg.type === 'notification' ? 'selected' : ''}>🔔 Notifikasi Push</option>
        <option value="contact"      ${isContact     ? 'selected' : ''}>👤 Kontak WA</option>
        <option value="product"      ${isProduct     ? 'selected' : ''}>🛍️ Kartu Produk</option>
        <option value="status_reply" ${isStatusReply ? 'selected' : ''}>💬 Balasan Status</option>
        <option value="voice"        ${isVoice       ? 'selected' : ''}>🎙️ Voice Note</option>
        <option value="call"         ${isCall        ? 'selected' : ''}>📞 Panggilan</option>
        <option value="transfer"     ${isTransfer    ? 'selected' : ''}>💸 Bukti Transfer</option>
        <option value="view_once"    ${isViewOnce    ? 'selected' : ''}>① Foto 1× Lihat</option>
        <option value="document"     ${isDocument    ? 'selected' : ''}>📄 Dokumen PDF</option>
        <option value="location"     ${isLocation    ? 'selected' : ''}>📍 Lokasi</option>
        <option value="deleted"      ${isDeleted     ? 'selected' : ''}>🚫 Terhapus</option>
        <option value="image"        ${isImg         ? 'selected' : ''}>🖼 Gambar / GIF</option>
        ${qrOption}
      </select>

      <!-- Advanced Settings Button ⚙️ -->
      <button onclick="toggleMsgAdvSettings('${msg.id}')"
              title="Pengaturan Khusus Pesan (Jam Custom & Zoom Kamera)"
              class="px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${msg.showAdvSettings || msg.enableZoom || msg.time ? 'bg-wa-accent/20 text-wa-accent border border-wa-accent/50 shadow-sm' : 'bg-gray-700/80 text-gray-400 border border-gray-600 hover:text-white'}">
        ⚙️ ${msg.enableZoom || msg.time ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>' : ''}
      </button>

      <!-- Move up / down / remove controls -->
      <div class="flex items-center gap-0.5 flex-shrink-0">
        <button onclick="moveMsg('${msg.id}', -1)" ${isFirst ? 'disabled' : ''}
                title="Pindah ke atas"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-30 text-xs font-bold">↑</button>
        <button onclick="moveMsg('${msg.id}', 1)" ${isLast ? 'disabled' : ''}
                title="Pindah ke bawah"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-30 text-xs font-bold">↓</button>
        <button onclick="removeMsg('${msg.id}')"
                title="Hapus pesan"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition text-xs font-bold ml-0.5">✕</button>
      </div>
    </div>

    <!-- ⚙️ Advanced Message Options Panel (Custom Time & Zoom) -->
    ${msg.showAdvSettings ? `
    <div class="mb-3 p-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl space-y-2 text-xs">
      <div class="flex items-center justify-between font-bold text-gray-300 border-b border-gray-800 pb-1 text-[11px]">
        <span>⚙️ OPSI KHUSUS PESAN INI</span>
        <button onclick="toggleMsgAdvSettings('${msg.id}')" class="text-gray-400 hover:text-white">✕ Close</button>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-0.5">
        <!-- Custom Time -->
        <div class="flex items-center gap-1.5">
          <span class="text-gray-400 font-medium">🕒 Jam Custom:</span>
          <input type="text" placeholder="${state.time || '16:12'}" value="${escHtml(msg.time || '')}"
                 oninput="setMsgTime('${msg.id}', this.value)"
                 class="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none text-center font-mono font-medium" />
        </div>

        <!-- Zoom Camera Custom -->
        <div class="flex items-center gap-1.5">
          <span class="text-gray-400 font-medium">🔍 Zoom Kamera:</span>
          <select onchange="handleMsgZoomSelect('${msg.id}', this.value)"
                  class="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none cursor-pointer">
            <option value="off" ${!msg.enableZoom ? 'selected' : ''}>OFF (Tanpa Zoom)</option>
            <option value="1.15" ${msg.enableZoom && msg.customScale === '1.15' ? 'selected' : ''}>1.15× (Soft Zoom)</option>
            <option value="1.30" ${msg.enableZoom && (!msg.customScale || msg.customScale === '1.30') ? 'selected' : ''}>1.30× (Standard)</option>
            <option value="1.50" ${msg.enableZoom && msg.customScale === '1.50' ? 'selected' : ''}>1.50× (Drama Focus)</option>
            <option value="1.80" ${msg.enableZoom && msg.customScale === '1.80' ? 'selected' : ''}>1.80× (Close-Up)</option>
            <option value="2.20" ${msg.enableZoom && msg.customScale === '2.20' ? 'selected' : ''}>2.20× (Extreme)</option>
          </select>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Row 2: Content input (conditional) -->

    <!-- TEXT -->
    <div class="${textHide} space-y-2">
      <textarea rows="2"
                placeholder="Tulis pesan teks…"
                oninput="setMsgText('${msg.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${escHtml(msg.text ?? '')}</textarea>
      
      <!-- Quick Image Attach for Text Card -->
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-1.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-600/80 border-dashed
                      rounded-lg px-2.5 py-1 cursor-pointer hover:border-wa-accent transition group w-fit">
          <svg class="w-3.5 h-3.5 text-gray-400 group-hover:text-wa-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span class="text-[11px] font-medium text-gray-400 group-hover:text-gray-200">
            📷 Upload / Sisipkan Gambar ke Pesan Ini
          </span>
          <input type="file" accept="image/*,.gif" class="hidden"
                 onclick="this.value=null"
                 onchange="attachImageToTextMsg('${msg.id}', this)" />
        </label>
      </div>
    </div>

    <!-- NOTIFIKASI PUSH POPUP HP -->
    <div class="${notifHide}">
      ${renderNotificationCardControlsHtml(msg)}
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

    <!-- VOICE NOTE -->
    <div class="${voiceHide}">
      ${renderVoiceNoteControlsHtml(msg)}
    </div>

    <!-- BUKTI TRANSFER -->
    <div class="${transferHide}">
      ${renderTransferCardControlsHtml(msg)}
    </div>

    <!-- PESAN TERHAPUS -->
    <div class="${deletedHide}">
      ${renderDeletedMessageControlsHtml(msg)}
    </div>

    <!-- LOKASI LANGSUNG -->
    <div class="${locationHide}">
      ${renderLocationCardControlsHtml(msg)}
    </div>

    <!-- FOTO SEKALI LIHAT -->
    <div class="${viewOnceHide}">
      ${renderViewOnceControlsHtml(msg)}
    </div>

    <!-- DOKUMEN PDF -->
    <div class="${documentHide}">
      ${renderDocumentCardControlsHtml(msg)}
    </div>

    <!-- RIWAYAT PANGGILAN (VOICE / VIDEO) -->
    <div class="${callHide}">
      ${renderCallCardControlsHtml(msg)}
    </div>

    <!-- BALASAN STATUS / STORY WA -->
    <div class="${statusReplyHide}">
      ${renderStatusReplyControlsHtml(msg)}
    </div>

    <!-- KARTU PRODUK KATALOG OLSHOP WA -->
    <div class="${productHide}">
      ${renderProductCardControlsHtml(msg)}
    </div>

    <!-- KARTU KONTAK WA -->
    <div class="${contactHide}">
      ${renderContactCardControlsHtml(msg)}
    </div>

    <!-- Group Member Sender Input (Group Mode only) -->
    ${state.chatType === 'group' && !isOut ? renderGroupSenderInputHtml(msg) : ''}

    <!-- Frame label -->
    <p class="text-xs text-gray-600 pt-1">Frame ${idx + 2} — ${msg.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} ${isText ? 'Text' : isVoice ? 'Voice Note' : isTransfer ? 'Bukti Transfer' : isImg ? 'Image/GIF' : 'QR Code'}</p>
  </div>
  `;
}

/* ============================================================
   6. CANVAS RENDERER
   Builds message DOM elements inside #wa-messages from state.
   ============================================================ */

function updatePushNotifOverlay(msg) {
  const overlay = document.getElementById('wa-push-notif-overlay');
  if (!overlay) return;
  if (msg && msg.type === 'notification') {
    const senderEl = document.getElementById('wa-notif-overlay-sender');
    const textEl   = document.getElementById('wa-notif-overlay-text');
    const timeEl   = document.getElementById('wa-notif-overlay-time');
    if (senderEl) senderEl.textContent = msg.senderName || 'Notifikasi Baru';
    if (textEl) textEl.textContent = msg.text || '';
    if (timeEl) timeEl.textContent = msg.time || state.time || '20:00';

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

  // Hide notification banner overlay by default when full canvas renders
  updatePushNotifOverlay(null);
}

/**
 * Create the DOM element for a single message bubble.
 */
function createCanvasBubble(msg, idx) {
  if (msg.type === 'notification') return null; // Do not append push notification as a chat bubble

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

  // ── TEXT bubble ───────────────────────────────────────────
  if (msg.type === 'text') {
    const bg = isOut ? '#005C4B' : '#202C33';
    const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    const visualText = stripAudioTags(msg.text || '');

    bubbleHtml = `
      <div style="background:${bg}; border-radius:${br}; max-width:270px;
                  padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        ${groupSenderBadge}
        <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                  word-break:break-word; white-space:pre-wrap;">${escHtml(visualText)}</p>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; margin-top:4px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
          ${isOut ? svgReadTicks() : ''}
        </div>
      </div>
    `;
  }

  // ── VOICE NOTE bubble ─────────────────────────────────────
  else if (msg.type === 'voice') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderVoiceNoteBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── BUKTI TRANSFER bubble ──────────────────────────────────
  else if (msg.type === 'transfer') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderTransferCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── DELETED MESSAGE bubble ────────────────────────────────
  else if (msg.type === 'deleted') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderDeletedMessageBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── VIEW ONCE PHOTO bubble ────────────────────────────────
  else if (msg.type === 'view_once') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderViewOnceBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── DOCUMENT PDF bubble ───────────────────────────────────
  else if (msg.type === 'document') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderDocumentCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── LIVE LOCATION bubble ──────────────────────────────────
  else if (msg.type === 'location') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderLocationCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── CALL LOG (VOICE / VIDEO) bubble ───────────────────────
  else if (msg.type === 'call') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderCallCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── STATUS / STORY REPLY bubble ───────────────────────────
  else if (msg.type === 'status_reply') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderStatusReplyBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── PRODUCT CATALOG CARD bubble ───────────────────────────
  else if (msg.type === 'product') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderProductCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
  }

  // ── CONTACT CARD bubble ───────────────────────────────────
  else if (msg.type === 'contact') {
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';
    bubbleHtml = renderContactCardBubble(msg, isOut, time, escHtml, svgReadTicks, groupSenderBadge);
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

/** Swap direction (Incoming ↔ Outgoing) for all messages in the project */
function reverseAllMsgDirections() {
  if (!state.messages || state.messages.length === 0) {
    showToast('⚠️ Belum ada pesan untuk dibalikkan!');
    return;
  }

  let swappedCount = 0;
  state.messages.forEach(msg => {
    if (msg.direction === 'incoming') {
      msg.direction = 'outgoing';
      swappedCount++;
    } else if (msg.direction === 'outgoing') {
      msg.direction = 'incoming';
      swappedCount++;
    }
  });

  renderDashboard();
  showToast(`🔄 Berhasil menukar posisi ${swappedCount} pesan (Incoming ↔ Outgoing)!`);
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
  console.log('[handleMsgFile] Called for id:', id, 'input.files:', input?.files);
  const msg = state.messages.find(m => m.id === id);
  if (!msg || !input.files?.[0]) {
    console.warn('[handleMsgFile] Aborted: msg found?', !!msg, 'file selected?', !!input?.files?.[0]);
    return;
  }

  const file = input.files[0];
  console.log('[handleMsgFile] File selected:', file.name, file.size, file.type);
  msg.fileName = file.name.length > 30 ? file.name.slice(0, 27) + '…' : file.name;
  msg.isGif    = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');

  try {
    msg.dataUrl = await fileToDataUrl(file);
    console.log('[handleMsgFile] dataUrl assigned successfully, length:', msg.dataUrl?.length);
  } catch (e) {
    console.error('[handleMsgFile] File read error:', e);
    return;
  }

  renderDashboard();
}

/** Directly attach an image file to a text message card */
async function attachImageToTextMsg(id, input) {
  console.log('[attachImageToTextMsg] Called for id:', id, 'input.files:', input?.files);
  const msg = state.messages.find(m => m.id === id);
  if (!msg || !input.files?.[0]) {
    console.warn('[attachImageToTextMsg] Aborted: msg found?', !!msg, 'file selected?', !!input?.files?.[0]);
    return;
  }

  const file = input.files[0];
  console.log('[attachImageToTextMsg] File selected:', file.name, file.size, file.type);
  msg.fileName = file.name.length > 30 ? file.name.slice(0, 27) + '…' : file.name;
  msg.isGif    = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  msg.type     = 'image';
  msg.caption  = msg.text || ''; // Automatically use typed text as image caption

  try {
    msg.dataUrl = await fileToDataUrl(file);
    console.log('[attachImageToTextMsg] dataUrl assigned successfully, length:', msg.dataUrl?.length);
  } catch (e) {
    console.error('[attachImageToTextMsg] File read error:', e);
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

/** Switch phone OS style: 'ios' or 'android' */
function setPhoneOs(os) {
  state.phoneOs = os || 'ios';
  updatePhoneOsUI();
  triggerAutoSave();
}

/** Render status bar icons & layout based on state.phoneOs & state.batteryLevel */
function updatePhoneOsUI() {
  const isIos = state.phoneOs !== 'android';

  // 1. Control Panel buttons
  const btnIos = document.getElementById('btn-os-ios');
  const btnAndroid = document.getElementById('btn-os-android');

  if (btnIos && btnAndroid) {
    if (isIos) {
      btnIos.className = 'px-3 py-2 bg-wa-accent text-white border border-wa-accent rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm';
      btnAndroid.className = 'px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white transition';
    } else {
      btnIos.className = 'px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white transition';
      btnAndroid.className = 'px-3 py-2 bg-emerald-600 text-white border border-emerald-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm';
    }
  }

  // 2. Delegate Status Bar Canvas HTML to statusBarCustom.js module
  const statusBar = document.getElementById('wa-status-bar');
  if (statusBar) {
    statusBar.style.padding = isIos ? '10px 20px 6px' : '8px 16px 6px';
    statusBar.innerHTML = renderCustomStatusBarHtml({
      phoneOs: state.phoneOs,
      clockTime: state.time || '16:12',
      batteryLevel: state.batteryLevel || 85
    });
  }
}

/** Switch chat type: 'personal' or 'group' */
function setChatType(type) {
  state.chatType = type || 'personal';
  updateChatTypeUI();
  renderDashboard();
  triggerAutoSave();
}

/** Update Chat Type UI controls & canvas header */
function updateChatTypeUI() {
  const isGroup = state.chatType === 'group';

  // Toggle buttons
  const btnPersonal = document.getElementById('btn-chat-personal');
  const btnGroup = document.getElementById('btn-chat-group');
  if (btnPersonal && btnGroup) {
    if (isGroup) {
      btnGroup.className = 'px-3 py-2 bg-wa-accent text-white border border-wa-accent rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm';
      btnPersonal.className = 'px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white transition';
    } else {
      btnPersonal.className = 'px-3 py-2 bg-wa-accent text-white border border-wa-accent rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm';
      btnGroup.className = 'px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white transition';
    }
  }

  // Labels & Subtitle wrapper
  const lblName = document.getElementById('lbl-name');
  if (lblName) lblName.textContent = isGroup ? 'Nama Group' : 'Contact Name';

  const wrapSub = document.getElementById('wrap-group-subtitle');
  if (wrapSub) wrapSub.classList.toggle('hidden', !isGroup);

  // Update canvas header status subtitle
  const statusEl = document.getElementById('wa-status-text');
  if (statusEl) {
    statusEl.textContent = isGroup ? (state.groupSubtitle || 'Sinta, Budi, Anda, Agus') : 'online';
  }
}

/** Update Group members list subtitle */
function setGroupSubtitle(text) {
  state.groupSubtitle = text;
  const statusEl = document.getElementById('wa-status-text');
  if (statusEl && state.chatType === 'group') {
    statusEl.textContent = text || 'Sinta, Budi, Anda, Agus';
  }
  triggerAutoSave();
}

/** Set custom battery percentage (1 - 100) */
function setBatteryLevel(val) {
  const num = Math.max(1, Math.min(100, parseInt(val, 10) || 85));
  state.batteryLevel = num;

  const inp = document.getElementById('inp-battery');
  if (inp) inp.value = num;

  const badge = document.getElementById('battery-val');
  if (badge) {
    badge.textContent = `${num}%`;
    badge.className = num <= 20 ? 'text-xs font-bold text-red-500' : 'text-xs font-bold text-emerald-400';
  }

  updatePhoneOsUI();
  triggerAutoSave();
}

/** Set incoming sender name for a message */
function setMsgSenderName(id, name) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.senderName = name;
  renderCanvas();
}

/** Set incoming sender color for a message */
function setMsgSenderColor(id, color) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.senderColor = color;
  renderCanvas();
}

/** Set Voice Note duration string e.g. "0:14" */
function setMsgVnDuration(id, duration) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.vnDuration = duration;
  renderCanvas();
}

/** Set Voice Note listened/played mic status (boolean) */
function setMsgVnPlayed(id, isPlayed) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.vnPlayed = isPlayed;
  renderCanvas();
}

/** Set Transfer Card Nominal Amount */
function setMsgTrAmount(id, amount) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.trAmount = amount;
  renderCanvas();
}

/** Set Transfer Card Receiver Name */
function setMsgTrReceiver(id, receiver) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.trReceiver = receiver;
  renderCanvas();
}

/** Set Transfer Card Bank/E-Wallet Provider */
function setMsgTrProvider(id, provider) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.trProvider = provider;
  renderCanvas();
}

/** Set Transfer Card Optional Note */
function setMsgTrNote(id, note) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.trNote = note;
  renderCanvas();
}

/** Set Pinned Banner enabled / disabled */
function setPinnedEnabled(val) {
  state.pinnedEnabled = !!val;
  const wrap = document.getElementById('wrap-pinned-inputs');
  if (wrap) wrap.classList.toggle('hidden', !val);
  if (typeof updatePinnedBannerUI === 'function') {
    updatePinnedBannerUI(state);
  }
  triggerAutoSave();
}

/** Set Pinned Banner text */
function setPinnedText(text) {
  state.pinnedText = text;
  if (typeof updatePinnedBannerUI === 'function') {
    updatePinnedBannerUI(state);
  }
  triggerAutoSave();
}

/** Toggle Unread Chat Count Badge */
function toggleUnreadBadge(enabled) {
  state.showUnreadBadge = typeof enabled === 'boolean' ? enabled : !state.showUnreadBadge;
  if (!state.unreadCount) state.unreadCount = '99+';

  const chk = document.getElementById('inp-unread-enabled');
  if (chk) chk.checked = !!state.showUnreadBadge;

  const wrap = document.getElementById('wrap-unread-inputs');
  if (wrap) wrap.classList.toggle('hidden', !state.showUnreadBadge);

  if (typeof updateUnreadBadgeUI === 'function') {
    updateUnreadBadgeUI(state);
  }
  triggerAutoSave();
}

/** Set Unread Chat Count value (e.g. "99+" or "14") */
function setUnreadCount(count) {
  state.unreadCount = count;
  const inp = document.getElementById('inp-unread-count');
  if (inp && inp.value !== count) inp.value = count;

  if (typeof updateUnreadBadgeUI === 'function') {
    updateUnreadBadgeUI(state);
  }
  triggerAutoSave();
}

/** Set Deleted Message Custom Text */
function setMsgDeletedText(id, text) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.deletedText = text;
  renderCanvas();
}

/** Set Last Seen Mode ('online' vs 'custom') */
function setLastSeenMode(mode) {
  state.lastSeenMode = mode;

  const btnOnline = document.getElementById('btn-status-online');
  const btnLast = document.getElementById('btn-status-lastseen');
  const wrapInput = document.getElementById('wrap-lastseen-input');

  const isCustom = mode === 'custom';

  if (btnOnline) btnOnline.className = !isCustom
    ? 'px-3 py-2 bg-wa-accent text-white border border-wa-accent rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm'
    : 'px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white transition';

  if (btnLast) btnLast.className = isCustom
    ? 'px-3 py-2 bg-wa-accent text-white border border-wa-accent rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm'
    : 'px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white transition';

  if (wrapInput) wrapInput.classList.toggle('hidden', !isCustom);

  if (typeof updateHeaderStatusUI === 'function') {
    updateHeaderStatusUI(state);
  }
  triggerAutoSave();
}

/** Set Last Seen Text */
function setLastSeenText(text) {
  state.lastSeenText = text;
  if (typeof updateHeaderStatusUI === 'function') {
    updateHeaderStatusUI(state);
  }
  triggerAutoSave();
}

/** Set Live Location Title */
function setMsgLocTitle(id, title) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.locTitle = title;
  renderCanvas();
}

/** Set Live Location Subtitle */
function setMsgLocSub(id, sub) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.locSub = sub;
  renderCanvas();
}

/** Set Call Type ('voice' vs 'video') */
function setMsgCallType(id, type) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.callType = type;
  renderCanvas();
}

/** Set Call Missed Status (boolean) */
function setMsgCallMissed(id, isMissed) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.callMissed = isMissed;
  renderCanvas();
}

/** Set Call Duration string e.g. "12:34" */
function setMsgCallDuration(id, duration) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.callDuration = duration;
  renderCanvas();
}

/** Set Status Author (e.g. "Status Anda" / "Nadin") */
function setMsgStatusAuthor(id, author) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.statusAuthor = author;
  renderCanvas();
}

/** Set Status Text Preview */
function renderNotificationCardControlsHtml(msg) {
  const customHoldMs = msg.customHoldMs || 2500;
  return `
    <div class="space-y-2.5 bg-purple-950/40 border border-purple-800/40 p-3 rounded-xl">
      <div class="text-[11px] font-semibold text-purple-300 flex items-center justify-between">
        <span>🔔 Notifikasi Push Popup HP</span>
        <span class="text-[10px] text-purple-400/80 font-normal">Banner melayang di atas layar HP</span>
      </div>
      <div class="space-y-2">
        <div>
          <label class="text-[10px] font-medium text-gray-400">👤 Nama Pengirim Notifikasi:</label>
          <input type="text" placeholder="e.g. Ex Sayang 💔 / Bank BCA / Shopee"
                 value="${escHtml(msg.senderName || '')}"
                 oninput="setMsgSenderName('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-600 rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-400" />
        </div>
        <div>
          <label class="text-[10px] font-medium text-gray-400">💬 Isi Pesan Notifikasi:</label>
          <textarea rows="2" placeholder="e.g. Kamu masih di rumah kontrakan? Jangan buka pintu..."
                    oninput="setMsgText('${msg.id}', this.value)"
                    class="w-full bg-gray-800 border border-gray-600 rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
          >${escHtml(msg.text || '')}</textarea>
        </div>
        <div>
          <label class="text-[10px] font-medium text-gray-400 flex items-center justify-between mb-1">
            <span>⏱️ Durasi Diam / Tampil Banner:</span>
            <span class="text-purple-300 font-bold font-mono">${(customHoldMs / 1000).toFixed(1)} Detik</span>
          </label>
          <select onchange="setMsgCustomHoldMs('${msg.id}', this.value)"
                  class="w-full bg-gray-800 border border-gray-600 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer">
            <option value="1500" ${customHoldMs === 1500 ? 'selected' : ''}>⚡ 1.5 Detik (Cepat)</option>
            <option value="2500" ${customHoldMs === 2500 ? 'selected' : ''}>📜 2.5 Detik (Standar)</option>
            <option value="3500" ${customHoldMs === 3500 ? 'selected' : ''}>🎬 3.5 Detik (Sedang)</option>
            <option value="5000" ${customHoldMs === 5000 ? 'selected' : ''}>🔥 5.0 Detik (Lama)</option>
            <option value="7000" ${customHoldMs === 7000 ? 'selected' : ''}>⏳ 7.0 Detik (Ekstra Lama)</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function setMsgCustomHoldMs(id, valMs) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.customHoldMs = parseInt(valMs, 10);
  renderDashboard();
}

function setMsgStatusText(id, text) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.statusText = text;
  renderCanvas();
}

/** Handle Status Image Upload for Story Reply Thumbnail */
function handleStatusImgUpload(id, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const msg = state.messages.find(m => m.id === id);
    if (!msg) return;
    msg.statusDataUrl = e.target.result;
    renderCanvas();
    renderDashboard();
  };
  reader.readAsDataURL(file);
}

/** Set Product Title */
function setMsgProductTitle(id, title) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.productTitle = title;
  renderCanvas();
}

/** Set Product Price */
function setMsgProductPrice(id, price) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.productPrice = price;
  renderCanvas();
}

/** Set Product Description / Subtitle */
function setMsgProductDesc(id, desc) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.productDesc = desc;
  renderCanvas();
}

/** Handle Product Image Upload */
function handleProductImgUpload(id, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const msg = state.messages.find(m => m.id === id);
    if (!msg) return;
    msg.productDataUrl = e.target.result;
    renderCanvas();
    renderDashboard();
  };
  reader.readAsDataURL(file);
}

/** Set Contact Name */
function setMsgContactName(id, name) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.contactName = name;
  renderCanvas();
}

/** Set Contact Phone Number */
function setMsgContactPhone(id, phone) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.contactPhone = phone;
  renderCanvas();
}

/** Handle Contact PFP Image Upload */
function handleContactPfpUpload(id, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const msg = state.messages.find(m => m.id === id);
    if (!msg) return;
    msg.contactDataUrl = e.target.result;
    renderCanvas();
    renderDashboard();
  };
  reader.readAsDataURL(file);
}

/** Set View Once Photo Opened Status */
function setMsgViewOnceOpened(id, isOpened) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.viewOnceOpened = isOpened;
  renderCanvas();
}

/** Set View Once Photo Custom Text Label */
function setMsgViewOnceText(id, text) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.viewOnceText = text;
  renderCanvas();
}

/** Set Document File Name */
function setMsgDocName(id, name) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.docName = name;
  renderCanvas();
}

/** Set Document File Size & Meta */
function setMsgDocSize(id, size) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.docSize = size;
  renderCanvas();
}

/** Set Custom Time for an Individual Message */
function setMsgTime(id, time) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.time = time;
  renderCanvas();
}

/** Auto sequence message timestamps with a custom gap (e.g. +1 minute per chat) */
function autoSequenceMsgTimes(gapMinutes = 1) {
  if (state.messages.length === 0) return;
  let startTime = state.time || '12:00';
  let [h, m] = startTime.split(':').map(n => parseInt(n, 10) || 0);

  state.messages.forEach((msg, idx) => {
    if (idx === 0) {
      msg.time = startTime;
    } else {
      m += gapMinutes;
      if (m >= 60) {
        h = (h + Math.floor(m / 60)) % 24;
        m = m % 60;
      }
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      msg.time = `${hh}:${mm}`;
    }
  });

  renderCanvas();
  renderDashboard();
  triggerAutoSave();
}

function resetZoomEditor() {
  const messagesContainer = document.getElementById('wa-messages');
  if (!messagesContainer) return;
  const zoomSpeed = parseFloat(document.getElementById('inp-zoom-speed')?.value || '0.45');
  messagesContainer.style.transition = `transform ${zoomSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`;
  messagesContainer.style.transformOrigin = 'center center';
  messagesContainer.style.transform = 'scale(1)';
}

function triggerAutoZoomEditor(msgEl, isOut, customScaleOverride) {
  if (!msgEl) return;
  const messagesContainer = document.getElementById('wa-messages');
  if (!messagesContainer) return;

  const scaleInput    = parseFloat(document.getElementById('inp-zoom-scale')?.value || '1.15');
  const zoomIntensity = parseFloat(customScaleOverride || scaleInput || '1.15');
  const zoomSpeed     = parseFloat(document.getElementById('inp-zoom-speed')?.value || '0.45');

  const originX = isOut ? '85%' : '15%';

  messagesContainer.style.transition = `transform ${zoomSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`;
  messagesContainer.style.transformOrigin = `${originX} bottom`;
  messagesContainer.style.transform = `scale(${zoomIntensity})`;
}

function updateZoomScaleValue(val) {
  const formatted = parseFloat(val).toFixed(2) + '×';
  const label = document.getElementById('zoom-scale-val');
  if (label) label.textContent = formatted;
  
  // Re-preview zoom if a message is active
  const activeZoomedMsg = state.messages.find(m => m.enableZoom);
  if (activeZoomedMsg) {
    const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${activeZoomedMsg.id}"]`);
    if (msgEl) {
      triggerAutoZoomEditor(msgEl, activeZoomedMsg.direction === 'outgoing', activeZoomedMsg.customScale);
    }
  }
  triggerAutoSave();
}

function updateZoomSpeedValue(val) {
  const formatted = parseFloat(val).toFixed(2) + 's';
  const label = document.getElementById('zoom-speed-val');
  if (label) label.textContent = formatted;
  triggerAutoSave();
}

function saveElevenKey(keyVal) {
  if (keyVal) {
    localStorage.setItem('wa_eleven_api_key', keyVal.trim());
  }
  triggerAutoSave();
}

function setElevenModel(val) {
  state.elevenModel = val;
  triggerAutoSave();
}

function toggleTtsEnable(checked) {
  const wrap = document.getElementById('wrap-tts-options');
  if (wrap) wrap.style.display = checked ? 'block' : 'none';
  triggerAutoSave();
}

function setTtsVoiceIn(val) {
  const customInp = document.getElementById('inp-custom-voice-in');
  if (val === 'custom') {
    if (customInp) customInp.classList.remove('hidden');
    state.ttsVoiceIn = customInp?.value || 'EXAVITQu4vr4xnSDxMaL';
  } else {
    if (customInp) customInp.classList.add('hidden');
    state.ttsVoiceIn = val;
  }
  triggerAutoSave();
}

function saveCustomVoiceIn(val) {
  state.ttsVoiceIn = val.trim() || 'EXAVITQu4vr4xnSDxMaL';
  triggerAutoSave();
}

function setTtsVoiceOut(val) {
  const customInp = document.getElementById('inp-custom-voice-out');
  if (val === 'custom') {
    if (customInp) customInp.classList.remove('hidden');
    state.ttsVoiceOut = customInp?.value || 'pNInz6obpgDQGcFmaJgB';
  } else {
    if (customInp) customInp.classList.add('hidden');
    state.ttsVoiceOut = val;
  }
  triggerAutoSave();
}

function saveCustomVoiceOut(val) {
  state.ttsVoiceOut = val.trim() || 'pNInz6obpgDQGcFmaJgB';
  triggerAutoSave();
}

function setTtsEmotion(val) {
  state.ttsEmotion = val;
  triggerAutoSave();
}

function updateStability(val) {
  const v = parseFloat(val).toFixed(2);
  const label = document.getElementById('tts-stability-val');
  if (label) label.textContent = v;
  triggerAutoSave();
}

function updateStyle(val) {
  const v = parseFloat(val).toFixed(2);
  const label = document.getElementById('tts-style-val');
  if (label) label.textContent = v;
  triggerAutoSave();
}

function updateTtsSpeedValue(val) {
  const formatted = parseFloat(val).toFixed(2) + '×';
  const label = document.getElementById('tts-speed-val');
  if (label) label.textContent = formatted;
  triggerAutoSave();
}

function setMsgCustomZoomScale(id, scaleVal) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.customScale = scaleVal;
  
  const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${id}"]`);
  if (msgEl) {
    triggerAutoZoomEditor(msgEl, msg.direction === 'outgoing', scaleVal);
  }
  triggerAutoSave();
}

function toggleMsgAdvSettings(id) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.showAdvSettings = !msg.showAdvSettings;
  renderDashboard();
}

function handleMsgZoomSelect(id, value) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;

  if (value === 'off') {
    msg.enableZoom = false;
  } else {
    msg.enableZoom = true;
    msg.customScale = value;
    
    // Make sure autoZoom is active
    const chkAuto = document.getElementById('inp-auto-zoom');
    if (chkAuto && !chkAuto.checked) {
      chkAuto.checked = true;
    }
  }

  renderDashboard();

  setTimeout(() => {
    const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${id}"]`);
    if (msg.enableZoom && msgEl) {
      triggerAutoZoomEditor(msgEl, msg.direction === 'outgoing', msg.customScale);
    } else {
      resetZoomEditor();
    }
  }, 50);

  triggerAutoSave();
}

/** Toggle Selective Zoom on a specific message */
function toggleMsgZoom(id) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.enableZoom = !msg.enableZoom;

  // Make sure autoZoom setting is checked if any message enables zoom
  if (msg.enableZoom) {
    const chkAuto = document.getElementById('inp-auto-zoom');
    if (chkAuto && !chkAuto.checked) {
      chkAuto.checked = true;
      document.getElementById('wrap-zoom-scale')?.classList.remove('hidden');
    }
  }

  renderDashboard();

  // Instantly preview zoom on editor canvas if Zoom ON
  setTimeout(() => {
    const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${id}"]`);
    if (msg.enableZoom && msgEl) {
      triggerAutoZoomEditor(msgEl, msg.direction === 'outgoing', msg.customScale);
    } else {
      resetZoomEditor();
    }
  }, 50);

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

  // Update Push Notification Banner Overlay if current frame message is a notification
  const currentMsg = (frameIndex > 0 && state.messages) ? state.messages[frameIndex - 1] : null;
  updatePushNotifOverlay(currentMsg);

  // Trigger VN waveform animation if newly revealed frame message is a Voice Note
  if (frameIndex > 0 && state.messages[frameIndex - 1]?.type === 'voice') {
    triggerVnAnimationOnFrame(state.messages[frameIndex - 1].id);
  }
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
  
  // Render Custom Phone Status Bar (Battery %, Sinyal, OS Style)
  const statusBarEl = document.getElementById('wa-status-bar');
  if (statusBarEl && typeof renderCustomStatusBarHtml === 'function') {
    statusBarEl.innerHTML = renderCustomStatusBarHtml({
      phoneOs: state.phoneOs,
      clockTime: state.time,
      batteryLevel: state.batteryLevel,
    });
  }

  // Render Pinned Message Banner if enabled
  if (typeof updatePinnedBannerUI === 'function') {
    updatePinnedBannerUI(state);
  }

  // Render Header Status Subtitle (Online vs Custom Last Seen)
  if (typeof updateHeaderStatusUI === 'function') {
    updateHeaderStatusUI(state);
  }

  const cPfp     = document.getElementById('wa-pfp');
  const fallback = document.getElementById('wa-pfp-fallback');
  if (cPfp) {
    if (state.pfp) {
      cPfp.src = state.pfp;
      cPfp.style.display = 'block';
      if (fallback) fallback.style.display = 'none';
    } else {
      cPfp.style.display = 'none';
      if (fallback) fallback.style.display = 'flex';
    }
  }
  
  const chatTarget = document.getElementById('wa-chat-area');
  if (chatTarget) {
    if (state.bgType === 'default') {
      chatTarget.style.backgroundColor = '#111B21';
      chatTarget.style.backgroundImage = "url('assets/wa-pattern.svg')";
      chatTarget.style.backgroundRepeat = 'repeat';
      chatTarget.style.backgroundSize = '400px';
      chatTarget.style.backgroundPosition = 'center top';
    } else if (state.bgType === 'color') {
      chatTarget.style.backgroundColor = state.bgColor;
      chatTarget.style.backgroundImage = "url('assets/wa-pattern.svg')";
      chatTarget.style.backgroundRepeat = 'repeat';
      chatTarget.style.backgroundSize = '400px';
      chatTarget.style.backgroundPosition = 'center top';
    } else if (state.bgType === 'image') {
      chatTarget.style.backgroundColor = '#111B21';
      if (state.bgImage) {
        chatTarget.style.backgroundImage = `url('${state.bgImage}')`;
        chatTarget.style.backgroundRepeat = 'no-repeat';
        chatTarget.style.backgroundSize = 'cover';
        chatTarget.style.backgroundPosition = 'center top';
      } else {
        chatTarget.style.backgroundImage = "url('assets/wa-pattern.svg')";
        chatTarget.style.backgroundRepeat = 'repeat';
        chatTarget.style.backgroundSize = '400px';
        chatTarget.style.backgroundPosition = 'center top';
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

const inpAutoZoom = document.getElementById('inp-auto-zoom');
if (inpAutoZoom) {
  inpAutoZoom.addEventListener('change', (e) => {
    document.getElementById('wrap-zoom-scale')?.classList.toggle('hidden', !e.target.checked);
  });
}

// Auto-save listeners for Video & Auto-Zoom options
['inp-hold-duration', 'inp-reply-delay', 'inp-typing', 'inp-sound-in', 'inp-sound-out', 'inp-auto-zoom', 'inp-zoom-scale', 'inp-zoom-speed'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => triggerAutoSave());
    el.addEventListener('input', () => triggerAutoSave());
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

    // Capture typing frame between messages (only for text messages)
    if (useTyping && i < state.messages.length && state.messages[i].type === 'text') {
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
    restoreStatusHeader(state);
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
      restoreStatusHeader(state);
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

    const targetMsg = (frame >= 1 && frame <= state.messages.length) ? state.messages[frame - 1] : null;
    const isTextMsg = targetMsg && targetMsg.type === 'text';

    const hasSelectiveZoom = state.messages.some(m => m.enableZoom === true);
    const autoZoomSetting = document.getElementById('inp-auto-zoom')?.checked ?? false;
    const shouldZoomMsg = hasSelectiveZoom ? !!targetMsg?.enableZoom : autoZoomSetting;

    const handleZoomAnimation = () => {
      if (shouldZoomMsg && targetMsg) {
        const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${targetMsg.id}"]`);
        if (msgEl) triggerAutoZoomEditor(msgEl, targetMsg.direction === 'outgoing');
      } else {
        resetZoomEditor();
      }
    };

    if (useTyping && isTextMsg) {
      if (targetMsg.direction === 'incoming' && typeof showTypingIndicatorHeader === 'function') {
        showTypingIndicatorHeader('mengetik');
      }
      showTyping();
      setTimeout(() => { 
        hideTyping(); 
        if (typeof updateHeaderStatusUI === 'function') {
          updateHeaderStatusUI(state);
        } else {
          restoreStatusHeader(state);
        }
        applyFrame(frame); 
        handleZoomAnimation();
        playSoundIfIncoming(frame);
      }, 800);
    } else {
      hideTyping();
      if (typeof updateHeaderStatusUI === 'function') {
        updateHeaderStatusUI(state);
      } else {
        restoreStatusHeader(state);
      }
      applyFrame(frame);
      if (frame >= 1 && frame <= state.messages.length) {
        handleZoomAnimation();
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
  if (state.messages.length < 1) missing.push('At least 1 message');
  if (missing.length) {
    alert(`⚠️ Please fill in:\n\n• ${missing.join('\n• ')}`);
    return;
  }

  const payload = getProjectPayload();

  try {
    localStorage.setItem('wa_preview', JSON.stringify(payload));
  } catch (e) {
    alert('⚠️ Could not save preview data. Images may be too large — try fewer images or reduce their size.');
    return;
  }

  window.open('preview', '_blank');
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
  const holdMs       = parseInt(document.getElementById('inp-hold-duration')?.value || '2500', 10);
  const replyDelay   = parseInt(document.getElementById('inp-reply-delay')?.value || '1400', 10);
  const useTyping    = document.getElementById('inp-typing')?.checked ?? true;
  const useSoundIn   = document.getElementById('inp-sound-in')?.checked ?? true;
  const useSoundOut  = document.getElementById('inp-sound-out')?.checked ?? false;
  const autoZoom     = document.getElementById('inp-auto-zoom')?.checked ?? false;
  const zoomScale    = parseFloat(document.getElementById('inp-zoom-scale')?.value || '1.20');
  const zoomSpeed    = parseFloat(document.getElementById('inp-zoom-speed')?.value || '0.45');

  return {
    name:            state.name,
    pfp:             state.pfp,
    messages:        state.messages,
    scale:           state.scale,
    time:            state.time,
    phoneOs:         state.phoneOs || 'ios',
    chatType:        state.chatType || 'personal',
    groupSubtitle:   state.groupSubtitle || 'Sinta, Budi, Anda, Agus',
    batteryLevel:    state.batteryLevel || 85,
    lastSeenMode:    state.lastSeenMode || 'online',
    lastSeenText:    state.lastSeenText || '',
    pinnedEnabled:   !!state.pinnedEnabled,
    pinnedText:      state.pinnedText || '',
    showUnreadBadge: !!state.showUnreadBadge,
    unreadCount:     state.unreadCount || '99+',
    bgType:          state.bgType,
    bgColor:         state.bgColor,
    bgImage:         state.bgImage,
    holdMs,
    replyDelay,
    useTyping,
    useSoundIn,
    useSoundOut,
    autoZoom:        autoZoom,
    zoomScale:       zoomScale,
    zoomSpeed:       zoomSpeed,
    enableTts:       document.getElementById('chk-enable-tts')?.checked === true,
    elevenKey:       document.getElementById('inp-eleven-key')?.value || localStorage.getItem('wa_eleven_api_key') || 'sk_c51258c7ff945a2b4c807650eca86f5f74fb336e0f656f45',
    elevenModel:     document.getElementById('sel-eleven-model')?.value || 'eleven_v3',
    ttsVoiceIn:      (document.getElementById('sel-tts-voice-in')?.value === 'custom') ? (document.getElementById('inp-custom-voice-in')?.value?.trim() || 'EXAVITQu4vr4xnSDxMaL') : (document.getElementById('sel-tts-voice-in')?.value || 'EXAVITQu4vr4xnSDxMaL'),
    ttsVoiceOut:     (document.getElementById('sel-tts-voice-out')?.value === 'custom') ? (document.getElementById('inp-custom-voice-out')?.value?.trim() || 'pNInz6obpgDQGcFmaJgB') : (document.getElementById('sel-tts-voice-out')?.value || 'pNInz6obpgDQGcFmaJgB'),
    ttsStability:    parseFloat(document.getElementById('inp-tts-stability')?.value ?? '0.25'),
    ttsStyle:        parseFloat(document.getElementById('inp-tts-style')?.value ?? '0.50'),
    ttsSpeed:        parseFloat(document.getElementById('inp-tts-speed')?.value || '1.00'),
    updatedAt:       Date.now()
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
const WORKER_URL  = window.WORKER_URL || 'https://wa-templates-worker.aldoramadhan16.workers.dev/templates';
let TEAM_PASSCODE = localStorage.getItem('wa_team_passcode') || window.TEAM_PASSCODE || '';

function showPasscodeModal() {
  const modal = document.getElementById('passcode-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const inp = document.getElementById('inp-passcode');
    if (inp) setTimeout(() => inp.focus(), 150);
  }
}

function hidePasscodeModal() {
  const modal = document.getElementById('passcode-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function togglePasscodeVisibility() {
  const inp = document.getElementById('inp-passcode');
  if (inp) {
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }
}

async function verifyPasscodeWithWorker(code) {
  if (!WORKER_URL || !code) return false;
  try {
    const res = await fetch(WORKER_URL, {
      headers: { 'X-Team-Passcode': code }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function handleUnlockApp(e) {
  if (e) e.preventDefault();
  const inp = document.getElementById('inp-passcode');
  const err = document.getElementById('passcode-error');
  const btn = document.getElementById('btn-unlock');
  if (!inp) return;

  const entered = inp.value.trim();
  if (!entered) return;

  btn.disabled = true;
  btn.classList.add('opacity-50');
  if (err) err.classList.add('hidden');

  const isValid = await verifyPasscodeWithWorker(entered);

  btn.disabled = false;
  btn.classList.remove('opacity-50');

  if (entered) {
    localStorage.setItem('wa_team_passcode', entered);
    TEAM_PASSCODE = entered;
  }
  hidePasscodeModal();
  try {
    await fetchCloudTemplates();
    await checkUrlParams();
  } catch (err) {}
  showToast('🔓 App Unlocked!');
}

function lockAppSession() {
  localStorage.removeItem('wa_team_passcode');
  TEAM_PASSCODE = '';
  showPasscodeModal();
  const inp = document.getElementById('inp-passcode');
  if (inp) inp.value = '';
}

let _cloudTemplates = {};

async function fetchCloudTemplates() {
  if (!WORKER_URL || !TEAM_PASSCODE) return;

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
  state.messages = (Array.isArray(data.messages) ? data.messages : []).map(m => ({
    ...m,
    id: m.id || newId()
  }));
  state.scale         = data.scale || 2;
  state.time          = data.time || '16:12';
  state.phoneOs       = data.phoneOs || 'ios';
  state.chatType      = data.chatType || 'personal';
  state.groupSubtitle = data.groupSubtitle || 'Sinta, Budi, Anda, Agus';
  state.batteryLevel  = data.batteryLevel !== undefined ? data.batteryLevel : 85;
  state.bgType        = data.bgType || 'default';
  state.bgColor       = data.bgColor || '#111B21';
  state.bgImage       = data.bgImage || null;

  const inpBattery = document.getElementById('inp-battery');
  if (inpBattery) inpBattery.value = state.batteryLevel;
  const badgeBattery = document.getElementById('battery-val');
  if (badgeBattery) {
    badgeBattery.textContent = `${state.batteryLevel}%`;
    badgeBattery.className = state.batteryLevel <= 20 ? 'text-xs font-bold text-red-500' : 'text-xs font-bold text-emerald-400';
  }

  const inpGroupSub = document.getElementById('inp-group-subtitle');
  if (inpGroupSub) inpGroupSub.value = state.groupSubtitle;

  updateChatTypeUI();
  updatePhoneOsUI();

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

  // PFP UI (Dashboard & Canvas Header)
  const pfpWrap  = document.getElementById('pfp-preview-wrap');
  const pfpImg   = document.getElementById('pfp-preview');
  const pfpName  = document.getElementById('pfp-preview-name');
  const pfpLabel = document.getElementById('pfp-label');
  const cPfp     = document.getElementById('wa-pfp');
  const fallback = document.getElementById('wa-pfp-fallback');

  if (state.pfp) {
    if (pfpImg) pfpImg.src = state.pfp;
    if (pfpName) pfpName.textContent = 'Uploaded Image';
    if (pfpWrap) pfpWrap.style.display = 'flex';
    if (pfpLabel) pfpLabel.textContent = 'Change image…';

    if (cPfp) {
      cPfp.src = state.pfp;
      cPfp.style.display = 'block';
    }
    if (fallback) fallback.style.display = 'none';
  } else {
    if (pfpWrap) pfpWrap.style.display = 'none';
    if (pfpLabel) pfpLabel.textContent = 'Upload image…';

    if (cPfp) cPfp.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';
  }

  // Background UI toggles
  document.getElementById('inp-bg-color')?.classList.toggle('hidden', state.bgType !== 'color');
  document.getElementById('lbl-bg-image')?.classList.toggle('hidden', state.bgType !== 'image');
  const bgImgName = document.getElementById('bg-image-name');
  if (bgImgName) bgImgName.textContent = state.bgImage ? 'Image Loaded' : 'Upload custom image…';

  // Video options UI
  if (data.holdMs !== undefined && document.getElementById('inp-hold-duration')) {
    document.getElementById('inp-hold-duration').value = data.holdMs;
    const holdVal = document.getElementById('hold-val');
    if (holdVal) holdVal.textContent = (data.holdMs / 1000).toFixed(1) + 's';
  }
  if (data.replyDelay !== undefined && document.getElementById('inp-reply-delay')) {
    document.getElementById('inp-reply-delay').value = data.replyDelay;
    const replyVal = document.getElementById('reply-delay-val');
    if (replyVal) replyVal.textContent = (data.replyDelay / 1000).toFixed(1) + 's';
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
  if (data.autoZoom !== undefined && document.getElementById('inp-auto-zoom')) {
    const inpAZ = document.getElementById('inp-auto-zoom');
    inpAZ.checked = data.autoZoom;
    document.getElementById('wrap-zoom-scale')?.classList.toggle('hidden', !data.autoZoom);
  }
  if (data.zoomScale !== undefined && document.getElementById('inp-zoom-scale')) {
    document.getElementById('inp-zoom-scale').value = data.zoomScale;
  }
  if (data.zoomSpeed !== undefined && document.getElementById('inp-zoom-speed')) {
    document.getElementById('inp-zoom-speed').value = data.zoomSpeed;
    const speedVal = document.getElementById('zoom-speed-val');
    if (speedVal) speedVal.textContent = parseFloat(data.zoomSpeed).toFixed(2) + 's';
  }

  syncBaseFields();
  renderDashboard();

  _isRestoringState = false;
}

function handleSelectTemplate(val) {
  _isNewBlankProject = false;
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

let _isNewBlankProject = false;

async function saveAsNewTemplate() {
  const defaultName = state.name ? state.name.trim() : 'My WA Preset';
  const tplName = prompt('Masukkan Nama Preset Baru:', defaultName);
  if (!tplName || !tplName.trim()) return;

  const trimmedName = tplName.trim();
  const payload = getProjectPayload();
  await preRenderTtsAudioForCloud(payload);
  const cleanId = `${Date.now()}`;

  // 1. Save to Local Storage (works 100% offline)
  const localTemplates = getSavedTemplates();
  localTemplates[cleanId] = {
    id: cleanId,
    name: trimmedName,
    updatedAt: Date.now(),
    data: payload
  };

  try {
    localStorage.setItem(TPL_KEY, JSON.stringify(localTemplates));
  } catch (e) {
    console.warn('Local storage save issue:', e);
  }

  // 2. Sync to Cloud Worker (if available)
  if (WORKER_URL && TEAM_PASSCODE) {
    _cloudTemplates[cleanId] = {
      id: cleanId,
      name: trimmedName,
      updatedAt: Date.now(),
      data: payload
    };

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
      console.warn('Cloud Worker sync issue:', e);
    }
  }

  _isNewBlankProject = false;
  renderTemplateDropdown(`cloud_${cleanId}`);
  showToast(`💾 Preset "${trimmedName}" berhasil dibuat!`);
}

async function saveCurrentTemplate() {
  const currentVal = document.getElementById('tpl-select')?.value || 'auto';
  
  if (currentVal === 'auto') {
    return saveAsNewTemplate();
  }

  _isNewBlankProject = false;
  const payload = getProjectPayload();
  await preRenderTtsAudioForCloud(payload);
  const cleanId = currentVal.replace(/^(local_|cloud_)/, '');

  let tplName = state.name || 'Preset';

  // 1. Update in Local Storage
  const localTemplates = getSavedTemplates();
  if (localTemplates[cleanId]) {
    tplName = localTemplates[cleanId].name;
    localTemplates[cleanId].data = payload;
    localTemplates[cleanId].updatedAt = Date.now();
    try {
      localStorage.setItem(TPL_KEY, JSON.stringify(localTemplates));
    } catch (e) {}
  }

  // 2. Update in Cloud Storage
  if (_cloudTemplates[cleanId]) {
    tplName = _cloudTemplates[cleanId].name;
    _cloudTemplates[cleanId].data = payload;
    _cloudTemplates[cleanId].updatedAt = Date.now();
  } else {
    _cloudTemplates[cleanId] = {
      id: cleanId,
      name: tplName,
      updatedAt: Date.now(),
      data: payload
    };
  }

  if (WORKER_URL && TEAM_PASSCODE) {
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
      console.warn('Cloud sync error:', e);
    }
  }

  renderTemplateDropdown(currentVal);
  showToast(`💾 Preset "${tplName}" berhasil di-update!`);
}

async function deleteCurrentTemplate() {
  const currentVal = document.getElementById('tpl-select')?.value;
  if (!currentVal || currentVal === 'auto') {
    alert('⚠️ Template Draft (Auto-saved) tidak dapat dihapus.');
    return;
  }

  const cleanId = currentVal.replace(/^(local_|cloud_)/, '');
  const localTemplates = getSavedTemplates();
  const tplName = localTemplates[cleanId]?.name || _cloudTemplates[cleanId]?.name || 'Template';

  if (confirm(`Hapus template "${tplName}"?`)) {
    // Delete from Local
    if (localTemplates[cleanId]) {
      delete localTemplates[cleanId];
      localStorage.setItem(TPL_KEY, JSON.stringify(localTemplates));
    }

    // Delete from Cloud
    if (_cloudTemplates[cleanId]) {
      delete _cloudTemplates[cleanId];
      if (WORKER_URL && TEAM_PASSCODE) {
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
    }

    loadDraftFromLocalStorage();
    renderTemplateDropdown('auto');
  }
}

function createNewProject() {
  if (confirm('Buat project baru yang kosong? (Draft saat ini akan di-reset)')) {
    _isNewBlankProject = true;
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

function showToast(msg) {
  const badge = document.getElementById('save-status-badge');
  if (badge) {
    badge.textContent = msg;
    badge.classList.remove('opacity-0');
    badge.classList.add('opacity-100');
    setTimeout(() => {
      badge.classList.remove('opacity-100');
      badge.classList.add('opacity-0');
      setTimeout(() => { badge.textContent = 'Auto-saved ✓'; }, 300);
    }, 3500);
  }
}

async function fetchElevenLabsAudioBlob(rawText, voiceId = 'pNInz6obpgDQGcFmaJgB', apiKey = '', options = {}) {
  if (!rawText) return null;
  const cleanText = rawText.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
  if (!cleanText) return null;

  const DEFAULT_KEY = 'sk_c51258c7ff945a2b4c807650eca86f5f74fb336e0f656f45';
  const OLD_KEY = 'sk_aec3efa2efccb7f5155c04757341c942e1dccdb5fb7e9e20';

  let keyToUse = apiKey;
  if (!keyToUse || keyToUse === OLD_KEY) {
    keyToUse = localStorage.getItem('wa_eleven_api_key');
  }
  if (!keyToUse || keyToUse === OLD_KEY) {
    keyToUse = DEFAULT_KEY;
  }

  let targetVoice = (!voiceId || voiceId === 'custom' || voiceId === 'google-mp3') ? 'EXAVITQu4vr4xnSDxMaL' : voiceId;
  const modelToUse = options.elevenModel || 'eleven_v3';
  const stability  = options.ttsStability != null ? options.ttsStability : 0.15;
  const style      = options.ttsStyle != null ? options.ttsStyle : 0.65;

  const voiceSettings = {
    stability:          stability,
    similarity_boost:   0.85,
    style:              style,
    use_speaker_boost:  true
  };

  async function requestAudio(vId, kToUse) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': kToUse,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelToUse,
          voice_settings: voiceSettings
        })
      });

      if (res.status === 401 && kToUse !== DEFAULT_KEY) {
        localStorage.setItem('wa_eleven_api_key', DEFAULT_KEY);
        return requestAudio(vId, DEFAULT_KEY);
      }

      if (res.status === 402) {
        return { status: 402, blob: null };
      }

      if (!res.ok) {
        return { status: res.status, blob: null };
      }

      const blob = await res.blob();
      return { status: 200, blob };
    } catch (err) {
      return { status: 500, blob: null };
    }
  }

  let result = await requestAudio(targetVoice, keyToUse);

  if (result.status === 402 && targetVoice !== 'EXAVITQu4vr4xnSDxMaL' && targetVoice !== 'pNInz6obpgDQGcFmaJgB') {
    const fallbackVoice = 'EXAVITQu4vr4xnSDxMaL';
    result = await requestAudio(fallbackVoice, keyToUse);
  }

  if (result.blob) {
    return URL.createObjectURL(result.blob);
  }

  return null;
}

async function preRenderTtsAudioForCloud(payload) {
  if (!payload || payload.enableTts === false || !payload.messages) return payload;

  const messages = payload.messages;
  const apiKey = payload.elevenKey || localStorage.getItem('wa_eleven_api_key') || 'sk_c51258c7ff945a2b4c807650eca86f5f74fb336e0f656f45';
  payload.ttsAudioMap = payload.ttsAudioMap || {};

  for (let idx = 0; idx < messages.length; idx++) {
    if (payload.ttsAudioMap[idx]) continue;

    const msg = messages[idx];
    let rawText = '';
    if (msg.type === 'text') rawText = msg.text || '';
    else if (msg.type === 'notification') rawText = `${msg.senderName || 'Notifikasi'}: ${msg.text || ''}`;
    else if (msg.type === 'image' || msg.type === 'view_once') rawText = msg.caption || '';

    const speakable = typeof stripAudioTags === 'function' ? stripAudioTags(rawText) : rawText;
    if (!speakable) continue;

    const isOut = msg.direction === 'outgoing';
    const defaultInVoice  = 'EXAVITQu4vr4xnSDxMaL';
    const defaultOutVoice = 'pNInz6obpgDQGcFmaJgB';
    const voiceId = isOut
      ? (payload.ttsVoiceOut && payload.ttsVoiceOut !== 'google-mp3' && payload.ttsVoiceOut !== 'custom' ? payload.ttsVoiceOut : defaultOutVoice)
      : (payload.ttsVoiceIn  && payload.ttsVoiceIn  !== 'google-mp3' && payload.ttsVoiceIn  !== 'custom' ? payload.ttsVoiceIn  : defaultInVoice);

    try {
      const blobUrl = await fetchElevenLabsAudioBlob(speakable, voiceId, apiKey, payload);
      if (blobUrl) {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        
        // Upload binary MP3 to Worker CDN Storage endpoint (/upload-audio)
        if (WORKER_URL) {
          const uploadRes = await fetch(`${WORKER_URL}/upload-audio?key=audio_${Date.now()}_${idx}.mp3`, {
            method: 'POST',
            body: blob
          });
          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            if (uploadJson.url) {
              payload.ttsAudioMap[idx] = uploadJson.url;
              console.log(`☁️ [Cloud Storage Audio] Uploaded MP3 for msg #${idx + 1}:`, uploadJson.url);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Pre-rendering audio error for msg #' + idx, e);
    }
  }

  return payload;
}

async function copyShareLink(targetType = 'preview') {
  const currentVal = document.getElementById('tpl-select')?.value || 'auto';
  let cloudId = null;

  const payload = getProjectPayload();
  await preRenderTtsAudioForCloud(payload);

  if (currentVal.startsWith('cloud_')) {
    cloudId = currentVal;
    const cleanId = currentVal.replace('cloud_', '');
    const tplName = _cloudTemplates[cleanId]?.name || state.name || 'My WA Preset';

    // Auto-sync latest editor payload (including autoZoom, zoomScale, zoomSpeed) to Cloud Worker
    _cloudTemplates[cleanId] = {
      id: cleanId,
      name: tplName,
      updatedAt: Date.now(),
      data: payload
    };

    if (WORKER_URL && TEAM_PASSCODE) {
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
        console.warn('Failed to sync latest preset to Cloud Worker:', e);
      }
    }
  } else {
    const confirmSave = confirm('Untuk membuat Share Link yang bisa di-review client via URL, preset perlu tersimpan di Team Cloud.\n\nSimpan ke Team Cloud sekarang?');
    if (!confirmSave) return;

    await saveCurrentTemplate(true);
    const newVal = document.getElementById('tpl-select')?.value || '';
    if (newVal.startsWith('cloud_')) {
      cloudId = newVal;
    } else {
      return;
    }
  }

  const cleanPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  const cleanBase = window.location.origin + (cleanPath.endsWith('/') ? cleanPath : cleanPath + '/');

  const previewUrl = `${cleanBase}preview?preset=${cloudId}`;
  const editorUrl  = `${cleanBase}?preset=${cloudId}`;
  const shareUrl   = targetType === 'editor' ? editorUrl : previewUrl;

  try {
    await navigator.clipboard.writeText(shareUrl);
    alert(`🔗 Link Review Client Berhasil Di-copy!\n\nURL: \n${shareUrl}\n\nKirimkan link ini ke client kamu. Pengaturan Auto-Zoom, pesan, dan wallpaper terbaru sudah otomatis tersinkronisasi ke Cloud!`);
  } catch (e) {
    prompt(`Copy Share Link berikut untuk dikirim ke client:`, shareUrl);
  }
}

async function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const presetParam = urlParams.get('preset') || urlParams.get('p') || urlParams.get('id');
  if (!presetParam) return false;

  const cleanId = presetParam.replace(/^(cloud_|local_)/, '');

  // 1. Check if already in _cloudTemplates
  if (_cloudTemplates[cleanId] || _cloudTemplates[`cloud_${cleanId}`]) {
    const tpl = _cloudTemplates[cleanId] || _cloudTemplates[`cloud_${cleanId}`];
    applyProjectPayload(tpl.data);
    renderTemplateDropdown(tpl.id.startsWith('cloud_') ? tpl.id : `cloud_${tpl.id}`);
    showToast(`🌐 Loaded shared preset: "${tpl.name}"`);
    return true;
  }

  // 2. Fetch from Cloud Worker
  if (WORKER_URL) {
    try {
      const res = await fetch(WORKER_URL, {
        headers: { 'X-Team-Passcode': TEAM_PASSCODE }
      });
      if (res.ok) {
        const json = await res.json();
        _cloudTemplates = json.templates || {};
        const tpl = _cloudTemplates[cleanId] || _cloudTemplates[`cloud_${cleanId}`];
        if (tpl) {
          applyProjectPayload(tpl.data);
          renderTemplateDropdown(tpl.id.startsWith('cloud_') ? tpl.id : `cloud_${tpl.id}`);
          showToast(`🌐 Loaded shared preset: "${tpl.name}"`);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to load shared preset from Worker:', e);
    }
  }

  return false;
}

/* ============================================================
   19. INIT
   ============================================================ */

window.addEventListener('DOMContentLoaded', async () => {
  renderTemplateDropdown('auto');

  const savedPasscode = localStorage.getItem('wa_team_passcode') || 'default';
  const valid = await verifyPasscodeWithWorker(savedPasscode);

  if (valid || !WORKER_URL) {
    TEAM_PASSCODE = savedPasscode;
    hidePasscodeModal();
    await fetchCloudTemplates();
    const loadedFromUrl = await checkUrlParams();
    if (!loadedFromUrl) {
      const loaded = loadDraftFromLocalStorage();
      if (!loaded) renderDashboard();
    }
    return;
  }

  // Show Passcode Gate Modal only if worker explicitly rejects access
  showPasscodeModal();
  const loaded = loadDraftFromLocalStorage();
  // Auto-cleanse outdated API key in localStorage
  const DEFAULT_KEY = 'sk_c51258c7ff945a2b4c807650eca86f5f74fb336e0f656f45';
  const OLD_KEY = 'sk_aec3efa2efccb7f5155c04757341c942e1dccdb5fb7e9e20';
  const storedKey = localStorage.getItem('wa_eleven_api_key');
  if (!storedKey || storedKey === OLD_KEY) {
    localStorage.setItem('wa_eleven_api_key', DEFAULT_KEY);
  }
  const keyInp = document.getElementById('inp-eleven-key');
  if (keyInp && (!keyInp.value || keyInp.value === OLD_KEY)) {
    keyInp.value = DEFAULT_KEY;
  }
});

/* ============================================================
   20. VIRAL SCRIPT GENERATOR PRESETS
   ============================================================ */

const _scriptPresets = {
  drama_labrak: {
    name: 'Drama Selingkuh 💔',
    data: {
      name: 'Sayang 💔',
      pfp: null,
      messages: [
        { type: 'text', direction: 'outgoing', text: 'Kamu tadi jam 3 sore di Cafe Senopati sama siapa?' },
        { type: 'text', direction: 'incoming', text: 'Hah? Sama temen kantor kok beb, meeting kerjaan.' },
        { type: 'text', direction: 'outgoing', text: 'Temen kantor kok rangkulan tangan? Jangan bohong ya!' },
        { type: 'text', direction: 'incoming', text: 'Sumpah beb itu cuma temen lama yang ga sengaja ketemu 😭' },
        { type: 'text', direction: 'outgoing', text: 'Aku punya foto kalian berdua. Kita selesai.' }
      ],
      scale: 2,
      time: '15:42',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null,
      holdMs: 2200,
      replyDelay: 1200,
      useTyping: true,
      useSoundIn: true,
      useSoundOut: true,
      autoZoom: true,
      zoomScale: '1.20',
      zoomSpeed: '0.45'
    }
  },
  olshop_cod: {
    name: 'Olshop & COD 🛍️',
    data: {
      name: 'Kurir Paket 📦',
      pfp: null,
      messages: [
        { type: 'text', direction: 'incoming', text: 'Permisi kak, paket Shopee COD Rp 185.000 sudah di depan rumah.' },
        { type: 'text', direction: 'outgoing', text: 'Waduh mas, saya lagi di luar kota. Bisa ditaruh di dalam pagar?' },
        { type: 'text', direction: 'incoming', text: 'Bisa kak, tapi harus lunas dulu via transfer/QRIS ya.' },
        { type: 'text', direction: 'outgoing', text: 'Oke mas, minta QR Code QRIS-nya ya, saya bayar sekarang.' },
        { type: 'text', direction: 'incoming', text: 'Siap kak, ditunggu ya.' }
      ],
      scale: 2,
      time: '11:15',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null,
      holdMs: 2500,
      replyDelay: 1000,
      useTyping: true,
      useSoundIn: true,
      useSoundOut: true,
      autoZoom: true,
      zoomScale: '1.20',
      zoomSpeed: '0.45'
    }
  },
  nagih_hutang: {
    name: 'Nagih Hutang 💸',
    data: {
      name: 'Budi (Temen SMP) 💸',
      pfp: null,
      messages: [
        { type: 'text', direction: 'outgoing', text: 'Bud, sory banget mau nanya, sisa hutang bulan lalu Rp 500rb kapan bisa ditransfer?' },
        { type: 'text', direction: 'incoming', text: 'Aduh bro, ini lagi ada musibah banget, dompet hilang pas naik motor 😭' },
        { type: 'text', direction: 'outgoing', text: 'Perasaan minggu lalu kamu habis upload Story liburan ke Bali deh Bud...' },
        { type: 'text', direction: 'incoming', text: 'Itu story di-endorse temen bro, beneran aku lagi ga ada uang 😭' },
        { type: 'text', direction: 'outgoing', text: 'Besok tanggal 1 harus udah masuk ya, janji terus dari bulan lalu.' }
      ],
      scale: 2,
      time: '19:30',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null,
      holdMs: 2400,
      replyDelay: 1200,
      useTyping: true,
      useSoundIn: true,
      useSoundOut: true,
      autoZoom: true,
      zoomScale: '1.20',
      zoomSpeed: '0.45'
    }
  },
  bucin_romantis: {
    name: 'Bucin Romantis ❤️',
    data: {
      name: 'Sayang ❤️',
      pfp: null,
      messages: [
        { type: 'text', direction: 'outgoing', text: 'Hari ini capek banget kerjanya, tapi langsung seneng liat kamu.' },
        { type: 'text', direction: 'incoming', text: 'Jangan lupa makan malam ya sayang, jangan ketiduran dulu 😘' },
        { type: 'text', direction: 'outgoing', text: 'Coba deh cek depan pintu rumah kamu sekarang...' },
        { type: 'text', direction: 'incoming', text: 'Hah?! Kamu ngirim apa malam-malam gini??? 😱' },
        { type: 'text', direction: 'outgoing', text: 'Kado sama makanan favorit kamu 🎁 Enjoy your dinner ya!' }
      ],
      scale: 2,
      time: '21:05',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null,
      holdMs: 2200,
      replyDelay: 1000,
      useTyping: true,
      useSoundIn: true,
      useSoundOut: true,
      autoZoom: true,
      zoomScale: '1.20',
      zoomSpeed: '0.45'
    }
  },
  horor_misteri: {
    name: 'Horor & Malam 👻',
    data: {
      name: 'Tetangga Sebelah 👻',
      pfp: null,
      messages: [
        { type: 'text', direction: 'incoming', text: 'Bro, kamu lagi di dalam rumah sendirian kan?' },
        { type: 'text', direction: 'outgoing', text: 'Iya nih bro, lagi nonton TV. Kenapa emang?' },
        { type: 'text', direction: 'incoming', text: 'Jangan keluar kamar dulu. Siapa yang lagi berdiri di teras rumahmu?' },
        { type: 'text', direction: 'outgoing', text: 'Hah?! Jangan bercanda bro, jendela teras lagi kukunci kok!' },
        { type: 'text', direction: 'incoming', text: 'Dia baru aja nengok ke jendela kamar kamu... Buka pintu belakang sekarang!' }
      ],
      scale: 2,
      time: '23:48',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null,
      holdMs: 2500,
      replyDelay: 1400,
      useTyping: true,
      useSoundIn: true,
      useSoundOut: true,
      autoZoom: true,
      zoomScale: '1.20',
      zoomSpeed: '0.45'
    }
  },
  prank_parkir: {
    name: 'Prank Parkir 🤣',
    data: {
      name: 'Agus Bestie 🤣',
      pfp: null,
      messages: [
        { type: 'text', direction: 'incoming', text: 'Gus, emergency banget!! Tolong TF 50rb sekarang, penting banget!' },
        { type: 'text', direction: 'outgoing', text: 'Kenapa jir? Lagi di mana kamu? Kena tilang?!' },
        { type: 'text', direction: 'incoming', text: 'Bukan bro, aku kebelet di mall tapi parkir motor kurang 5rb ga bisa keluar 😭' },
        { type: 'text', direction: 'outgoing', text: 'Walah wkwk, kaget aku kira ada apa. Yaudah mana nomor DANA mu.' },
        { type: 'text', direction: 'incoming', text: 'Wkwk makasih bro, penyelamat hidup 😭' }
      ],
      scale: 2,
      time: '17:10',
      bgType: 'default',
      bgColor: '#111B21',
      bgImage: null,
      holdMs: 2000,
      replyDelay: 1000,
      useTyping: true,
      useSoundIn: true,
      useSoundOut: true,
      autoZoom: true,
      zoomScale: '1.20',
      zoomSpeed: '0.45'
    }
  }
};

function loadScriptPreset(scriptKey) {
  const tpl = _scriptPresets[scriptKey];
  if (!tpl) return;

  if (confirm(`Muat naskah "${tpl.name}"? (Pesan saat ini akan digantikan)`)) {
    const payload = JSON.parse(JSON.stringify(tpl.data));
    payload.messages = (payload.messages || []).map(m => ({ ...m, id: newId() }));
    applyProjectPayload(payload);
    showToast(`✨ Naskah "${tpl.name}" berhasil dimuat! Tinggal Play Preview.`);
  }
}

/* ============================================================
   19. FULL AI SCRIPT GENERATOR ENGINE
   ============================================================ */

function createImagePlaceholderSvg(desc, caption) {
  const label = desc || caption || 'Foto Lampiran';
  const cleanLabel = String(label).replace(/["'<>&]/g, '').slice(0, 35);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="50%" stop-color="#312e81"/>
        <stop offset="100%" stop-color="#4c1d95"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <circle cx="300" cy="170" r="45" fill="none" stroke="#a78bfa" stroke-width="4" opacity="0.8"/>
    <path d="M285 170 h30 m-15 -15 v30" stroke="#a78bfa" stroke-width="4" stroke-linecap="round"/>
    <text x="300" y="250" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">📷 ${cleanLabel}</text>
    <text x="300" y="285" fill="#c084fc" font-family="sans-serif" font-size="14" text-anchor="middle">Klik untuk ganti foto di editor</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function setAiPrompt(text) {
  const inp = document.getElementById('inp-ai-prompt');
  if (inp) {
    inp.value = text;
    inp.focus();
  }
}

async function generateAiScript() {
  const inp = document.getElementById('inp-ai-prompt');
  const selLength = document.getElementById('sel-ai-length');
  const selVoiceStyle = document.getElementById('sel-ai-voice-style');
  const btn = document.getElementById('btn-generate-ai');
  const userPrompt = inp ? inp.value.trim() : '';
  const targetLength = selLength ? selLength.value : 'medium';
  const voiceStyle = selVoiceStyle ? selVoiceStyle.value : 'dramatic';

  if (!userPrompt) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Tuliskan ide cerita/skenario terlebih dahulu!');
    } else {
      alert('⚠️ Tuliskan ide cerita/skenario terlebih dahulu!');
    }
    if (inp) inp.focus();
    return;
  }

  // Set UI Loading state
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>✨ AI sedang menyusun naskah...</span>`;
    btn.classList.add('opacity-80', 'cursor-not-allowed');
  }

  try {
    let aiData = null;
    let isRealAiCall = false;
    let modelUsed = '';

    // 1. Try Cloudflare Worker Gemini AI Endpoint first
    const workerAiUrl = 'https://wa-templates-worker.aldoramadhan16.workers.dev/ai-script';
    try {
      const res = await fetch(workerAiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, targetLength: targetLength, voiceStyle: voiceStyle })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.messages && json.messages.length > 0) {
          aiData = json;
          isRealAiCall = true;
          modelUsed = json._modelUsed || 'gemini-2.0-flash-lite';
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Worker AI Endpoint error:', res.status, errJson);
      }
    } catch (e) {
      console.warn('Worker AI Endpoint unavailable, falling back to smart local engine:', e);
    }

    // 2. Fallback to smart local generator engine if worker is offline/unreachable
    if (!aiData) {
      await sleep(1000);
      aiData = generateSmartAiStory(userPrompt);
    }

    if (aiData && aiData.messages && aiData.messages.length > 0) {
      const isGroup = aiData.chatType === 'group' || (aiData.name && aiData.name.toLowerCase().includes('grup'));
      const payload = {
        name: aiData.name || (isGroup ? 'Grup WA 👥' : 'Kontak WA'),
        pfp: null,
        messages: aiData.messages.map(m => {
          let dataUrl = m.dataUrl || null;
          if (m.type === 'image' && !dataUrl) {
            dataUrl = createImagePlaceholderSvg(m.imgDesc, m.caption);
          }
          return {
            ...m,
            id: newId(),
            dataUrl: dataUrl,
            showAdvSettings: false,
            enableZoom: m.enableZoom || false,
            customScale: m.customScale || '1.20'
          };
        }),
        scale: 2,
        time: aiData.time || '21:15',
        phoneOs: 'ios',
        chatType: isGroup ? 'group' : 'personal',
        groupSubtitle: aiData.groupSubtitle || 'Sinta, Budi, Anda, Agus',
        batteryLevel: 85,
        bgType: 'default',
        bgColor: '#111B21',
        bgImage: null,
        holdMs: 2200,
        replyDelay: 1200,
        useTyping: true,
        useSoundIn: true,
        useSoundOut: true,
        autoZoom: true,
        zoomScale: '1.20',
        zoomSpeed: '0.45'
      };

      applyProjectPayload(payload);
      if (typeof showToast === 'function') {
        if (isRealAiCall) {
          console.log(`🤖 [AI ENGINE LOG]: Berhasil memanggil Gemini API (Model: ${modelUsed})`);
          showToast(`🤖 [AI LOG]: Berhasil dibuat langsung oleh Gemini API (${modelUsed})!`);
        } else {
          console.warn('⚠️ [AI ENGINE LOG]: Menggunakan Local Offline Engine');
          showToast('⚠️ [AI LOG]: Worker Offline - Menggunakan Local Engine');
        }
      }
    }
  } catch (err) {
    console.error('AI Generation Error:', err);
    const fallbackData = generateSmartAiStory(userPrompt);
    const payload = {
      name: fallbackData.name || 'Kontak WA',
      pfp: null,
      messages: fallbackData.messages.map(m => ({ ...m, id: newId() })),
      scale: 2,
      time: fallbackData.time || '21:15',
      phoneOs: 'ios',
      chatType: 'personal',
      batteryLevel: 85,
      bgType: 'default',
      holdMs: 2200,
      replyDelay: 1200,
      useTyping: true,
      autoZoom: true
    };
    applyProjectPayload(payload);
    if (typeof showToast === 'function') {
      showToast('✨ Naskah AI berhasil dibuat!');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
      btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
  }
}

function generateSmartAiStory(prompt) {
  const p = prompt.toLowerCase();

  let name = 'Ex Sayang 💔';
  let startTime = '23:14';
  let messages = [];

  if (p.includes('balikan') || p.includes('mantan') || p.includes('pacar')) {
    name = 'Ex Sayang 💔';
    startTime = '23:14';
    messages = [
      { type: 'text', direction: 'incoming', time: '23:14', text: 'Kamu udah tidur belum? 🥺' },
      { type: 'text', direction: 'outgoing', time: '23:15', text: 'Belum. Ada apa malam-malam ngechat?' },
      { type: 'text', direction: 'incoming', time: '23:16', text: 'Jujur aku kangen banget sama kamu yang dulu...' },
      { type: 'voice', direction: 'incoming', time: '23:17', vnDuration: '0:18', text: '' },
      { type: 'text', direction: 'outgoing', time: '23:19', text: 'Telat mas/mba, foto profil ku berdua sama pacar baru udah keliatan kan? 😌' },
      { type: 'text', direction: 'incoming', time: '23:22', text: 'Eh maaf bgt!! Ini aku Siska temen kamu, hp cowokmu ditinggal di meja wkwk 😂' },
      { type: 'text', direction: 'outgoing', time: '23:23', text: 'HAH?! Siska?! Jangan nakut-nakutin jir!! 😭' },
      { type: 'text', direction: 'incoming', time: '23:25', text: 'Bercanda ding, ini beneran mantanmu... cuma pengen tes reaksi pacar barumu aja 😎' }
    ];
  } else if (p.includes('utang') || p.includes('hutang') || p.includes('tf') || p.includes('duit')) {
    name = 'Budi Teman 💸';
    startTime = '19:05';
    messages = [
      { type: 'text', direction: 'outgoing', time: '19:05', text: 'Bud, inget ga janji bulan lalu mau balikin sisa 300rb?' },
      { type: 'text', direction: 'incoming', time: '19:08', text: 'Waduh bro, suer lg seret banget nih belum gajian 😭' },
      { type: 'text', direction: 'outgoing', time: '19:09', text: 'Seret gimana, itu Story IG kamu baru aja upload foto sepatu Adidas baru?!' },
      { type: 'text', direction: 'incoming', time: '19:12', text: 'Eh wkwk ketauan... yaudah besok tak TF 150rb dulu ya bro 🙏' },
      { type: 'text', direction: 'outgoing', time: '19:14', text: 'Gak ada besok-besok, malam ini atau tak tagih ke rumah bapakmu!' },
      { type: 'text', direction: 'incoming', time: '19:16', text: 'Ampun bro 😭 Yaudah ini tak TF lunas 300rb + 50rb bonus bensin!' },
      { type: 'text', direction: 'outgoing', time: '19:18', text: 'Nah gitu dong dari tadi wkwk, mantap bestie! 🤝' }
    ];
  } else if (p.includes('olshop') || p.includes('cod') || p.includes('paket') || p.includes('baju')) {
    name = 'Seller Olshop 🛍️';
    startTime = '14:20';
    messages = [
      { type: 'text', direction: 'incoming', time: '14:20', text: 'Kak paket COD pesanan baju udah sampai ya oleh kurir' },
      { type: 'text', direction: 'outgoing', time: '14:22', text: 'Min kok bajunya pas dicoba sempit banget?! Saya minta L dikirim S!' },
      { type: 'text', direction: 'incoming', time: '14:25', text: 'Coba foto resi dan tag ukuran di kerahnya kak?' },
      { type: 'text', direction: 'outgoing', time: '14:27', text: 'Eh maaf min... ternyata baju adek saya yang kepakai 🙈' },
      { type: 'text', direction: 'incoming', time: '14:28', text: 'Gapapa kak, untung belum terlanjur emosi di ulasan wkwk 😂' },
      { type: 'text', direction: 'outgoing', time: '14:30', text: 'Hehe bintang 5 meluncur min! Bajunya bagus bgt pas udah dicoba yang asli 🌟' }
    ];
  } else if (p.includes('horor') || p.includes('pintu') || p.includes('malam') || p.includes('suara')) {
    name = 'Tetangga Kamar 👻';
    startTime = '02:05';
    messages = [
      { type: 'text', direction: 'incoming', time: '02:05', text: 'Bro, kamu lagi denger suara orang ketuk pintu kamar ga?' },
      { type: 'text', direction: 'outgoing', time: '02:07', text: 'Gak ada tuh bro. Perasaan kamu aja kali.' },
      { type: 'text', direction: 'incoming', time: '02:08', text: 'Suaranya dari depan pintu kamar kamu bro... coba intip lewat ventilasi!' },
      { type: 'text', direction: 'outgoing', time: '02:11', text: 'Jangan nakut-nakutin jir!! Aku sendirian di rumah! 😭' },
      { type: 'text', direction: 'incoming', time: '02:13', text: 'Coba dengerin bentar Voice Note dari depan pintumu...' },
      { type: 'voice', direction: 'incoming', time: '02:14', vnDuration: '0:12', text: '' },
      { type: 'text', direction: 'outgoing', time: '02:16', text: 'ANJIRRR APANISAN SUARA SIAPA ITU 😭😭😭' },
      { type: 'text', direction: 'incoming', time: '02:18', text: 'Wkwk kaget kan! Ini aku Agus di teras depan bawa martabak manis! Buka pintu cepet! 🤣' },
      { type: 'text', direction: 'outgoing', time: '02:19', text: 'SIALAN KAMU GUS!! Hampir pingsan aku wkwk 🤬' }
    ];
  } else {
    name = 'Kolega / Teman 💬';
    startTime = '16:10';
    messages = [
      { type: 'text', direction: 'incoming', time: '16:10', text: `Bro, terkait "${prompt.slice(0, 30)}..." gmn kelanjutannya?` },
      { type: 'text', direction: 'outgoing', time: '16:12', text: 'Bentar bro, ini lg tak proses siapin datanya 🚀' },
      { type: 'text', direction: 'incoming', time: '16:15', text: 'Siap mantap, nanti infoin ya kalau udah kelar!' },
      { type: 'text', direction: 'outgoing', time: '16:18', text: 'Aman sentosa, ini udah beres 100% tinggal kirim!' },
      { type: 'text', direction: 'incoming', time: '16:21', text: 'Wih gercep banget! Makasih banyak ya bro 🙏' }
    ];
  }

  return { name, time: startTime, messages, chatType: 'personal' };
}

