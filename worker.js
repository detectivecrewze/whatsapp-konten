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

        const systemInstruction = `Kamu adalah penulis naskah konten percakapan WhatsApp viral profesional untuk TikTok/Reels/Shorts.
Hasilkan JSON valid dengan format persis berikut:
{
  "chatType": "personal",
  "name": "Nama Kontak / Nama Grup 👥",
  "groupSubtitle": "Sinta, Budi, Anda, Agus",
  "time": "21:15",
  "messages": [
    { "type": "text", "direction": "incoming", "senderName": "Budi", "senderColor": "#25D366", "time": "21:15", "text": "isi pesan" },
    { "type": "image", "direction": "outgoing", "time": "21:16", "caption": "Nih liat fotonya!", "imgDesc": "Foto bukti transfer / barang / lokasi / suasana" },
    { "type": "voice", "direction": "incoming", "senderName": "Sinta", "senderColor": "#e542a3", "time": "21:17", "vnDuration": "0:14", "text": "" }
  ]
}

Syarat Wajib Naskah:
1. DETEKSI MODE CHAT (PERSONAL VS GROUP): Jika prompt pengguna menyebutkan grup chat (misal: "grup keluarga", "grup alumni", "grup tongkrongan", "grup panitia", "grup kelas"), WAJIB set "chatType": "group", berikan "groupSubtitle", dan sertakan "senderName" serta "senderColor" (pilihan warna: "#25D366", "#e542a3", "#34b7f1", "#ff9800") pada setiap pesan incoming dari pengirim berbeda!
2. PATUHI GENRE USER: Ikuti GENRE dan TONE cerita yang diminta pengguna di prompt (misal jika tentang olshop/COD buat komplain olshop; jika romantis/bucin buat percakapan manis/bucin; jika komedi buat lucu; jika horor buat horor). DILARANG mengubah cerita menjadi horor apabila prompt pengguna bertema lain!
3. KARTU FOTO / IMAGE BUBBLE: Apabila alur cerita membutuhkan pengiriman foto (misal: foto barang olshop, foto bukti transfer, foto lokasi, foto selfie, foto suasana serem, foto bukti labrak selingkuh), WAJIB sisipkan 1-3 pesan ber-type "image" dengan properti "caption" dan "imgDesc" (deskripsi foto singkat).
4. JUMLAH PESAN: ${lengthRule} Wajib patuhi persis jika pengguna menyebutkan jumlah spesifik di prompt.
5. STRUKTUR CERITA LENGKAP: Harus ada Pembuka ➔ Konflik/Eskalasi ➔ Klimaks / Ending Tuntas / Plot Twist yang sesuai genre.
6. FORMAT CHAT SINGKAT: Pesan-pesan dibuat singkat-singkat khas anak muda Indonesia yang saling balas cepat.
7. JAM REALISTIS: Jam (time) bertambah secara ALAMI & REALISTIS (misal 21:15 -> 21:16 -> 21:18 -> 21:22).
8. Respon HANYA string JSON murni tanpa pembungkus markdown backtick.`;

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
