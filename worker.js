/**
 * Cloudflare Worker for WhatsApp Generator Team Cloud Sync
 * Free Tier: 100,000 requests/day, 1,000 KV writes/day
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Team-Passcode',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Security Check: Verify Team Passcode for /templates routes
    if (url.pathname === '/templates' || url.pathname === '/') {
      const passcode = request.headers.get('X-Team-Passcode') || url.searchParams.get('passcode');
      const validSecret = env.TEAM_SECRET;

      if (validSecret && (!passcode || passcode !== validSecret)) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing Team Passcode' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET /templates — Fetch all shared team templates
    if (request.method === 'GET' && (url.pathname === '/templates' || url.pathname === '/')) {
      const data = await env.WA_TEMPLATES_KV.get('shared_templates');
      return new Response(data || JSON.stringify({ templates: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /templates — Save/update shared templates
    if (request.method === 'POST' && (url.pathname === '/templates' || url.pathname === '/')) {
      try {
        const body = await request.json();
        await env.WA_TEMPLATES_KV.put('shared_templates', JSON.stringify(body));
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }

    // POST /ai-script — Proxy request to Gemini API securely
    if (request.method === 'POST' && url.pathname === '/ai-script') {
      try {
        const { prompt, targetLength, voiceStyle = 'dramatic' } = await request.json();
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret not set' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        let lengthRule = 'Buat 15 sampai 20 bubble chat lengkap dari awal sampai tamat.';
        if (targetLength === 'short') lengthRule = 'Buat 8 sampai 12 bubble chat ringkas tapi lengkap dari awal sampai tamat.';
        if (targetLength === 'long') lengthRule = 'Buat 25 sampai 35 bubble chat panjang & mendalam dari awal sampai tamat.';

        const dramaticRuleInstruction = voiceStyle === 'normal'
          ? `3. GAYA NORMAL (TANPA TAG EMOSI & TANPA FORMAT EKSTREM):
   - DILARANG menyisipkan tag emosi kurung siku seperti [scared], [whispers], dll.
   - DILARANG menggunakan format dramatis berlebihan seperti titik-titik berturut-turut banyak atau HURUF KAPITAL TERIAKAN.
   - Tulis teks percakapan biasa yang santai, alami, dan manusiawi.`
          : `3. ELEVENLABS DRAMATIC AUDIO TAGS & FORMATTING (SANGAT PENTING UTK AKTING SUARA ELEVENLABS V3):
   - AI ElevenLabs v3 SANGAT PEKA terhadap simbol tanda baca, kapitalisasi, dan Audio Tag.
   - DI SETIAP BUBBLE PESAN, WAJIB kombinasikan Audio Tag & Tanda Baca Dramatis:
     a) TAG EMOSI KURUNG SIKU di awal: [scared][whispers], [panicked][shouting], [gasp][fearful], [crying][desperate], [trembling][quietly], [angry][shouting], [sighs][sad].
     b) JEDA DENGAN TITIK-TITIK (... / ......): Gunakan titik-titik untuk jeda napas, ketakutan, & rasa ragu. Contoh: [scared][whispers] Bu...... di luar...... ada yang berdiri......
     c) TERIAKAN / EMOSI PUNCAK KETIK KAPITAL (ALL CAPS): Gunakan ALL CAPS untuk teriakan atau penekanan panik. Contoh: [panicked] JANGAN BUKA PINTUNYA!
     d) TERPOTONG MENDADAK DENGAN STRIP (—): Contoh: [scared] Aku lihat bayangan—
     e) GAGAP KETAKUTAN: Tulis huruf berulang K-kamu..., B-bu... untuk akting gagap ketakutan.
   - Contoh gabungan sempurna:
     { "type": "text", "direction": "outgoing", "time": "02:15", "text": "[scared][whispers] B-bu...... di luar kamar...... ada yang ketuk pintu......" }
     { "type": "text", "direction": "incoming", "time": "02:16", "text": "[panicked][shouting] JANGAN BUKA PINTUNYA! KUNCI SEKARANG!" }`;

        const systemInstruction = `Kamu adalah penulis naskah cerita pendek percakapan WhatsApp viral profesional (spesialis konten suspense, drama, komedi, dan horor TikTok/Reels/Shorts).

Format Output WAJIB JSON Murni:
{
  "chatType": "personal",
  "name": "Ibu 👩",
  "time": "02:15",
  "messages": [
    { "type": "text", "direction": "outgoing", "time": "02:15", "text": "Bu" },
    { "type": "text", "direction": "outgoing", "time": "02:15", "text": "Masih bangun gak?" },
    { "type": "text", "direction": "incoming", "senderName": "Ibu", "senderColor": "#25D366", "time": "02:16", "text": "Masih nak. Kenapa?" },
    { "type": "text", "direction": "outgoing", "time": "02:16", "text": "Di luar kamar ada suara ketukan pintu pelan banget" },
    { "type": "text", "direction": "incoming", "senderName": "Ibu", "senderColor": "#25D366", "time": "02:17", "text": "Jangan dibuka ya. Kunci pintunya" },
    { "type": "notification", "direction": "incoming", "senderName": "Ibu 👩", "time": "02:18", "text": "Le, HP ibu ketinggalan di ruang tamu. Jangan bales chat WA dari nomor ibu ya, dicolong orang di luar!", "customHoldMs": 4500 }
  ]
}

Aturan Penulisan Gaya Chat WhatsApp (SANGAT PENTING):
1. GAYA KETIKAN TEXT HP REALISTIS (BUKAN DIALOG TEATER/DRAMA OPERA):
   - Pesan buatanmu HARUS terasa seperti teks asli yang diketik menggunakan jempol tangan di HP (singkat, 1-7 kata per bubble, spontan, ada jeda terpisah).
   - DILARANG BIKIN KALIMAT NARRATIVE TEATER PANJANG BAKU (seperti "Ibu dari tadi memperhatikan ada suara napas...", "Kamu di kamar sendirian kan? Pintunya sudah dikunci rapat?", "Makanya dicek..."). Itu terasa seperti naskah drama panggung, BUKAN CHAT WA!
   - Pisahkan teks menjadi bubble-bubble chat pendek yang realistis!

2. LOGIKA ALUR CERITA & PLOT TWIST IMPOSTOR YANG 100% LOGIS:
   - Sejak chat 1-3, perjelas siapa pemegang HP (Kanan) dan siapa lawan bicara (Kiri).
   - DILARANG MEMBUAT DUA ENTITAS DI DALAM SATU ROOM CHAT YANG SAMA (misal di room WA "Ibu", jangan sampai 'Ibu' nge-chat "Ibu di depan pintu kamu" lalu 1 detik kemudian nge-chat lagi "Ibu dari tadi tidur di bawah". Itu MERUSAK LOGIKA & MEMBINGUNGKAN PEMBACA!).
   - RUMUS PLOT TWIST SOSOK PENIRU (IMPOSTOR) YANG BENAR:
     - Di room chat, obrolan berjalan seram/aneh.
     - Di klimaks cerita, munculkan BANNER PUSH NOTIFICATION ("type": "notification") dari PENGIRIM ASLI / PIHAK LUAR di atas HP! (misal Notifikasi dari Ibu: "Nak, ibu baru mendarat di airport, kamu di rumah sama siapa?").
     - Pembaca LANGSUNG SADAR SEKETIKA (INSTANT CHILLS! ⚡): Sosok yang dari tadi membalas chat di room WA itu BUKAN IBU!
     - Lalu pesan terakhir di room chat membalas singkat & dingin (misal: "Kok tau ibu baru sampe airport?").

${dramaticRuleInstruction}

4. ATURAN FITUR:
   - DILARANG MENGGUNAKAN type "voice" (Voice Note).
   - Gunakan type "notification", "image", "deleted", "view_once" HANYA jika relevan & memperkuat cerita.
5. JUMLAH PESAN: ${lengthRule} Wajib penuhi target jumlah pesan.
6. Respon HANYA string JSON murni tanpa pembungkus markdown backtick.`;

        const modelNames = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        let geminiRes = null;
        let successfulModel = '';
        let lastErrorDetails = '';

        for (const m of modelNames) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
          try {
            const res = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  { role: 'user', parts: [{ text: `${systemInstruction}\n\nIde Cerita & Spesifikasi User:\n${prompt}` }] }
                ],
                generationConfig: {
                  temperature: 0.85,
                  maxOutputTokens: 8192
                }
              })
            });
            if (res.ok) {
              geminiRes = res;
              successfulModel = m;
              break;
            } else {
              const errText = await res.text();
              lastErrorDetails = `Model ${m} HTTP ${res.status}: ${errText}`;
            }
          } catch (e) {
            lastErrorDetails = `Model ${m} fetch exception: ${e.message}`;
          }
        }

        if (!geminiRes) {
          return new Response(JSON.stringify({ error: `Semua endpoint Gemini AI gagal dihubungi. Error: ${lastErrorDetails}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const geminiJson = await geminiRes.json();
        const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(cleanedText);
        parsed._modelUsed = successfulModel;
        parsed._timestamp = new Date().toISOString();

        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
