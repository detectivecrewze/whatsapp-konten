/**
 * groupChat.js — WhatsApp Group Chat Feature Module
 * Handles Group Chat Mode, Member Names & Custom Sender Colors.
 */

'use strict';

const GROUP_SENDER_COLORS = [
  { name: 'Teal Green', hex: '#35CD96' },
  { name: 'Royal Blue', hex: '#1F75FE' },
  { name: 'Crimson Red', hex: '#E52854' },
  { name: 'Amber Orange', hex: '#F08000' },
  { name: 'Purple', hex: '#A630A7' },
  { name: 'Deep Emerald', hex: '#00A884' },
  { name: 'Magenta Pink', hex: '#E542A3' },
  { name: 'Bright Orange', hex: '#FF7B00' },
];

/** Return HTML for Sender Name header inside incoming group chat bubble */
function renderGroupSenderBadge(msg) {
  if (!msg || msg.direction === 'outgoing') return '';
  const senderName = msg.senderName || 'Anggota Group';
  const senderColor = msg.senderColor || '#35CD96';

  return `
    <div style="font-size:12.5px; font-weight:600; color:${senderColor}; margin-bottom:2px;
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
      ${escHtml(senderName)}
    </div>
  `;
}

/** Return HTML for Dashboard controls to set Sender Name & Color */
function renderGroupSenderInputHtml(msg) {
  const currentName = escHtml(msg.senderName || '');
  const currentColor = msg.senderColor || '#35CD96';

  const colorOptions = GROUP_SENDER_COLORS.map(c => `
    <option value="${c.hex}" ${c.hex.toLowerCase() === currentColor.toLowerCase() ? 'selected' : ''}>
      ${c.name}
    </option>
  `).join('');

  return `
    <div class="bg-gray-900/80 border border-gray-700/70 rounded-lg p-2 space-y-1.5 mt-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
          👥 Pengirim Group
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input type="text"
               placeholder="Nama Pengirim (e.g. Agus)"
               value="${currentName}"
               oninput="setMsgSenderName('${msg.id}', this.value)"
               class="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5
                      text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        
        <select onchange="setMsgSenderColor('${msg.id}', this.value)"
                class="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5
                       text-xs text-white focus:outline-none focus:ring-1 focus:ring-wa-accent"
                style="color:${currentColor};">
          ${colorOptions}
        </select>
      </div>
    </div>
  `;
}
