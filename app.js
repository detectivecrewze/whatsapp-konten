/**
 * app.js — Main Application Controller & Bootstrapper
 * For You, Always — Clean Modular Architecture
 */

'use strict';

/* ============================================================
   1. LIVE SYNC & FIELD BINDINGS
   ============================================================ */

function syncBaseFields() {
  const nameInput = document.getElementById('inp-name');
  if (nameInput) state.name = nameInput.value;

  const timeInput = document.getElementById('inp-time');
  if (timeInput) state.time = timeInput.value;

  const bgTypeSel = document.getElementById('inp-bg-type');
  if (bgTypeSel) state.bgType = bgTypeSel.value;

  const bgColorInp = document.getElementById('inp-bg-color');
  if (bgColorInp) state.bgColor = bgColorInp.value;

  // Name & Time Canvas Elements
  const nameEl = document.getElementById('wa-name');
  if (nameEl) nameEl.textContent = state.name || 'Contact Name';

  // Live update phone OS status bar time, pinned banner, and unread badge
  if (typeof updatePhoneOsUI === 'function') updatePhoneOsUI();
  if (typeof updatePinnedBannerUI === 'function') updatePinnedBannerUI(state);
  if (typeof updateUnreadBadgeUI === 'function') updateUnreadBadgeUI(state);

  // PFP Preview
  const pfpEl = document.getElementById('wa-pfp');
  const pfpFallback = document.getElementById('wa-pfp-fallback');
  if (pfpEl) {
    if (state.pfp) {
      pfpEl.src = state.pfp;
      pfpEl.style.display = 'block';
      if (pfpFallback) pfpFallback.style.display = 'none';
    } else {
      pfpEl.style.display = 'none';
      if (pfpFallback) pfpFallback.style.display = 'flex';
    }
  }

  // Background style
  const chatTarget = document.getElementById('wa-chat-area');
  if (chatTarget) {
    if (state.bgType === 'color') {
      chatTarget.style.backgroundColor = state.bgColor || '#111B21';
      chatTarget.style.backgroundImage = 'none';
    } else if (state.bgType === 'default') {
      chatTarget.style.backgroundColor = '#111B21';
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
  
  if (typeof renderCanvas === 'function') renderCanvas();
}

/* ============================================================
   2. PFP & BACKGROUND HANDLERS
   ============================================================ */

async function handlePfpUpload(input) {
  if (!input.files?.[0]) return;
  const file = input.files[0];

  const label = document.getElementById('pfp-label');
  if (label) label.textContent = file.name.length > 28 ? file.name.slice(0, 25) + '…' : file.name;

  const dataUrl = await fileToDataUrl(file);
  state.pfp = dataUrl;

  const wrap    = document.getElementById('pfp-preview-wrap');
  const img     = document.getElementById('pfp-preview');
  const nameEl  = document.getElementById('pfp-preview-name');
  if (img) img.src = dataUrl;
  if (nameEl) nameEl.textContent = file.name;
  if (wrap) wrap.style.display = 'flex';

  const cPfp = document.getElementById('wa-pfp');
  const fallback = document.getElementById('wa-pfp-fallback');
  if (cPfp) {
    cPfp.src = dataUrl;
    cPfp.style.display = 'block';
    if (fallback) fallback.style.display = 'none';
  }

  triggerAutoSave();
}

function setPhoneOs(os) {
  state.phoneOs = os || 'ios';
  updatePhoneOsUI();
  triggerAutoSave();
}

function updatePhoneOsUI() {
  const isIos = state.phoneOs !== 'android';

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

  const statusBar = document.getElementById('wa-status-bar');
  if (statusBar && typeof renderCustomStatusBarHtml === 'function') {
    statusBar.style.padding = isIos ? '10px 20px 6px' : '8px 16px 6px';
    statusBar.innerHTML = renderCustomStatusBarHtml({
      phoneOs: state.phoneOs,
      clockTime: state.time || '16:12',
      batteryLevel: state.batteryLevel || 85
    });
  }
}

function setChatType(type) {
  state.chatType = type || 'personal';
  updateChatTypeUI();
  if (typeof renderDashboard === 'function') renderDashboard();
  triggerAutoSave();
}

function updateChatTypeUI() {
  const isGroup = state.chatType === 'group';

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

  const lblName = document.getElementById('lbl-name');
  if (lblName) lblName.textContent = isGroup ? 'Nama Group' : 'Contact Name';

  const wrapSub = document.getElementById('wrap-group-subtitle');
  if (wrapSub) wrapSub.classList.toggle('hidden', !isGroup);

  const statusEl = document.getElementById('wa-status-text');
  if (statusEl) {
    statusEl.textContent = isGroup ? (state.groupSubtitle || 'Sinta, Budi, Anda, Agus') : 'online';
  }
}

function setGroupSubtitle(text) {
  state.groupSubtitle = text;
  const statusEl = document.getElementById('wa-status-text');
  if (statusEl && state.chatType === 'group') {
    statusEl.textContent = text || 'Sinta, Budi, Anda, Agus';
  }
  triggerAutoSave();
}

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

/* ============================================================
   3. FRAME & DISPLAY CONTROLLER
   ============================================================ */

let currentFrame = -1;

function applyFrame(frameIndex) {
  currentFrame = frameIndex;

  const allMessages = document.querySelectorAll('#wa-messages > div');
  allMessages.forEach((el) => {
    const idx = parseInt(el.getAttribute('data-frame-index') ?? '9999', 10);
    el.style.display = (idx < frameIndex) ? 'flex' : 'none';
  });

  document.querySelectorAll('.frame-btn').forEach(btn => {
    const fi = parseInt(btn.getAttribute('data-frame'), 10);
    const isActive = fi === frameIndex;
    btn.style.borderColor = isActive ? '#00A884' : '#2A3942';
    btn.style.color       = isActive ? '#00A884' : '#8696A0';
    btn.style.background  = isActive ? 'rgba(0,168,132,0.1)' : '';
  });

  if (frameIndex > 0 && state.messages[frameIndex - 1]?.type === 'voice' && typeof triggerVnAnimationOnFrame === 'function') {
    triggerVnAnimationOnFrame(state.messages[frameIndex - 1].id);
  }
}

function previewFrame(frameIndex) {
  syncBaseFields();
  applyFrame(frameIndex);
}

/* ============================================================
   4. VIRAL SCRIPT PRESETS & BOOTSTRAP INITIALIZATION
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
      scale: 2, time: '15:42', bgType: 'default', bgColor: '#111B21', bgImage: null,
      holdMs: 2200, replyDelay: 1200, useTyping: true, useSoundIn: true, useSoundOut: true, autoZoom: true, zoomScale: '1.20', zoomSpeed: '0.45'
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
      scale: 2, time: '11:15', bgType: 'default', bgColor: '#111B21', bgImage: null,
      holdMs: 2500, replyDelay: 1000, useTyping: true, useSoundIn: true, useSoundOut: true, autoZoom: true, zoomScale: '1.20', zoomSpeed: '0.45'
    }
  }
};

function loadScriptPreset(scriptKey) {
  const tpl = _scriptPresets[scriptKey];
  if (!tpl) return;

  if (confirm(`Muat naskah "${tpl.name}"? (Pesan saat ini akan digantikan)`)) {
    const payload = JSON.parse(JSON.stringify(tpl.data));
    payload.messages = (payload.messages || []).map(m => ({ ...m, id: newId() }));
    if (typeof applyProjectPayload === 'function') applyProjectPayload(payload);
    showToast(`✨ Naskah "${tpl.name}" berhasil dimuat! Tinggal Play Preview.`);
  }
}

function initBaseInputListeners() {
  const inpName = document.getElementById('inp-name');
  if (inpName) {
    inpName.addEventListener('input', () => { syncBaseFields(); triggerAutoSave(); });
  }

  const inpTime = document.getElementById('inp-time');
  if (inpTime) {
    inpTime.addEventListener('input', () => { syncBaseFields(); triggerAutoSave(); });
    inpTime.addEventListener('change', () => { syncBaseFields(); triggerAutoSave(); });
  }

  const selBgType = document.getElementById('inp-bg-type');
  const inpBgCol  = document.getElementById('inp-bg-color');
  const lblBgImg  = document.getElementById('lbl-bg-image');
  const inpBgImg  = document.getElementById('inp-bg-image');

  if (selBgType) {
    selBgType.addEventListener('change', (e) => {
      state.bgType = e.target.value;
      if (inpBgCol) inpBgCol.classList.toggle('hidden', state.bgType !== 'color');
      if (lblBgImg) lblBgImg.classList.toggle('hidden', state.bgType !== 'image');
      syncBaseFields();
      triggerAutoSave();
    });
  }

  if (inpBgCol) {
    inpBgCol.addEventListener('input', (e) => {
      state.bgColor = e.target.value;
      syncBaseFields();
      triggerAutoSave();
    });
    inpBgCol.addEventListener('change', (e) => {
      state.bgColor = e.target.value;
      syncBaseFields();
      triggerAutoSave();
    });
  }

  if (inpBgImg) {
    inpBgImg.addEventListener('change', async (e) => {
      if (e.target.files?.[0]) {
        const file = e.target.files[0];
        const nameEl = document.getElementById('bg-image-name');
        if (nameEl) nameEl.textContent = file.name;
        state.bgImage = await fileToDataUrl(file);
        syncBaseFields();
        triggerAutoSave();
      }
    });
  }
}

// DOM Init Bootstrap
window.addEventListener('DOMContentLoaded', async () => {
  initBaseInputListeners();
  if (typeof renderTemplateDropdown === 'function') renderTemplateDropdown('auto');

  const savedPasscode = localStorage.getItem('wa_team_passcode');
  if (savedPasscode) {
    if (typeof hidePasscodeModal === 'function') hidePasscodeModal();
    if (typeof verifyPasscodeWithWorker === 'function') {
      verifyPasscodeWithWorker(savedPasscode).then(valid => {
        if (valid && typeof fetchCloudTemplates === 'function') fetchCloudTemplates();
      });
    }
  } else {
    if (typeof hidePasscodeModal === 'function') hidePasscodeModal();
  }

  const loaded = typeof loadDraftFromLocalStorage === 'function' ? loadDraftFromLocalStorage() : false;
  if (!loaded && typeof renderDashboard === 'function') renderDashboard();
  syncBaseFields();
});
