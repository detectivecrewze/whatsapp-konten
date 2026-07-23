/**
 * js/modules/exportEngine.js — ZIP Image Exporter & Video Recorder Engine
 */

'use strict';

/* ============================================================
   1. HTML2CANVAS FRAME CAPTURE ENGINE
   ============================================================ */

async function captureFrame(scale) {
  const target = document.getElementById('wa-canvas');

  const canvas = await html2canvas(target, {
    scale:           scale,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: '#111B21',
    logging:         false,
    scrollX:         0,
    scrollY:         0,
    width:           target.offsetWidth,
    height:          target.offsetHeight,
    imageTimeout:    20000,
    onclone: (doc) => {
      doc.querySelectorAll('[data-canvas-msg] img').forEach(img => {
        if (img.closest('[data-qr]')) {
          img.style.imageRendering = 'pixelated';
        }
      });
    }
  });

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png', 1.0);
  });
}

/* ============================================================
   2. GENERATE ZIP ASSETS (Image Sequence Exporter)
   ============================================================ */

async function generateAssets() {
  if (typeof syncBaseFields === 'function') syncBaseFields();

  const missing = [];
  if (!state.name.trim())        missing.push('Contact Name');
  if (!state.pfp)                missing.push('Profile Picture');
  if (state.messages.length < 1) missing.push('At least 1 message');

  state.messages.forEach((msg, i) => {
    if ((msg.type === 'image' || msg.type === 'qr') && !msg.dataUrl) {
      missing.push(`Message ${i + 1}: missing file upload`);
    }
    if (msg.type === 'text' && !msg.text?.trim()) {
      missing.push(`Message ${i + 1}: text is empty`);
    }
  });

  if (missing.length > 0) {
    alert(`⚠️ Please complete the following:\n\n• ${missing.join('\n• ')}`);
    return;
  }

  const scale      = state.scale;
  const totalFrames = state.messages.length + 1;
  const statusBar  = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const progress   = document.getElementById('status-progress');
  const btn        = document.getElementById('btn-generate');

  statusBar.classList.remove('hidden');
  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');

  const zip = new JSZip();

  for (let i = 0; i < totalFrames; i++) {
    const frameNum = (i + 1).toString().padStart(2, '0');
    const frameName = `Frame_${frameNum}`;

    statusText.textContent = `Rendering ${frameName}… (${i + 1}/${totalFrames})`;
    progress.style.width   = `${(i / totalFrames) * 100}%`;

    if (typeof applyFrame === 'function') applyFrame(i);
    await sleep(150);

    try {
      const blob = await captureFrame(scale);
      zip.file(`${frameName}.png`, blob);
    } catch (err) {
      console.error(`Capture failed for ${frameName}:`, err);
      statusText.textContent = `❌ Error on ${frameName}`;
    }

    progress.style.width = `${((i + 1) / totalFrames) * 100}%`;
  }

  statusText.textContent = 'Packaging ZIP…';
  progress.style.width   = '95%';

  try {
    const content   = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(content, `WA_Assets_${state.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.zip`);

    progress.style.width   = '100%';
    statusText.textContent = `✅ ${totalFrames} frames downloaded!`;
    statusText.style.color = '#00A884';
  } catch (err) {
    console.error('ZIP error:', err);
    statusText.textContent = `❌ ZIP error: ${err.message}`;
  }

  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    statusText.style.color = '';
  }, 3000);

  if (typeof applyFrame === 'function') applyFrame(totalFrames);
}

/* ============================================================
   3. ANIMATED VIDEO RECORDING ENGINE
   ============================================================ */

