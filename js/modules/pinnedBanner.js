/**
 * pinnedBanner.js — WhatsApp Pinned Message Banner Feature Module
 * Handles rendering of the Pinned Message Banner under the WhatsApp header.
 */

'use strict';

/** Return HTML for WhatsApp Pinned Message Banner bar */
function renderPinnedBannerHtml(opts = {}) {
  const isEnabled = !!opts.pinnedEnabled;
  if (!isEnabled) return '';

  const text = escHtml(opts.pinnedText || '📌 Jangan lupa bayar uang kas ya guys!');
  const author = escHtml(opts.pinnedAuthor || '');

  return `
    <div id="wa-pinned-banner"
         style="width:100%; background:#1F2C34; border-bottom:1px solid rgba(255,255,255,0.07);
                padding:6px 14px; display:flex; align-items:center; justify-content:space-between;
                gap:8px; cursor:pointer; box-sizing:border-box; z-index:10; position:relative;">
      <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
        <!-- Pin Icon -->
        <div style="width:20px; height:20px; border-radius:50%; background:rgba(0,168,132,0.15);
                    display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#00A884">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </div>

        <!-- Pinned Text + Optional Author -->
        <div style="min-width:0; flex:1;">
          <div style="font-size:10px; font-weight:700; color:#00A884; letter-spacing:0.3px; text-transform:uppercase;">
            Pesan Tersemat ${author ? `• ${author}` : ''}
          </div>
          <div style="font-size:12px; color:#E9EDEF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:400;">
            ${text}
          </div>
        </div>
      </div>

      <!-- Arrow right -->
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8696A0" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  `;
}

/** Inject/Update Pinned Banner DOM in WhatsApp Canvas */
function updatePinnedBannerUI(stateObj) {
  const container = document.getElementById('wa-header');
  if (!container || !container.parentNode) return;

  let bannerEl = document.getElementById('wa-pinned-banner');
  const isEnabled = !!stateObj.pinnedEnabled;

  if (isEnabled) {
    const html = renderPinnedBannerHtml(stateObj);
    if (bannerEl) {
      bannerEl.outerHTML = html;
    } else {
      container.insertAdjacentHTML('afterend', html);
    }
  } else if (bannerEl) {
    bannerEl.remove();
  }
}
