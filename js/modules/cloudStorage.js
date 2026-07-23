/**
 * js/modules/cloudStorage.js — Cloudflare Worker & Team Preset Sync Engine
 */

'use strict';

const TPL_KEY = 'wa_saved_templates';
const WORKER_URL = window.WORKER_URL || 'https://wa-templates-worker.aldoramadhan16.workers.dev/templates';
let TEAM_PASSCODE = localStorage.getItem('wa_team_passcode') || window.TEAM_PASSCODE || '';
let _cloudTemplates = {};
let _isRestoringState = false;

/* ============================================================
   1. LOCAL STORAGE PRESETS
   ============================================================ */

function getSavedTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TPL_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function loadDraftFromLocalStorage() {
  try {
    const raw = localStorage.getItem('wa_autosave_draft');
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        applyProjectPayload(data);
        return true;
      }
    }
  } catch (e) {
    console.error('Failed to load auto-saved draft:', e);
  }

  // Fallback to default starter project template so chat is never empty on launch
  applyProjectPayload({
    name: 'Sayang 💙',
    pfp: null,
    messages: [
      { id: newId(), type: 'text', direction: 'outgoing', text: 'Kamu lagi di mana beb?' },
      { id: newId(), type: 'text', direction: 'incoming', text: 'Lagi di rumah kok beb, baru selesai mandi.' },
      { id: newId(), type: 'text', direction: 'outgoing', text: 'Oke deh, nanti malam kita jalan yuk! ❤️' }
    ],
    scale: 2,
    time: '16:12',
    phoneOs: 'ios',
    chatType: 'personal',
    groupSubtitle: 'Sinta, Budi, Anda, Agus',
    batteryLevel: 85,
    bgType: 'default',
    bgColor: '#111B21',
    bgImage: null
  });
  return true;
}

/* ============================================================
   2. CLOUD WORKER INTEGRATION & PASSCODE
   ============================================================ */

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
  const btn = document.getElementById('btn-unlock');
  if (!inp) return;

  const entered = inp.value.trim();
  btn.disabled = true;
  btn.classList.add('opacity-50');

  if (entered) {
    localStorage.setItem('wa_team_passcode', entered);
    TEAM_PASSCODE = entered;
  }

  hidePasscodeModal();
  btn.disabled = false;
  btn.classList.remove('opacity-50');

  if (entered) {
    const isValid = await verifyPasscodeWithWorker(entered);
    if (isValid) {
      await fetchCloudTemplates();
      await checkUrlParams();
      if (typeof showToast === 'function') showToast('🔓 App & Team Cloud Unlocked!');
    } else if (typeof showToast === 'function') {
      showToast('🔓 App Unlocked!');
    }
  } else if (typeof showToast === 'function') {
    showToast('🔓 App Unlocked!');
  }
}

function lockAppSession() {
  localStorage.removeItem('wa_team_passcode');
  TEAM_PASSCODE = '';
  showPasscodeModal();
  const inp = document.getElementById('inp-passcode');
  if (inp) inp.value = '';
}

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

/* ============================================================
   3. TEMPLATE SELECTOR UI RENDERER
   ============================================================ */

