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
        const { prompt, targetLength } = await request.json();
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

        const systemInstruction = `Kamu adalah penulis naskah cerita pendek percakapan WhatsApp viral profesional (spesialis konten suspense, drama, komedi, dan horor TikTok/Reels).

Format Output WAJIB JSON Murni:
{
  "chatType": "personal",
  "name": "Nama Kontak / Nama Grup 👥",
  "groupSubtitle": "Sinta, Budi, Anda, Agus",
  "time": "02:00",
  "messages": [
    { "type": "text", "direction": "outgoing", "time": "02:00", "text": "Bro, lu denger suara ketukan pintu di luar gak?" },
    { "type": "text", "direction": "incoming", "senderName": "Budi", "senderColor": "#25D366", "time": "02:01", "text": "Hah? Gua kan lagi di rumah asal gua di Bandung..." },
    { "type": "text", "direction": "outgoing", "time": "02:02", "text": "Lah... terus yang di kamar sebelah kontrakan siapa?" },
    { "type": "notification", "direction": "incoming", "senderName": "Ibu 👩", "time": "02:03", "text": "Le, kamu sendirian kan di kontrakan? Jangan buka pintu kalau ada suara!", "customHoldMs": 4500 }
  ]
}

Ragam Tipe Pesan WA yang Tersedia (Gunakan HANYA jika logis & memperkuat cerita):
- "text": Pesan teks biasa.
- "notification": Push notification banner di atas layar HP (Sangat ampuh untuk plot twist mendadak dari Ibu/Bank/Orang luar).
- "image": Foto/gambar dengan "caption" dan "imgDesc" (e.g. foto bukti/suasana).
- "view_once": Foto 1x lihat / View Once Photo.
- "deleted": Pesan yang sengaja ditarik/dihapus pengirim untuk menciptakan misteri.
- "call": Log panggilan WA ("callType": "voice"/"video", "callMissed": true/false, "callDuration": "05:12").
- "transfer": Bukti transfer bank ("transferAmount": "Rp 500.000", "transferBank": "BCA").
- "status_reply": Balasan status WA ("statusAuthor": "Status Anda", "statusText": "Preview status", "text": "Komentar").
- "location": Berbagi lokasi ("locationName": "Depan Kontrakan Pak Haji", "locationAddress": "Jl. Mawar No. 12").
- "contact": Kartu kontak ("contactName": "Dodi Mekanik", "contactPhone": "0812-3456-7890").
- "product": Kartu katalog produk ("productTitle": "Kemeja Vintage", "productPrice": "Rp 85.000").
- "document": Dokumen PDF ("docName": "Laporan_Final.pdf", "docSize": "2.4 MB").

Prinsip Utama Penulisan Naskah Viral (SANGAT PENTING):
1. KEJELASAN LOKASI & PERAN LOGIS: Sejak 1-3 pesan pertama, HARUS 100% JELAS siapa tokoh kanan (penghuni/pemegang HP), siapa tokoh kiri (lawan chat), dan di mana posisi mereka masing-masing! DILARANG KERAS membuat alur yang kontradiktif (misal ngaku di rumah sendiri lalu mendadak ngaku sembunyi di lemari baju lawan chat tanpa penjelasan logis).
2. ALUR SEBAB-AKIBAT NYAMBUNG & NALAR: Setiap balasan chat HARUS MERESPON poin chat sebelumnya secara logis. Cerita harus terasa konsisten dan mudah diikuti oleh penonton umum.
3. ESKALASI TENSI & PLOT TWIST JERNIH DI ENDING:
   - Pembuka (1-3 chat): Bangun situasi awal & lokasi.
   - Eskalasi (4-8 chat): Rasa penasaran/panik/konflik meningkat bertahap.
   - Klimaks & Plot Twist (Chat Terakhir): Berikan kejutan / plot twist di akhir cerita yang MEMBUAT MERINDING / TERSENYUM / KAGET, tapi HARUS 100% BISA DIPAHAMI LOGIKANYA oleh pembaca dalam sekali baca!
4. DILARANG GUNAKAN "voice": Type "voice" (voice note) dilarang digunakan oleh AI!
5. JUMLAH PESAN: ${lengthRule} Wajib penuhi jumlah pesan sesuai target.
6. PERSPECTIVE CHAT ANAK MUDA: Gunakan gaya bahasa anak muda Indonesia yang alami, singkat, dan spontan (e.g. "Anjrit", "Gua", "Lu", "Demi apa", "Sumpah", "Bentar").
7. Respon HANYA string JSON murni tanpa pembungkus markdown backtick.`;

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
