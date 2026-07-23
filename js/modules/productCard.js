/**
 * productCard.js — WhatsApp Product Catalog Card Feature Module
 * Handles rendering of WhatsApp Olshop Product Catalog bubbles.
 */

'use strict';

/** Return HTML for WhatsApp Product Catalog Card bubble */
function renderProductCardBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const title = msg.productTitle ? escHtmlFn(msg.productTitle) : 'Sepatu Sneakers Vintage';
  const price = msg.productPrice ? escHtmlFn(msg.productPrice) : 'Rp 299.000';
  const desc  = msg.productDesc ? escHtmlFn(msg.productDesc) : 'Ukuran 40-44 • Ready Stock';
  const imgUrl = msg.productDataUrl || null;

  return `
    <div style="background:${bg}; border-radius:${br}; width:230px; overflow:hidden;
                box-shadow:0 1px 3px rgba(0,0,0,0.35); text-align:left;">
      ${groupBadgeHtml}

      <!-- Product Image -->
      <div style="width:100%; height:140px; background:#182229; position:relative; overflow:hidden;
                  display:flex; align-items:center; justify-content:center;">
        ${imgUrl ? `
          <img src="${imgUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />
        ` : `
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px; color:#8696A0;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z"/>
            </svg>
            <span style="font-size:11px;">Upload Foto Produk</span>
          </div>
        `}
      </div>

      <!-- Product Meta Body -->
      <div style="padding:8px 10px 6px;">
        <!-- Title -->
        <div style="font-size:13.5px; font-weight:700; color:#E9EDEF; line-height:1.3;
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${title}
        </div>

        <!-- Price -->
        <div style="font-size:13px; font-weight:700; color:#00A884; margin-top:2px;">
          ${price}
        </div>

        <!-- Description / Subtitle -->
        <div style="font-size:11px; color:rgba(233,237,239,0.65); margin-top:2px;
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${desc}
        </div>
      </div>

      <!-- Action Button: Lihat Produk -->
      <div style="border-top:1px solid rgba(255,255,255,0.08); padding:7px 10px;
                  display:flex; align-items:center; justify-content:center; gap:5px; color:#00A884;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/>
        </svg>
        <span style="font-size:12px; font-weight:700;">Lihat Produk</span>
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; padding:0 8px 5px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for Product Card settings */
function renderProductCardControlsHtml(msg) {
  const title = escHtml(msg.productTitle || 'Sepatu Sneakers Vintage');
  const price = escHtml(msg.productPrice || 'Rp 299.000');
  const desc  = escHtml(msg.productDesc || 'Ukuran 40-44 • Ready Stock');
  const hasImg = !!msg.productDataUrl;

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          🛍️ Kartu Katalog Produk / Olshop WA
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nama Produk</label>
          <input type="text" placeholder="e.g. Sepatu Sneakers" value="${title}"
                 oninput="setMsgProductTitle('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Harga Barang</label>
          <input type="text" placeholder="e.g. Rp 299.000" value="${price}"
                 oninput="setMsgProductPrice('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-1">Keterangan Singkat</label>
        <input type="text" placeholder="e.g. Ukuran 40-44 • Ready Stock" value="${desc}"
               oninput="setMsgProductDesc('${msg.id}', this.value)"
               class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                      text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      </div>
      <div>
        <label class="block text-[10px] text-gray-400 mb-1">Foto Produk</label>
        <label class="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-wa-accent transition">
          <span class="text-xs text-gray-300 truncate">${hasImg ? '🛍️ Foto Produk Terpasang' : 'Upload Foto Produk…'}</span>
          <input type="file" accept="image/*" class="hidden" onchange="handleProductImgUpload('${msg.id}', this)" />
          <span class="text-[10px] bg-wa-accent/20 text-wa-accent px-1.5 py-0.5 rounded font-bold">Pilih</span>
        </label>
      </div>
    </div>
  `;
}
