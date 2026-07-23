/**
 * statusBarCustom.js — Custom Phone Status Bar Feature Module
 * Handles Battery Level (1% Lowbat / 100%), Charging, Signal & Custom Status Bar Time.
 */

'use strict';

/** Render the complete Phone Status Bar DOM markup */
function renderCustomStatusBarHtml(opts = {}) {
  const isIos = opts.phoneOs !== 'android';
  const clockTime = escHtml(opts.clockTime || '16:12');
  const batteryLevel = Math.max(1, Math.min(100, parseInt(opts.batteryLevel ?? 85, 10)));
  const isLowBat = batteryLevel <= 20;
  const isCharging = !!opts.isCharging;

  // Colors
  const batColor = isLowBat ? '#FF453A' : (isCharging ? '#30D158' : '#E9EDEF');
  const batWidthPercent = `${batteryLevel}%`;

  if (isIos) {
    // 🍎 iPhone (iOS) Status Bar
    return `
      <span id="wa-time" style="font-size:13px; font-weight:600; color:#E9EDEF;">${clockTime}</span>
      <div style="display:flex; align-items:center; gap:6px;">
        <!-- iOS Signal -->
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#E9EDEF">
          <rect x="0" y="8" width="3" height="4" rx="0.5"/>
          <rect x="4.5" y="5" width="3" height="7" rx="0.5"/>
          <rect x="9" y="2" width="3" height="10" rx="0.5"/>
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" opacity="0.35"/>
        </svg>
        <!-- iOS WiFi -->
        <svg width="16" height="12" viewBox="0 0 20 15" fill="none" stroke="#E9EDEF" stroke-width="1.8" stroke-linecap="round">
          <path d="M1 5.5C4.5 2 9.5 1 14 3.5"/>
          <path d="M3.5 8.5C5.8 6 9 5.3 12 7"/>
          <circle cx="10" cy="12.5" r="1.5" fill="#E9EDEF"/>
        </svg>
        <!-- iOS Battery (with lowbat & batteryLevel indicator) -->
        <div style="display:flex; align-items:center; gap:2px;">
          <span style="font-size:10px; font-weight:700; color:${batColor}; margin-right:1px;">${batteryLevel}%</span>
          <div style="width:22px; height:11px; border:1.5px solid ${batColor}; border-radius:3.5px; position:relative; padding:1px; box-sizing:border-box;">
            <div style="width:${batWidthPercent}; height:100%; background:${batColor}; border-radius:1.5px;"></div>
          </div>
          <div style="width:1.5px; height:4px; background:${batColor}; opacity:0.6; border-radius:0 1px 1px 0;"></div>
        </div>
      </div>
    `;
  } else {
    // 🤖 Android Status Bar
    return `
      <div style="display:flex; align-items:center; gap:5px;">
        <span id="wa-time" style="font-size:12.5px; font-weight:600; color:#E9EDEF;">${clockTime}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#8696A0">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 2.17.69 4.19 1.86 5.86L2.5 21.5l3.78-1.32C7.88 21.28 9.87 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>
      </div>
      <div style="display:flex; align-items:center; gap:7px;">
        <!-- Android Signal -->
        <svg width="14" height="12" viewBox="0 0 24 24" fill="#E9EDEF">
          <path d="M2 22h20V2L2 22z"/>
        </svg>
        <!-- Android WiFi -->
        <svg width="14" height="12" viewBox="0 0 24 24" fill="#E9EDEF">
          <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/>
        </svg>
        <!-- Android Battery with lowbat & level -->
        <div style="display:flex; align-items:center; gap:2px;">
          <span style="font-size:11px; font-weight:700; color:${batColor};">${batteryLevel}%</span>
          <svg width="11" height="14" viewBox="0 0 24 24" fill="${batColor}">
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
          </svg>
        </div>
      </div>
    `;
  }
}
