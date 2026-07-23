/**
 * js/core/state.js — Centralized State & Project Storage Core
 */

'use strict';

/* ============================================================
   1. GLOBAL STATE OBJECT
   ============================================================ */
const state = {
  name:          '',
  pfp:           null,       // Data URL
  messages:      [],         // Array of message objects
  scale:         2,
  time:          '16:12',    // Custom time
  bgType:        'default',  // 'default', 'color', 'image'
  bgColor:       '#111B21',
  bgImage:       null,
  phoneOs:       'ios',      // 'ios' or 'android'
  chatType:      'personal', // 'personal' or 'group'
  groupSubtitle: 'Sinta, Budi, Anda, Agus',
  batteryLevel:  85,        // 1 - 100
};

// Auto-increment ID counter for messages
let _msgIdCounter = 0;
function newId() { return `msg_${++_msgIdCounter}`; }

/* ============================================================
   2. CORE UTILITIES
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
  if (typeof index === 'number' && state.messages[index] && state.messages[index].time) {
    return state.messages[index].time;
  }
  return state.time || '16:12';
}

/** Sleep helper for sequenced actions */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Debounce */
function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** File to Data URL reader */
function fileToDataUrl(file, maxDim = 1000) {
  console.log('[fileToDataUrl] Processing file:', file?.name, file?.size, file?.type);
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target.result;
      if (!maxDim || file.type === 'image/gif') {
        resolve(result);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   3. AUTO-SAVE & PAYLOAD PERSISTENCE
   ============================================================ */

let _autoSaveTimer = null;
function triggerAutoSave() {
  if (typeof _isRestoringState !== 'undefined' && _isRestoringState) return;
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
    autoZoom,
    zoomScale,
    zoomSpeed,
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
