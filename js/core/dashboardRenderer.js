/**
 * js/core/dashboardRenderer.js — Sidebar & Control Dashboard Rendering Engine
 */

'use strict';

/* ============================================================
   1. SECTION ACCORDION TOGGLE
   ============================================================ */

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
   2. DASHBOARD MESSAGE BUILDER
   ============================================================ */

function renderDashboard() {
  const builder = document.getElementById('msg-builder');
  const hint    = document.getElementById('msg-empty-hint');

  if (!builder) return;

  if (!state.messages || state.messages.length === 0) {
    builder.innerHTML = '';
    if (hint) hint.style.display = 'block';
  } else {
    if (hint) hint.style.display = 'none';
    try {
      builder.innerHTML = state.messages.map((msg, idx) => dashboardItemHtml(msg, idx)).join('');
    } catch (e) {
      console.error('Failed to render dashboard items:', e);
    }
  }

  updateFrameButtons();
  if (typeof renderCanvas === 'function') renderCanvas();
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
}

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

  const outActiveCls  = isOut  ? 'active-dir' : '';
  const inActiveCls   = !isOut ? 'active-dir' : '';

  const textHide        = isText        ? '' : 'hidden';
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

  const qrOption = msg.direction === 'outgoing'
    ? `<option value="qr" ${isQr ? 'selected' : ''}>QR Code (Gift)</option>`
    : '';

  const hasThumbnail = (isImg || isQr) && msg.dataUrl;
  const thumbnailHtml = hasThumbnail
    ? `<img src="${msg.dataUrl}" class="mt-2 max-h-16 rounded-lg object-contain border border-gray-700 block" />`
    : '';

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
        <button onclick="moveMsg('${idx}', -1)" ${isFirst ? 'disabled' : ''}
                title="Pindah ke atas"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-30 text-xs font-bold">↑</button>
        <button onclick="moveMsg('${idx}', 1)" ${isLast ? 'disabled' : ''}
                title="Pindah ke bawah"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-30 text-xs font-bold">↓</button>
        <button onclick="removeMsg('${msg.id}')"
                title="Hapus pesan"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition text-xs font-bold ml-0.5">✕</button>
      </div>
    </div>

    ${msg.showAdvSettings ? `
    <div class="mb-3 p-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl space-y-2 text-xs">
      <div class="flex items-center justify-between font-bold text-gray-300 border-b border-gray-800 pb-1 text-[11px]">
        <span>⚙️ OPSI KHUSUS PESAN INI</span>
        <button onclick="toggleMsgAdvSettings('${msg.id}')" class="text-gray-400 hover:text-white">✕ Close</button>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-0.5">
        <div class="flex items-center gap-1.5">
          <span class="text-gray-400 font-medium">🕒 Jam Custom:</span>
          <input type="text" placeholder="${state.time || '16:12'}" value="${escHtml(msg.time || '')}"
                 oninput="setMsgTime('${msg.id}', this.value)"
                 class="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none text-center font-mono font-medium" />
        </div>

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
    ${(state.chatType === 'group' && !isOut) ? `
    <div class="p-2 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1.5 text-xs">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-emerald-400">👤 Nama Pengirim Anggota Group:</span>
      </div>
      <div class="flex items-center gap-2">
        <input type="text" placeholder="e.g. Budi / Sinta / Agus" value="${escHtml(msg.senderName || '')}"
               oninput="setMsgSenderName('${msg.id}', this.value)"
               class="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        <input type="color" value="${msg.senderColor || '#e542a3'}"
               oninput="setMsgSenderColor('${msg.id}', this.value)"
               title="Pilih Warna Nama"
               class="w-7 h-7 bg-gray-800 border border-gray-700 rounded cursor-pointer p-0.5 flex-shrink-0" />
      </div>
      <div class="flex items-center gap-1.5 pt-0.5">
        <span class="text-[10px] text-gray-400">Preset Warna:</span>
        <button type="button" onclick="setMsgSenderColor('${msg.id}', '#e542a3')" class="w-4 h-4 rounded-full bg-[#e542a3] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${msg.id}', '#53bdeb')" class="w-4 h-4 rounded-full bg-[#53bdeb] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${msg.id}', '#e5a638')" class="w-4 h-4 rounded-full bg-[#e5a638] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${msg.id}', '#2cb742')" class="w-4 h-4 rounded-full bg-[#2cb742] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${msg.id}', '#9d53eb')" class="w-4 h-4 rounded-full bg-[#9d53eb] border border-white/20 hover:scale-110 transition"></button>
      </div>
    </div>
    ` : ''}

    <div class="${textHide} space-y-2">
      <textarea rows="2"
                placeholder="Tulis pesan teks…"
                oninput="setMsgText('${msg.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${escHtml(msg.text ?? '')}</textarea>
      
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

    <div class="${imgHide} space-y-2">
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
      
      <input type="text" placeholder="Or paste direct GIF link (.gif)..."
             value="${msg.gifUrl || ''}"
             oninput="setMsgGifUrl('${msg.id}', this.value)"
             class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5
                    text-base md:text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      
      <textarea rows="1" placeholder="Caption (optional)..."
                oninput="setMsgCaption('${msg.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${escHtml(msg.caption ?? '')}</textarea>

      ${thumbnailHtml}
    </div>

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

    <div class="${voiceHide}">
      ${typeof renderVoiceNoteControlsHtml === 'function' ? renderVoiceNoteControlsHtml(msg) : ''}
    </div>

    <div class="${transferHide}">
      ${typeof renderTransferCardControlsHtml === 'function' ? renderTransferCardControlsHtml(msg) : ''}
    </div>

    <div class="${deletedHide}">
      ${typeof renderDeletedMessageControlsHtml === 'function' ? renderDeletedMessageControlsHtml(msg) : ''}
    </div>

    <div class="${locationHide}">
      ${typeof renderLocationCardControlsHtml === 'function' ? renderLocationCardControlsHtml(msg) : ''}
    </div>

    <div class="${viewOnceHide}">
      ${typeof renderViewOnceControlsHtml === 'function' ? renderViewOnceControlsHtml(msg) : ''}
    </div>

    <div class="${documentHide}">
      ${typeof renderDocumentCardControlsHtml === 'function' ? renderDocumentCardControlsHtml(msg) : ''}
    </div>

    <div class="${callHide}">
      ${typeof renderCallCardControlsHtml === 'function' ? renderCallCardControlsHtml(msg) : ''}
    </div>

    <div class="${statusReplyHide}">
      ${typeof renderStatusReplyControlsHtml === 'function' ? renderStatusReplyControlsHtml(msg) : ''}
    </div>

    <div class="${productHide}">
      ${typeof renderProductCardControlsHtml === 'function' ? renderProductCardControlsHtml(msg) : ''}
    </div>

    <div class="${contactHide}">
      ${typeof renderContactCardControlsHtml === 'function' ? renderContactCardControlsHtml(msg) : ''}
    </div>

    ${state.chatType === 'group' && !isOut && typeof renderGroupSenderInputHtml === 'function' ? renderGroupSenderInputHtml(msg) : ''}

    <p class="text-xs text-gray-600 pt-1">Frame ${idx + 2} — ${msg.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} ${isText ? 'Text' : isVoice ? 'Voice Note' : isTransfer ? 'Bukti Transfer' : isImg ? 'Image/GIF' : 'QR Code'}</p>
  </div>
  `;
}

/* ============================================================
   3. FRAME STRIP BUTTONS
   ============================================================ */

function updateFrameButtons() {
  const container = document.getElementById('frame-buttons');
  if (!container) return;

  const total = state.messages.length + 1;

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
