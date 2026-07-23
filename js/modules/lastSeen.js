/**
 * lastSeen.js — WhatsApp Custom Last Seen ("Terakhir dilihat") Feature Module
 * Handles rendering of custom Last Seen timestamps in the WhatsApp Header.
 */

'use strict';

/** Return formatted header status subtitle string & color */
function getHeaderStatusInfo(stateObj = {}) {
  const isGroup = stateObj.chatType === 'group';
  if (isGroup) {
    return {
      text: stateObj.groupSubtitle || 'Sinta, Budi, Anda, Agus',
      color: '#00A884'
    };
  }

  const isCustomLastSeen = stateObj.lastSeenMode === 'custom';
  if (isCustomLastSeen) {
    const text = stateObj.lastSeenText || 'terakhir dilihat hari ini pukul 03:15';
    return {
      text: text,
      color: '#8696A0' // WA muted grey for last seen
    };
  }

  return {
    text: 'online',
    color: '#00A884' // WA green for online
  };
}

/** Update the WhatsApp Header Status Subtitle in DOM */
function updateHeaderStatusUI(stateObj) {
  const statusEl = document.getElementById('wa-status-text');
  if (!statusEl) return;

  const info = getHeaderStatusInfo(stateObj);
  statusEl.style.color = info.color;
  statusEl.textContent = info.text;
}