function renderTemplateDropdown(selectedId = 'auto') {
  const select = document.getElementById('tpl-select');
  if (!select) return;

  const localTemplates = getSavedTemplates();
  let html = `<option value="auto" ${selectedId === 'auto' ? 'selected' : ''}>Draft (Auto-saved)</option>`;

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

/* ============================================================
   4. APPLY PAYLOAD TO STATE & DOM
   ============================================================ */

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

  if (typeof updateChatTypeUI === 'function') updateChatTypeUI();
  if (typeof updatePhoneOsUI === 'function') updatePhoneOsUI();

  _msgIdCounter = state.messages.reduce((max, m) => {
    const num = parseInt((m.id || '').replace('msg_', ''), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  const inpName = document.getElementById('inp-name');
  if (inpName) inpName.value = state.name;

  const inpTime = document.getElementById('inp-time');
  if (inpTime) inpTime.value = state.time;

  const wrapPfp = document.getElementById('pfp-preview-wrap');
  const imgPfp  = document.getElementById('pfp-preview');
  const namePfp = document.getElementById('pfp-preview-name');
  if (state.pfp) {
    if (imgPfp) imgPfp.src = state.pfp;
    if (namePfp) namePfp.textContent = 'pfp.jpg';
    if (wrapPfp) wrapPfp.style.display = 'flex';
  } else {
    if (wrapPfp) wrapPfp.style.display = 'none';
  }

  state.pinnedEnabled   = !!data.pinnedEnabled;
  state.pinnedText      = data.pinnedText || '';
  state.showUnreadBadge = !!data.showUnreadBadge;
  state.unreadCount     = data.unreadCount || '99+';

  const chkPinned = document.getElementById('inp-pinned-enabled');
  if (chkPinned) chkPinned.checked = state.pinnedEnabled;
  const txtPinned = document.getElementById('inp-pinned-text');
  if (txtPinned) txtPinned.value = state.pinnedText;
  const wrapPinned = document.getElementById('wrap-pinned-inputs');
  if (wrapPinned) wrapPinned.classList.toggle('hidden', !state.pinnedEnabled);

  const chkUnread = document.getElementById('inp-unread-enabled');
  if (chkUnread) chkUnread.checked = state.showUnreadBadge;
  const cntUnread = document.getElementById('inp-unread-count');
  if (cntUnread) cntUnread.value = state.unreadCount;
  const wrapUnread = document.getElementById('wrap-unread-inputs');
  if (wrapUnread) wrapUnread.classList.toggle('hidden', !state.showUnreadBadge);

  const selBgType = document.getElementById('inp-bg-type');
  if (selBgType) selBgType.value = state.bgType;

  const inpBgCol  = document.getElementById('inp-bg-color');
  if (inpBgCol) {
    inpBgCol.value = state.bgColor;
    inpBgCol.classList.toggle('hidden', state.bgType !== 'color');
  }

  const lblBgImg  = document.getElementById('lbl-bg-image');
  if (lblBgImg) lblBgImg.classList.toggle('hidden', state.bgType !== 'image');

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

  if (typeof syncBaseFields === 'function') syncBaseFields();
  if (typeof renderDashboard === 'function') renderDashboard();

  _isRestoringState = false;
}

/* ============================================================
   5. SAVE PRESET (LOCAL & CLOUD)
   ============================================================ */

async function saveAsNewTemplate() {
  const defaultName = state.name ? state.name.trim() : 'My WA Preset';
  const tplName = prompt('Masukkan Nama Preset Baru:', defaultName);
  if (!tplName || !tplName.trim()) return;

  const trimmedName = tplName.trim();
  const payload = getProjectPayload();
  const cleanId = `${Date.now()}`;

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
    console.error('Local save error:', e);
  }

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
      console.warn('Cloud save error:', e);
    }
  }

  renderTemplateDropdown(`cloud_${cleanId}`);
  if (typeof showToast === 'function') showToast(`💾 Preset "${trimmedName}" tersimpan!`);
}

async function saveCurrentTemplate(silent = false) {
  const currentVal = document.getElementById('tpl-select')?.value;
  if (!currentVal || currentVal === 'auto') {
    await saveAsNewTemplate();
    return;
  }

  const cleanId = currentVal.replace(/^(local_|cloud_)/, '');
  const payload = getProjectPayload();
  const localTemplates = getSavedTemplates();

  let tplName = 'My WA Preset';
  if (localTemplates[cleanId]) tplName = localTemplates[cleanId].name;
  if (_cloudTemplates[cleanId]) tplName = _cloudTemplates[cleanId].name;

  if (localTemplates[cleanId]) {
    localTemplates[cleanId] = {
      id: cleanId,
      name: tplName,
      updatedAt: Date.now(),
      data: payload
    };
    localStorage.setItem(TPL_KEY, JSON.stringify(localTemplates));
  }

  if (_cloudTemplates[cleanId]) {
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
  if (!silent && typeof showToast === 'function') showToast(`💾 Preset "${tplName}" berhasil di-update!`);
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
    if (localTemplates[cleanId]) {
      delete localTemplates[cleanId];
      localStorage.setItem(TPL_KEY, JSON.stringify(localTemplates));
    }

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

/* ============================================================
   6. SHARE LINK & URL PARAM LOADER
   ============================================================ */

async function copyShareLink(targetType = 'preview') {
  const currentVal = document.getElementById('tpl-select')?.value || 'auto';
  let cloudId = null;

  const payload = getProjectPayload();

  if (currentVal.startsWith('cloud_')) {
    cloudId = currentVal;
    const cleanId = currentVal.replace('cloud_', '');
    const tplName = _cloudTemplates[cleanId]?.name || state.name || 'My WA Preset';

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

  if (_cloudTemplates[cleanId] || _cloudTemplates[`cloud_${cleanId}`]) {
    const tpl = _cloudTemplates[cleanId] || _cloudTemplates[`cloud_${cleanId}`];
    applyProjectPayload(tpl.data);
    renderTemplateDropdown(tpl.id.startsWith('cloud_') ? tpl.id : `cloud_${tpl.id}`);
    if (typeof showToast === 'function') showToast(`🌐 Loaded shared preset: "${tpl.name}"`);
    return true;
  }

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
          if (typeof showToast === 'function') showToast(`🌐 Loaded shared preset: "${tpl.name}"`);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to load shared preset from Worker:', e);
    }
  }

  return false;
}
