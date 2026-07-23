/**
 * js/modules/previewEngine.js — Animation & Camera Zoom Engine
 */

'use strict';

let _previewTimer = null;
const notificationSound = new Audio('assets/notification.mp3');
const outSound = new Audio('assets/sfx-out.mp3');

/* ============================================================
   1. CAMERA AUTO-ZOOM ENGINE (Editor Canvas)
   ============================================================ */

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

  void msgEl.offsetHeight; // force layout reflow

  const containerRect = messagesContainer.getBoundingClientRect();
  const msgRect       = msgEl.getBoundingClientRect();
  const bubbleCenterY = (msgRect.top - containerRect.top) + (msgRect.height / 2);
  const originX       = isOut ? '85%' : '15%';

  const scaleInput    = parseFloat(document.getElementById('inp-zoom-scale')?.value || '1.35');
  const zoomIntensity = parseFloat(customScaleOverride || scaleInput || '1.35');
  const zoomSpeed     = parseFloat(document.getElementById('inp-zoom-speed')?.value || '0.45');

  messagesContainer.style.transition = `transform ${zoomSpeed}s cubic-bezier(0.25, 1, 0.5, 1), transform-origin ${zoomSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`;
  messagesContainer.style.transformOrigin = `${originX} ${Math.round(bubbleCenterY)}px`;
  messagesContainer.style.transform = `scale(${zoomIntensity})`;
}

/* ============================================================
   2. ANIMATION PLAYBACK ENGINE (Editor)
   ============================================================ */

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
        if (msgEl) triggerAutoZoomEditor(msgEl, targetMsg.direction === 'outgoing', targetMsg.customScale);
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
   3. CLEAN STANDALONE PREVIEW LAUNCHER
   ============================================================ */

function openCleanPreview() {
  if (typeof syncBaseFields === 'function') syncBaseFields();

  const missing = [];
  if (!state.name.trim())        missing.push('Contact Name');
  if (!state.pfp)                missing.push('Profile Picture');
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
