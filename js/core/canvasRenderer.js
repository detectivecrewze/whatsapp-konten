/**
 * js/core/canvasRenderer.js — Editor Canvas Rendering Engine
 */

'use strict';

/* ============================================================
   1. SVG SNIPPETS
   ============================================================ */

function svgReadTicks() {
  return `<svg width="16" height="11" viewBox="0 0 16 11" fill="none" style="flex-shrink:0;">
    <path d="M11.01 1.8L4.62 8.19L2.3 5.87L1.24 6.93L4.62 10.31L12.07 2.86L11.01 1.8Z" fill="#53BDEB"/>
    <path d="M14.77 1.8L8.38 8.19L7.15 6.96L6.09 8.02L8.38 10.31L15.83 2.86L14.77 1.8Z" fill="#53BDEB"/>
  </svg>`;
}

function renderGroupSenderBadge(msg) {
  const name = escHtml(msg.senderName || 'Anggota Group');
  const color = msg.senderColor || '#e542a3';
  return `<div style="font-size:12px; font-weight:600; color:${color}; margin-bottom:3px; line-height:1.2;">${name}</div>`;
}

/* ============================================================
   2. CANVAS RENDERER
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
    const groupSenderBadge = (state.chatType === 'group' && !isOut) ? renderGroupSenderBadge(msg) : '';

    bubbleHtml = `
      <div style="background:${bg}; border-radius:${br}; max-width:270px;
                  padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        ${groupSenderBadge}
        <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                  word-break:break-word; white-space:pre-wrap;">${escHtml(msg.text || '').replace(/\n/g, '<br>')}</p>
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
