/**
 * js/modules/messageController.js — Message & UI State Controller
 */

'use strict';

/* ============================================================
   1. MESSAGE CRUD OPERATIONS
   ============================================================ */

function addMessage() {
  addMsg('text', 'outgoing');
}

function addMsg(type = 'text', direction = 'outgoing') {
  const msg = {
    id: newId(),
    type,
    direction,
    time: state.time || '16:12',
    enableZoom: false,
    customScale: '1.20',
    showAdvSettings: false,
  };

  if (type === 'text') msg.text = '';
  if (type === 'image') { msg.dataUrl = null; msg.isGif = false; msg.caption = ''; }
  if (type === 'qr') msg.dataUrl = null;
  if (type === 'voice') { msg.duration = '0:15'; msg.isPlaying = false; }
  if (type === 'transfer') { msg.nominal = 'Rp 500.000'; msg.senderName = 'SINTA N'; msg.bankName = 'BCA'; }
  if (type === 'location') { msg.locName = 'Monumen Nasional'; msg.address = 'Gambir, Jakarta Pusat'; }

  state.messages.push(msg);
  renderDashboard();

  setTimeout(() => {
    const builder = document.getElementById('msg-builder');
    if (builder) builder.scrollTop = builder.scrollHeight;
  }, 50);
}

function autoSequenceMsgTimes(gapMinutes = 1) {
  if (!state.messages || state.messages.length === 0) {
    if (typeof showToast === 'function') showToast('⚠️ Tambahkan pesan terlebih dahulu!');
    return;
  }
  let startTime = state.time || '16:12';
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

  if (typeof renderCanvas === 'function') renderCanvas();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
  if (typeof showToast === 'function') showToast(`⚡ Auto Jeda +${gapMinutes} Mnt Berhasil Diterapkan!`);
}

function removeMsg(id) {
  state.messages = state.messages.filter(m => m.id !== id);
  renderDashboard();
}

function moveMsg(idx, dir) {
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= state.messages.length) return;
  const temp = state.messages[idx];
  state.messages[idx] = state.messages[targetIdx];
  state.messages[targetIdx] = temp;
  renderDashboard();
}

function setMsgDir(id, direction) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.direction = direction;
  renderDashboard();
}

function setMsgType(id, type) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.type = type;
  renderDashboard();
}

function setMsgText(id, text) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.text = text;
  renderCanvas();
  triggerAutoSave();
}

function setMsgTime(id, time) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.time = time;
  renderCanvas();
  triggerAutoSave();
}

function setMsgSender(id, senderName) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.senderName = senderName;
  renderCanvas();
  triggerAutoSave();
}

function setMsgSenderColor(id, color) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.senderColor = color;
  renderCanvas();
  triggerAutoSave();
}

/* ============================================================
   2. SELECTIVE ZOOM & CAMERA TIMING CONTROLLERS
   ============================================================ */

function updateZoomScaleValue(val) {
  const formatted = parseFloat(val).toFixed(2) + '×';
  const label = document.getElementById('zoom-scale-val');
  if (label) label.textContent = formatted;
  
  const activeZoomedMsg = state.messages.find(m => m.enableZoom);
  if (activeZoomedMsg && typeof triggerAutoZoomEditor === 'function') {
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

function setMsgCustomZoomScale(id, scaleVal) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.customScale = scaleVal;
  
  const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${id}"]`);
  if (msgEl && typeof triggerAutoZoomEditor === 'function') {
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
    
    const chkAuto = document.getElementById('inp-auto-zoom');
    if (chkAuto && !chkAuto.checked) {
      chkAuto.checked = true;
    }
  }

  renderDashboard();

  setTimeout(() => {
    const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${id}"]`);
    if (msg.enableZoom && msgEl && typeof triggerAutoZoomEditor === 'function') {
      triggerAutoZoomEditor(msgEl, msg.direction === 'outgoing', msg.customScale);
    } else if (typeof resetZoomEditor === 'function') {
      resetZoomEditor();
    }
  }, 50);

  triggerAutoSave();
}

function toggleMsgZoom(id) {
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;
  msg.enableZoom = !msg.enableZoom;

  if (msg.enableZoom) {
    const chkAuto = document.getElementById('inp-auto-zoom');
    if (chkAuto && !chkAuto.checked) {
      chkAuto.checked = true;
      document.getElementById('wrap-zoom-scale')?.classList.remove('hidden');
    }
  }

  renderDashboard();

  setTimeout(() => {
    const msgEl = document.querySelector(`#wa-messages > div[data-msg-id="${id}"]`);
    if (msg.enableZoom && msgEl && typeof triggerAutoZoomEditor === 'function') {
      triggerAutoZoomEditor(msgEl, msg.direction === 'outgoing', msg.customScale);
    } else if (typeof resetZoomEditor === 'function') {
      resetZoomEditor();
    }
  }, 50);

  triggerAutoSave();
}

function setPinnedEnabled(val) {
  state.pinnedEnabled = !!val;
  const wrap = document.getElementById('wrap-pinned-inputs');
  if (wrap) wrap.classList.toggle('hidden', !val);
  if (typeof updatePinnedBannerUI === 'function') {
    updatePinnedBannerUI(state);
  }
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
}

function setPinnedText(text) {
  state.pinnedText = text;
  if (typeof updatePinnedBannerUI === 'function') {
    updatePinnedBannerUI(state);
  }
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
}

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
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
}

function setUnreadCount(count) {
  state.unreadCount = count;
  const inp = document.getElementById('inp-unread-count');
  if (inp && inp.value !== count) inp.value = count;

  if (typeof updateUnreadBadgeUI === 'function') {
    updateUnreadBadgeUI(state);
  }
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
}
