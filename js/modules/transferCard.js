/**
 * transferCard.js — WhatsApp Bank / E-Wallet Transfer Receipt Feature Module
 * Handles Transfer Card Bubble Rendering & Dashboard Controls (BCA, DANA, GoPay, OVO).
 */

'use strict';

const TRANSFER_PROVIDERS = [
  { id: 'bca', name: 'Bank BCA', color: '#005CA9', icon: '🏦' },
  { id: 'gopay', name: 'GoPay', color: '#00AED6', icon: '🟢' },
  { id: 'dana', name: 'DANA', color: '#118EEA', icon: '🔷' },
  { id: 'ovo', name: 'OVO', color: '#4D2A83', icon: '💜' },
  { id: 'shopeepay', name: 'ShopeePay', color: '#EE4D2D', icon: '🧡' },
  { id: 'mandiri', name: 'Bank Mandiri', color: '#003D79', icon: '🏦' },
];

/** Return HTML for WhatsApp Transfer Receipt bubble */
function renderTransferCardBubble(msg, isOut, time, escHtmlFn, readTicksSvgFn, groupBadgeHtml = '') {
  const bg = isOut ? '#005C4B' : '#202C33';
  const br = isOut ? '12px 0 12px 12px' : '0 12px 12px 12px';

  const amountStr = msg.trAmount || 'Rp 1.500.000';
  const receiverStr = msg.trReceiver || 'Budi Santoso';
  const noteStr = msg.trNote || '';
  const providerId = msg.trProvider || 'bca';
  const providerObj = TRANSFER_PROVIDERS.find(p => p.id === providerId) || TRANSFER_PROVIDERS[0];

  return `
    <div style="background:${bg}; border-radius:${br}; min-width:240px; max-width:275px;
                padding:9px 11px 7px; box-shadow:0 1px 3px rgba(0,0,0,0.35);">
      ${groupBadgeHtml}

      <!-- Transfer Receipt Card Container -->
      <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; margin-top:2px;">
        <!-- Header: Provider Badge + Success Tag -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">${providerObj.icon}</span>
            <span style="font-size:12px; font-weight:700; color:#E9EDEF;">${escHtmlFn(providerObj.name)}</span>
          </div>
          <span style="font-size:10px; font-weight:700; color:#30D158; background:rgba(48,209,88,0.15); padding:2px 6px; border-radius:4px;">
            ✓ BERHASIL
          </span>
        </div>

        <!-- Nominal Amount -->
        <div style="font-size:18px; font-weight:800; color:#25D366; letter-spacing:0.3px; margin-bottom:4px;">
          ${escHtmlFn(amountStr)}
        </div>

        <!-- Receiver Name & Account -->
        <div style="font-size:11.5px; color:rgba(233,237,239,0.85); margin-bottom:4px; font-weight:500;">
          Ke: <strong style="color:#E9EDEF;">${escHtmlFn(receiverStr)}</strong>
        </div>

        <!-- Optional Note -->
        ${noteStr ? `
        <div style="font-size:11px; color:rgba(233,237,239,0.6); background:rgba(255,255,255,0.05); padding:4px 7px; border-radius:6px; margin-top:4px; font-style:italic;">
          "${escHtmlFn(noteStr)}"
        </div>
        ` : ''}
      </div>

      <!-- Time + Read Ticks -->
      <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:4px;">
        <span style="font-size:11px; color:rgba(233,237,239,0.55);">${time}</span>
        ${isOut ? readTicksSvgFn() : ''}
      </div>
    </div>
  `;
}

/** Return Dashboard controls HTML for Transfer Card settings */
function renderTransferCardControlsHtml(msg) {
  const amount = escHtml(msg.trAmount || 'Rp 1.500.000');
  const receiver = escHtml(msg.trReceiver || 'Budi Santoso');
  const note = escHtml(msg.trNote || '');
  const providerId = msg.trProvider || 'bca';

  const providerOptions = TRANSFER_PROVIDERS.map(p => `
    <option value="${p.id}" ${p.id === providerId ? 'selected' : ''}>
      ${p.icon} ${p.name}
    </option>
  `).join('');

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2.5 space-y-2 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          💸 Bukti Transfer Bank / E-Wallet
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Provider / Bank</label>
          <select onchange="setMsgTrProvider('${msg.id}', this.value)"
                  class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent">
            ${providerOptions}
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nominal (Rp)</label>
          <input type="text" placeholder="e.g. Rp 1.500.000" value="${amount}"
                 oninput="setMsgTrAmount('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent font-semibold text-emerald-400" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Nama Penerima</label>
          <input type="text" placeholder="e.g. Budi Santoso" value="${receiver}"
                 oninput="setMsgTrReceiver('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-1">Catatan (Opsional)</label>
          <input type="text" placeholder="e.g. Bayar utang kemarin" value="${note}"
                 oninput="setMsgTrNote('${msg.id}', this.value)"
                 class="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                        text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        </div>
      </div>
    </div>
  `;
}
