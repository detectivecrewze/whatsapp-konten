(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))t(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&t(s)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function t(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();const r={name:"",pfp:null,messages:[],scale:2,time:"16:12",bgType:"default",bgColor:"#111B21",bgImage:null,phoneOs:"ios",chatType:"personal",groupSubtitle:"Sinta, Budi, Anda, Agus",batteryLevel:85};let Y=0;function T(){return`msg_${++Y}`}function c(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/\n/g,"<br>")}function x(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function I(e){return typeof e=="number"&&r.messages[e]&&r.messages[e].time?r.messages[e].time:r.time||"16:12"}function h(e,i=1e3){return console.log("[fileToDataUrl] Starting processing for file:",e?.name,e?.size,e?.type),new Promise((n,t)=>{if(!e){n(null);return}const o=new FileReader;o.onload=a=>{const s=new Image;s.onload=()=>{let{width:d,height:l}=s;(d>i||l>i)&&(d>l?(l=Math.round(l*i/d),d=i):(d=Math.round(d*i/l),l=i));const f=document.createElement("canvas");f.width=d,f.height=l,f.getContext("2d").drawImage(s,0,0,d,l),n(f.toDataURL("image/png"))},s.onerror=()=>n(a.target.result),s.src=a.target.result},o.onerror=t,o.readAsDataURL(e)})}function p(){return`<svg width="16" height="11" viewBox="0 0 16 11" fill="none" style="flex-shrink:0;">
    <path d="M11.01 1.8L4.62 8.19L2.3 5.87L1.24 6.93L4.62 10.31L12.07 2.86L11.01 1.8Z" fill="#53BDEB"/>
    <path d="M14.77 1.8L8.38 8.19L7.15 6.96L6.09 8.02L8.38 10.31L15.83 2.86L14.77 1.8Z" fill="#53BDEB"/>
  </svg>`}function g(e){const i=e.senderName||"Anggota Group";return`<div style="font-size:12px; font-weight:700; color:${e.senderColor||"#e542a3"}; margin-bottom:2px; line-height:1.2;">${c(i)}</div>`}function b(){const e=document.getElementById("wa-messages");e&&(e.innerHTML="",r.messages.forEach((i,n)=>{const t=X(i,n);t&&(t.setAttribute("data-frame-index",n),e.appendChild(t))}))}function X(e,i){const n=I(i),t=e.direction==="outgoing",o=document.createElement("div");o.style.cssText=`
    display: flex;
    justify-content: ${t?"flex-end":"flex-start"};
    align-items: flex-end;
    margin-bottom: 6px;
    width: 100%;
    box-sizing: border-box;
    padding: 0 4px;
  `,o.setAttribute("data-canvas-msg",e.id);let a="";if(e.type==="text"){const s=t?"#005C4B":"#202C33",d=t?"12px 0 12px 12px":"0 12px 12px 12px",l=r.chatType==="group"&&!t?g(e):"";a=`
      <div style="background:${s}; border-radius:${d}; max-width:270px;
                  padding:8px 10px 6px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        ${l}
        <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                  word-break:break-word; white-space:pre-wrap;">${c(e.text||"")}</p>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; margin-top:4px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${n}</span>
          ${t?p():""}
        </div>
      </div>
    `}else if(e.type==="voice"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderVoiceNoteBubble=="function"?a=window.renderVoiceNoteBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">🎙️ Voice Note</div>`}else if(e.type==="transfer"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderTransferCardBubble=="function"?a=window.renderTransferCardBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">💸 Bukti Transfer</div>`}else if(e.type==="deleted"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderDeletedMessageBubble=="function"?a=window.renderDeletedMessageBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#8696A0; font-size:13px; font-style:italic;">🚫 Pesan ini telah dihapus</div>`}else if(e.type==="view_once"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderViewOnceBubble=="function"?a=window.renderViewOnceBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">① Foto Sekali Lihat</div>`}else if(e.type==="document"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderDocumentCardBubble=="function"?a=window.renderDocumentCardBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">📄 Dokumen</div>`}else if(e.type==="location"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderLocationCardBubble=="function"?a=window.renderLocationCardBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">📍 Lokasi</div>`}else if(e.type==="call"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderCallCardBubble=="function"?a=window.renderCallCardBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">📞 Panggilan</div>`}else if(e.type==="status_reply"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderStatusReplyBubble=="function"?a=window.renderStatusReplyBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">💬 Balasan Status</div>`}else if(e.type==="product"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderProductCardBubble=="function"?a=window.renderProductCardBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">🛍️ Produk</div>`}else if(e.type==="contact"){const s=r.chatType==="group"&&!t?g(e):"";typeof window.renderContactCardBubble=="function"?a=window.renderContactCardBubble(e,t,n,c,p,s):a=`<div style="background:${t?"#005C4B":"#202C33"}; border-radius:12px; padding:8px; color:#E9EDEF; font-size:13px;">👤 Kontak</div>`}else if(e.type==="image")if(!e.dataUrl)a=`
        <div style="background:${t?"#005C4B":"#202C33"}; border-radius:${t?"12px 0 12px 12px":"0 12px 12px 12px"}; width:200px; height:120px;
                    display:flex; align-items:center; justify-content:center; opacity:0.4;">
          <span style="font-size:11px; color:#8696A0;">Image / GIF</span>
        </div>
      `;else{const s=t?"#005C4B":"#202C33",d=t?"12px 0 12px 12px":"0 12px 12px 12px",l=e.isGif?`<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.6);
                      color:#00A884;font-size:10px;font-weight:700;padding:2px 5px;
                      border-radius:4px;letter-spacing:0.5px;">GIF</div>`:"",f=e.caption?"padding: 4px; padding-bottom: 0;":"padding: 0;",m=e.caption?"border-radius: 8px;":"";a=`
        <div style="background:${s}; border-radius:${d}; max-width:260px;
                    overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.3); ${f}">
          <div style="position:relative;">
            <img src="${e.dataUrl}"
                 style="display:block; max-width:260px; max-height:300px;
                        width:100%; object-fit:contain; ${m}" />
            ${l}
          </div>
          ${e.caption?`
          <div style="padding: 4px 6px 2px;">
            <p style="color:#E9EDEF; font-size:14px; line-height:1.5; margin:0;
                      word-break:break-word; white-space:pre-wrap;">${c(e.caption)}</p>
          </div>
          `:""}
          <div style="display:flex; justify-content:flex-end; align-items:center;
                      gap:3px; padding:3px 8px 6px;">
            <span style="font-size:11px; color:${t?"rgba(233,237,239,0.55)":"#8696A0"};">${n}</span>
            ${t?p():""}
          </div>
        </div>
      `}else e.type==="qr"&&(a=`
      <div style="background:#005C4B; border-radius:12px 0 12px 12px; max-width:240px;
                  overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <div style="padding:8px 12px 4px;">
          <p style="font-size:11px; color:rgba(233,237,239,0.7); margin:0;">🎁 Your Gift QR Code</p>
        </div>
        <div style="background:white; margin:8px; border-radius:8px; padding:8px;
                    min-width:184px; min-height:184px;
                    display:flex; align-items:center; justify-content:center;">
          ${!!e.dataUrl?`<img src="${e.dataUrl}"
                    style="width:184px; height:184px; object-fit:contain;
                           image-rendering:pixelated; image-rendering:-webkit-optimize-contrast;
                           display:block;" />`:'<span style="font-size:11px; color:#8696A0; opacity:0.5;">QR Code</span>'}
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center;
                    gap:3px; padding:0 8px 8px;">
          <span style="font-size:11px; color:rgba(233,237,239,0.55);">${n}</span>
          ${p()}
        </div>
      </div>
    `);return o.innerHTML=a,o}function ee(e,i){const n=document.getElementById(e),t=document.getElementById(i);if(!n)return;n.classList.contains("hidden")?(n.classList.remove("hidden"),t&&(t.style.transform="rotate(180deg)")):(n.classList.add("hidden"),t&&(t.style.transform="rotate(0deg)"))}function u(){const e=document.getElementById("msg-builder"),i=document.getElementById("msg-empty-hint");if(e){if(!r.messages||r.messages.length===0)e.innerHTML="",i&&(i.style.display="block");else{i&&(i.style.display="none");try{e.innerHTML=r.messages.map((n,t)=>L(n,t)).join("")}catch(n){console.error("Failed to render dashboard items:",n)}}H(),b(),typeof window.triggerAutoSave=="function"&&window.triggerAutoSave()}}function L(e,i){const n=i===0,t=i===r.messages.length-1,o=e.direction==="outgoing",a=e.type==="text",s=e.type==="image",d=e.type==="qr",l=e.type==="voice",f=e.type==="transfer",m=e.type==="deleted",v=e.type==="location",w=e.type==="view_once",$=e.type==="document",C=e.type==="call",B=e.type==="status_reply",k=e.type==="product",E=e.type==="contact",D=o?"active-dir":"",P=o?"":"active-dir",z=a?"":"hidden",N=s?"":"hidden",j=d?"":"hidden",U=l?"":"hidden",O=f?"":"hidden",G=m?"":"hidden",R=v?"":"hidden",Z=w?"":"hidden",V=$?"":"hidden",q=C?"":"hidden",_=B?"":"hidden",K=k?"":"hidden",Q=E?"":"hidden",W=e.direction==="outgoing"?`<option value="qr" ${d?"selected":""}>QR Code (Gift)</option>`:"",S=(s||d)&&e.dataUrl,M=S?`<img src="${e.dataUrl}" class="mt-2 max-h-16 rounded-lg object-contain border border-gray-700 block" />`:"",J=s&&e.isGif?'<span class="ml-1.5 inline-block bg-wa-accent/20 text-wa-accent text-xs px-1.5 py-0.5 rounded font-bold">GIF</span>':"";return`
  <div class="msg-item bg-gray-800/60 border border-gray-700 rounded-xl p-3 space-y-2.5"
       data-msg-id="${e.id}">

    <!-- Row 1: Direction + Type + Controls -->
    <div class="flex items-center justify-between gap-1.5 w-full">

      <!-- Direction toggle -->
      <div class="flex rounded-lg overflow-hidden border border-gray-700 text-xs flex-shrink-0">
        <button onclick="setMsgDir('${e.id}', 'incoming')"
                class="dir-btn ${P} px-2 py-1.5 font-medium transition text-xs"
                style="${o?"color:#8696A0;":"background:#00A884;color:white;"}">
          ← In
        </button>
        <button onclick="setMsgDir('${e.id}', 'outgoing')"
                class="dir-btn ${D} px-2 py-1.5 font-medium transition text-xs"
                style="${o?"background:#005C4B;color:#E9EDEF;":"color:#8696A0;"}">
          Out →
        </button>
      </div>

      <!-- Type selector -->
      <select onchange="setMsgType('${e.id}', this.value)"
              class="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5
                     text-xs text-white truncate font-medium focus:outline-none focus:ring-1 focus:ring-wa-accent cursor-pointer">
        <option value="text"         ${a?"selected":""}>✏️ Teks</option>
        <option value="contact"      ${E?"selected":""}>👤 Kontak WA</option>
        <option value="product"      ${k?"selected":""}>🛍️ Kartu Produk</option>
        <option value="status_reply" ${B?"selected":""}>💬 Balasan Status</option>
        <option value="voice"        ${l?"selected":""}>🎙️ Voice Note</option>
        <option value="call"         ${C?"selected":""}>📞 Panggilan</option>
        <option value="transfer"     ${f?"selected":""}>💸 Bukti Transfer</option>
        <option value="view_once"    ${w?"selected":""}>① Foto 1× Lihat</option>
        <option value="document"     ${$?"selected":""}>📄 Dokumen PDF</option>
        <option value="location"     ${v?"selected":""}>📍 Lokasi</option>
        <option value="deleted"      ${m?"selected":""}>🚫 Terhapus</option>
        <option value="image"        ${s?"selected":""}>🖼 Gambar / GIF</option>
        ${W}
      </select>

      <!-- Advanced Settings Button ⚙️ -->
      <button onclick="toggleMsgAdvSettings('${e.id}')"
              title="Pengaturan Khusus Pesan (Jam Custom & Zoom Kamera)"
              class="px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${e.showAdvSettings||e.enableZoom||e.time?"bg-wa-accent/20 text-wa-accent border border-wa-accent/50 shadow-sm":"bg-gray-700/80 text-gray-400 border border-gray-600 hover:text-white"}">
        ⚙️ ${e.enableZoom||e.time?'<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>':""}
      </button>

      <!-- Move up / down / remove controls -->
      <div class="flex items-center gap-0.5 flex-shrink-0">
        <button onclick="moveMsg('${e.id}', -1)" ${n?"disabled":""}
                title="Pindah ke atas"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-30 text-xs font-bold">↑</button>
        <button onclick="moveMsg('${e.id}', 1)" ${t?"disabled":""}
                title="Pindah ke bawah"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition disabled:opacity-30 text-xs font-bold">↓</button>
        <button onclick="removeMsg('${e.id}')"
                title="Hapus pesan"
                class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition text-xs font-bold ml-0.5">✕</button>
      </div>
    </div>

    ${e.showAdvSettings?`
    <div class="mb-3 p-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl space-y-2 text-xs">
      <div class="flex items-center justify-between font-bold text-gray-300 border-b border-gray-800 pb-1 text-[11px]">
        <span>⚙️ OPSI KHUSUS PESAN INI</span>
        <button onclick="toggleMsgAdvSettings('${e.id}')" class="text-gray-400 hover:text-white">✕ Close</button>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-0.5">
        <div class="flex items-center gap-1.5">
          <span class="text-gray-400 font-medium">🕒 Jam Custom:</span>
          <input type="text" placeholder="${r.time||"16:12"}" value="${x(e.time||"")}"
                 oninput="setMsgTime('${e.id}', this.value)"
                 class="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none text-center font-mono font-medium" />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-gray-400 font-medium">🔍 Zoom Kamera:</span>
          <select onchange="handleMsgZoomSelect('${e.id}', this.value)"
                  class="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none cursor-pointer">
            <option value="off" ${e.enableZoom?"":"selected"}>OFF (Tanpa Zoom)</option>
            <option value="1.15" ${e.enableZoom&&e.customScale==="1.15"?"selected":""}>1.15× (Soft Zoom)</option>
            <option value="1.30" ${e.enableZoom&&(!e.customScale||e.customScale==="1.30")?"selected":""}>1.30× (Standard)</option>
            <option value="1.50" ${e.enableZoom&&e.customScale==="1.50"?"selected":""}>1.50× (Drama Focus)</option>
            <option value="1.80" ${e.enableZoom&&e.customScale==="1.80"?"selected":""}>1.80× (Close-Up)</option>
            <option value="2.20" ${e.enableZoom&&e.customScale==="2.20"?"selected":""}>2.20× (Extreme)</option>
          </select>
        </div>
      </div>
    </div>
    `:""}

    ${r.chatType==="group"&&!o?`
    <div class="p-2 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1.5 text-xs">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-emerald-400">👤 Nama Pengirim Anggota Group:</span>
      </div>
      <div class="flex items-center gap-2">
        <input type="text" placeholder="e.g. Budi / Sinta / Agus" value="${x(e.senderName||"")}"
               oninput="setMsgSenderName('${e.id}', this.value)"
               class="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
        <input type="color" value="${e.senderColor||"#e542a3"}"
               oninput="setMsgSenderColor('${e.id}', this.value)"
               title="Pilih Warna Nama"
               class="w-7 h-7 bg-gray-800 border border-gray-700 rounded cursor-pointer p-0.5 flex-shrink-0" />
      </div>
      <div class="flex items-center gap-1.5 pt-0.5">
        <span class="text-[10px] text-gray-400">Preset Warna:</span>
        <button type="button" onclick="setMsgSenderColor('${e.id}', '#e542a3')" class="w-4 h-4 rounded-full bg-[#e542a3] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${e.id}', '#53bdeb')" class="w-4 h-4 rounded-full bg-[#53bdeb] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${e.id}', '#e5a638')" class="w-4 h-4 rounded-full bg-[#e5a638] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${e.id}', '#2cb742')" class="w-4 h-4 rounded-full bg-[#2cb742] border border-white/20 hover:scale-110 transition"></button>
        <button type="button" onclick="setMsgSenderColor('${e.id}', '#9d53eb')" class="w-4 h-4 rounded-full bg-[#9d53eb] border border-white/20 hover:scale-110 transition"></button>
      </div>
    </div>
    `:""}

    <div class="${z} space-y-2">
      <textarea rows="2"
                placeholder="Tulis pesan teks…"
                oninput="setMsgText('${e.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${x(e.text??"")}</textarea>
      
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-1.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-600/80 border-dashed
                      rounded-lg px-2.5 py-1 cursor-pointer hover:border-wa-accent transition group w-fit">
          <svg class="w-3.5 h-3.5 text-gray-400 group-hover:text-wa-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span class="text-[11px] font-medium text-gray-400 group-hover:text-gray-200">
            📷 Upload / Sisipkan Gambar ke Pesan Ini
          </span>
          <input type="file" accept="image/*,.gif" class="hidden"
                 onclick="this.value=null"
                 onchange="attachImageToTextMsg('${e.id}', this)" />
        </label>
      </div>
    </div>

    <div class="${N} space-y-2">
      <label class="flex items-center gap-2 bg-gray-700 border border-gray-600 border-dashed
                    rounded-lg px-3 py-2 cursor-pointer hover:border-wa-accent transition group">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-wa-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span class="text-xs text-gray-400 group-hover:text-gray-200 truncate">
          ${e.fileName||"Upload image or GIF…"}${J}
        </span>
        <input type="file" accept="image/*,.gif" class="hidden"
               onchange="handleMsgFile('${e.id}', this)" />
      </label>
      
      <input type="text" placeholder="Or paste direct GIF link (.gif)..."
             value="${e.gifUrl||""}"
             oninput="setMsgGifUrl('${e.id}', this.value)"
             class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5
                    text-base md:text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-wa-accent" />
      
      <textarea rows="1" placeholder="Caption (optional)..."
                oninput="setMsgCaption('${e.id}', this.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5
                       text-base md:text-xs text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-1 focus:ring-wa-accent"
      >${x(e.caption??"")}</textarea>

      ${M}
    </div>

    <div class="${j}">
      <label class="flex items-center gap-2 bg-gray-700 border border-gray-600 border-dashed
                    rounded-lg px-3 py-2 cursor-pointer hover:border-wa-accent transition group">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-wa-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
        </svg>
        <span class="text-xs text-gray-400 group-hover:text-gray-200 truncate">
          ${e.fileName||"Upload QR code image…"}
        </span>
        <input type="file" accept="image/*" class="hidden"
               onchange="handleMsgFile('${e.id}', this)" />
      </label>
      ${S&&d?`<img src="${e.dataUrl}" class="mt-2 w-16 h-16 object-contain border border-gray-600 rounded-lg bg-white p-1 block" />`:M}
    </div>

    <div class="${U}">
      ${typeof window.renderVoiceNoteControlsHtml=="function"?window.renderVoiceNoteControlsHtml(e):""}
    </div>

    <div class="${O}">
      ${typeof window.renderTransferCardControlsHtml=="function"?window.renderTransferCardControlsHtml(e):""}
    </div>

    <div class="${G}">
      ${typeof window.renderDeletedMessageControlsHtml=="function"?window.renderDeletedMessageControlsHtml(e):""}
    </div>

    <div class="${R}">
      ${typeof window.renderLocationCardControlsHtml=="function"?window.renderLocationCardControlsHtml(e):""}
    </div>

    <div class="${Z}">
      ${typeof window.renderViewOnceControlsHtml=="function"?window.renderViewOnceControlsHtml(e):""}
    </div>

    <div class="${V}">
      ${typeof window.renderDocumentCardControlsHtml=="function"?window.renderDocumentCardControlsHtml(e):""}
    </div>

    <div class="${q}">
      ${typeof window.renderCallCardControlsHtml=="function"?window.renderCallCardControlsHtml(e):""}
    </div>

    <div class="${_}">
      ${typeof window.renderStatusReplyControlsHtml=="function"?window.renderStatusReplyControlsHtml(e):""}
    </div>

    <div class="${K}">
      ${typeof window.renderProductCardControlsHtml=="function"?window.renderProductCardControlsHtml(e):""}
    </div>

    <div class="${Q}">
      ${typeof window.renderContactCardControlsHtml=="function"?window.renderContactCardControlsHtml(e):""}
    </div>

    <p class="text-xs text-gray-600 pt-1">Frame ${i+2} — ${e.direction==="outgoing"?"Outgoing":"Incoming"} ${a?"Text":l?"Voice Note":f?"Bukti Transfer":s?"Image/GIF":"QR Code"}</p>
  </div>
  `}function H(){const e=document.getElementById("frame-buttons");if(!e)return;const i=r.messages.length+1;if(r.messages.length===0){e.innerHTML='<span class="text-xs text-gray-600 italic">Add messages to see frames</span>';return}let n="";for(let t=0;t<i;t++){const o=t===0?"Frame 1 — Base":`Frame ${t+1} — Msg ${t}`;n+=`
      <button onclick="previewFrame(${t})"
              class="frame-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              style="border-color:#2A3942; color:#8696A0;"
              data-frame="${t}">${o}</button>
    `}e.innerHTML=n}function te(){A("text","outgoing")}function A(e="text",i="outgoing"){const n=document.getElementById("sec-sequence-body"),t=document.getElementById("icon-sequence-arrow");n&&n.classList.contains("hidden")&&(n.classList.remove("hidden"),t&&(t.style.transform="rotate(180deg)"));const o={id:T(),type:e,direction:i,time:r.time||"16:12",enableZoom:!1,customScale:"1.20",showAdvSettings:!1};e==="text"&&(o.text=""),e==="image"&&(o.dataUrl=null,o.isGif=!1,o.caption=""),e==="qr"&&(o.dataUrl=null),e==="voice"&&(o.duration="0:15",o.isPlaying=!1),e==="transfer"&&(o.nominal="Rp 500.000",o.senderName="SINTA N",o.bankName="BCA"),e==="location"&&(o.locName="Monumen Nasional",o.address="Gambir, Jakarta Pusat"),r.messages.push(o),u(),b(),setTimeout(()=>{const a=document.getElementById("msg-builder");a&&(a.scrollTop=a.scrollHeight)},50)}function ne(e){r.messages=r.messages.filter(i=>i.id!==e),u()}function oe(e,i){const n=r.messages.findIndex(o=>o.id===e);if(n<0)return;const t=n+i;t<0||t>=r.messages.length||([r.messages[n],r.messages[t]]=[r.messages[t],r.messages[n]],u())}function ie(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.direction=i,i==="incoming"&&n.type==="qr"&&(n.type="text"),u())}function re(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.type=i,u())}function ae(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.text=i,b())}function se(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.caption=i,b())}function de(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.time=i,b())}function le(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.senderName=i,b())}function ce(e,i){const n=r.messages.find(t=>t.id===e);n&&(n.senderColor=i,b())}function pe(e){const i=r.messages.find(n=>n.id===e);i&&(i.showAdvSettings=!i.showAdvSettings,u())}function ue(e,i){const n=r.messages.find(t=>t.id===e);n&&(i==="off"?n.enableZoom=!1:(n.enableZoom=!0,n.customScale=i),u())}async function ge(e,i){const n=r.messages.find(o=>o.id===e);if(!n||!i.files?.[0])return;const t=i.files[0];n.fileName=t.name.length>30?t.name.slice(0,27)+"…":t.name,n.isGif=t.type==="image/gif"||t.name.toLowerCase().endsWith(".gif");try{n.dataUrl=await h(t)}catch(o){console.error(o)}u()}async function fe(e,i){const n=r.messages.find(o=>o.id===e);if(!n||!i.files?.[0])return;const t=i.files[0];n.fileName=t.name.length>30?t.name.slice(0,27)+"…":t.name,n.isGif=t.type==="image/gif"||t.name.toLowerCase().endsWith(".gif"),n.type="image",n.caption=n.text||"";try{n.dataUrl=await h(t)}catch(o){console.error(o)}u()}function be(e=1){if(r.messages.length===0)return;let i=r.time||"16:12",[n,t]=i.split(":").map(o=>parseInt(o,10)||0);r.messages.forEach((o,a)=>{if(a===0)o.time=i;else{t+=e,t>=60&&(n=(n+Math.floor(t/60))%24,t=t%60);const s=n.toString().padStart(2,"0"),d=t.toString().padStart(2,"0");o.time=`${s}:${d}`}}),b(),u()}function y(){const e=document.getElementById("inp-name");e&&(r.name=e.value);const i=document.getElementById("inp-time");i&&(r.time=i.value||"16:12");const n=document.getElementById("wa-name");n&&(n.textContent=r.name||"Contact Name");const t=document.getElementById("wa-time");t&&(t.textContent=r.time||"16:12");const o=document.getElementById("wa-chat-area");o&&(r.bgType==="default"?(o.style.backgroundColor="#111B21",o.style.backgroundImage="url('assets/wa-pattern.svg')",o.style.backgroundRepeat="repeat",o.style.backgroundSize="400px",o.style.backgroundPosition="center top"):r.bgType==="color"?(o.style.backgroundColor=r.bgColor,o.style.backgroundImage="url('assets/wa-pattern.svg')",o.style.backgroundRepeat="repeat",o.style.backgroundSize="400px",o.style.backgroundPosition="center top"):r.bgType==="image"&&r.bgImage&&(o.style.backgroundColor="#111B21",o.style.backgroundImage=`url('${r.bgImage}')`,o.style.backgroundRepeat="no-repeat",o.style.backgroundSize="cover",o.style.backgroundPosition="center top")),b()}function ye(){const e=document.getElementById("passcode-modal");if(e){e.classList.remove("hidden"),e.classList.add("flex");const i=document.getElementById("inp-passcode");i&&setTimeout(()=>i.focus(),150)}}function F(){const e=document.getElementById("passcode-modal");e&&(e.classList.add("hidden"),e.classList.remove("flex"))}function me(){const e=document.getElementById("inp-passcode");e&&(e.type=e.type==="password"?"text":"password")}function xe(e){e&&e.preventDefault(),F()}Object.assign(window,{state:r,newId:T,escHtml:c,escAttr:x,msgTime:I,renderCanvas:b,renderDashboard:u,dashboardItemHtml:L,toggleSectionAccordion:ee,updateFrameButtons:H,addMessage:te,addMsg:A,removeMsg:ne,moveMsg:oe,setMsgDir:ie,setMsgType:re,setMsgText:ae,setMsgCaption:se,setMsgTime:de,setMsgSenderName:le,setMsgSenderColor:ce,toggleMsgAdvSettings:pe,handleMsgZoomSelect:ue,handleMsgFile:ge,attachImageToTextMsg:fe,autoSequenceMsgTimes:be,syncBaseFields:y,showPasscodeModal:ye,hidePasscodeModal:F,togglePasscodeVisibility:me,handleUnlockApp:xe});document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("inp-name"),i=document.getElementById("inp-time"),n=document.getElementById("inp-bg-type"),t=document.getElementById("inp-bg-color"),o=document.getElementById("inp-bg-image");e&&e.addEventListener("input",y),i&&i.addEventListener("input",y),n&&n.addEventListener("change",a=>{r.bgType=a.target.value,t&&t.classList.toggle("hidden",r.bgType!=="color");const s=document.getElementById("lbl-bg-image");s&&s.classList.toggle("hidden",r.bgType!=="image"),y()}),t&&t.addEventListener("input",a=>{r.bgColor=a.target.value,y()}),o&&o.addEventListener("change",async a=>{const s=a.target.files?.[0];if(s)try{r.bgImage=await h(s);const d=document.getElementById("bg-image-name");d&&(d.textContent=s.name),y()}catch(d){console.error(d)}}),(!r.messages||r.messages.length===0)&&(r.name="Sayang 💙",e&&(e.value=r.name),r.messages=[{id:"msg_1",type:"text",direction:"incoming",time:"16:12",text:"Halo sayang! Udah jalan jam berapa?"},{id:"msg_2",type:"text",direction:"outgoing",time:"16:13",text:"Bentar lagi oTW yaa niel 🚀"},{id:"msg_3",type:"text",direction:"incoming",time:"16:14",text:"Hati-hati di jalan yaa 🥰"}]),y(),u()});