function getBestVideoMimeType() {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

function showTyping() {
  const el = document.getElementById('wa-typing');
  if (el) el.style.display = 'block';
}

function hideTyping() {
  const el = document.getElementById('wa-typing');
  if (el) el.style.display = 'none';
}

function drawStatic(ctx, sourceCanvas, durationMs) {
  return new Promise(resolve => {
    const start = performance.now();
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const tick = (now) => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sourceCanvas, 0, 0, w, h);
      if (now - start < durationMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function drawFadeIn(ctx, fromCanvas, toCanvas, durationMs) {
  return new Promise(resolve => {
    const start = performance.now();
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(fromCanvas, 0, 0, w, h);
      ctx.globalAlpha = ease;
      ctx.drawImage(toCanvas, 0, 0, w, h);
      ctx.globalAlpha = 1;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

async function generateVideo() {
  if (typeof syncBaseFields === 'function') syncBaseFields();

  const missing = [];
  if (!state.name.trim())        missing.push('Contact Name');
  if (!state.pfp)                missing.push('Profile Picture');
  if (state.messages.length < 1) missing.push('At least 1 message');
  if (missing.length) {
    alert(`⚠️ Please complete:\n\n• ${missing.join('\n• ')}`);
    return;
  }

  const holdMs      = parseInt(document.getElementById('inp-hold-duration')?.value || '2500', 10);
  const useTyping   = document.getElementById('inp-typing')?.checked ?? true;
  const totalFrames = state.messages.length + 1;

  const statusBar  = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const progress   = document.getElementById('status-progress');
  const btnV       = document.getElementById('btn-video');
  const btnZ       = document.getElementById('btn-generate');

  statusBar.classList.remove('hidden');
  [btnV, btnZ].forEach(b => { if (b) { b.disabled = true; b.classList.add('opacity-50', 'cursor-not-allowed'); } });
  statusText.style.color = '';

  const waTarget = document.getElementById('wa-canvas');
  const H2C_OPTS = {
    scale: 1, useCORS: true, allowTaint: true,
    backgroundColor: '#111B21', logging: false,
    scrollX: 0, scrollY: 0,
    width: waTarget.offsetWidth,
    height: waTarget.offsetHeight,
  };

  const frameCanvases  = [];
  const typingCanvases = [];

  for (let i = 0; i <= state.messages.length; i++) {
    if (typeof applyFrame === 'function') applyFrame(i);
    hideTyping();
    await sleep(130);

    const pct = Math.round((i / (totalFrames * 2)) * 100);
    progress.style.width = `${pct}%`;
    statusText.textContent = `Capturing frame ${i + 1} / ${totalFrames}…`;

    frameCanvases.push(await html2canvas(waTarget, H2C_OPTS));

    if (useTyping && i < state.messages.length && state.messages[i].type === 'text') {
      showTyping();
      await sleep(80);
      typingCanvases.push(await html2canvas(waTarget, H2C_OPTS));
      hideTyping();
    }
  }

  progress.style.width = '52%';
  statusText.textContent = 'Setting up recorder…';
  await sleep(80);

  const recCanvas  = document.createElement('canvas');
  recCanvas.width  = waTarget.offsetWidth;
  recCanvas.height = waTarget.offsetHeight;
  const ctx = recCanvas.getContext('2d');

  const mimeType = getBestVideoMimeType();
  const stream   = recCanvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  for (let i = 0; i < frameCanvases.length; i++) {
    const pct = 52 + Math.round((i / frameCanvases.length) * 44);
    progress.style.width = `${pct}%`;
    statusText.textContent = `Rendering video frame ${i + 1} / ${frameCanvases.length}…`;

    if (i === 0) {
      await drawStatic(ctx, frameCanvases[0], holdMs);
    } else {
      const prevCanvas = frameCanvases[i - 1];
      const currCanvas = frameCanvases[i];
      const typeCanvas = typingCanvases[i - 1];

      if (typeCanvas) {
        await drawFadeIn(ctx, prevCanvas, typeCanvas, 220);
        await drawStatic(ctx, typeCanvas, 800);
        await drawFadeIn(ctx, typeCanvas, currCanvas, 220);
      } else {
        await drawFadeIn(ctx, prevCanvas, currCanvas, 320);
      }
      await drawStatic(ctx, currCanvas, holdMs);
    }
  }

  statusText.textContent = 'Finalizing video file…';
  progress.style.width   = '98%';

  await new Promise(r => {
    recorder.onstop = r;
    recorder.stop();
  });

  const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type: mimeType });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `WA_Video_${state.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${ext}`;
  link.click();

  progress.style.width   = '100%';
  statusText.textContent = `✅ Video downloaded (.${ext})!`;
  statusText.style.color = '#00A884';

  setTimeout(() => {
    [btnV, btnZ].forEach(b => { if (b) { b.disabled = false; b.classList.remove('opacity-50', 'cursor-not-allowed'); } });
    statusText.style.color = '';
    if (typeof applyFrame === 'function') applyFrame(totalFrames);
    statusBar.classList.add('hidden');
    progress.style.width = '0%';
  }, 4000);
}
