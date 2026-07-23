/**
 * typingIndicator.js — WhatsApp Typing Indicator Feature Module
 * Handles Real-time "...sedang mengetik" status animation in WhatsApp header.
 */

'use strict';

// Inject CSS styles for animated typing dots once
if (typeof document !== 'undefined' && !document.getElementById('wa-typing-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'wa-typing-styles';
  styleEl.innerHTML = `
    @keyframes waTypingDot {
      0%, 80%, 100% { opacity: 0.25; transform: translateY(0px); }
      40% { opacity: 1; transform: translateY(-2.5px); }
    }
    .wa-typing-dot {
      display: inline-block;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: #00A884;
      margin: 0 1px;
      animation: waTypingDot 1.2s infinite ease-in-out;
    }
    .wa-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .wa-typing-dot:nth-child(3) { animation-delay: 0.4s; }
  `;
  document.head.appendChild(styleEl);
}

/** Show "...ketik" animated status in WhatsApp header */
function showTypingIndicatorHeader(customLabel = 'mengetik') {
  const statusEl = document.getElementById('wa-status-text');
  if (!statusEl) return;

  statusEl.style.color = '#00A884';
  statusEl.innerHTML = `
    <span>${escHtml(customLabel)}</span>
    <span style="display:inline-flex; align-items:center; margin-left:2px;">
      <span class="wa-typing-dot"></span>
      <span class="wa-typing-dot"></span>
      <span class="wa-typing-dot"></span>
    </span>
  `;
}

/** Revert header status back to online or group members */
function restoreStatusHeader(stateObj) {
  const statusEl = document.getElementById('wa-status-text');
  if (!statusEl) return;

  const isGroup = stateObj?.chatType === 'group';
  statusEl.style.color = '#00A884';
  statusEl.textContent = isGroup
    ? (stateObj?.groupSubtitle || 'Sinta, Budi, Anda, Agus')
    : 'online';
}
