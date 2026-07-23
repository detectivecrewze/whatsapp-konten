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

    // Security Check: Verify Team Passcode from Cloudflare Environment Secret (env.TEAM_SECRET)
    const passcode = request.headers.get('X-Team-Passcode') || new URL(request.url).searchParams.get('passcode');
    const validSecret = env.TEAM_SECRET;

    if (!validSecret || !passcode || passcode !== validSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing Team Passcode' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);

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
        const { prompt } = await request.json();
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret not set' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const systemInstruction = `Kamu adalah penulis naskah konten drama & komedi WhatsApp viral profesional untuk TikTok/Reels/Shorts.
Hasilkan JSON valid dengan format persis berikut:
{
  "name": "Nama Kontak / Lawan Bicara 👻",
  "time": "02:05",
  "messages": [
    { "type": "text", "direction": "incoming", "time": "02:05", "text": "Bro, kamu lagi denger suara orang ketuk pintu kamar ga?" },
    { "type": "text", "direction": "outgoing", "time": "02:07", "text": "Gak ada tuh bro. Perasaan kamu aja kali." },
    { "type": "voice", "direction": "incoming", "time": "02:09", "vnDuration": "0:14", "text": "" },
    { "type": "text", "direction": "outgoing", "time": "02:12", "text": "Jangan nakut-nakutin jir!! Aku sendirian!" },
    { "type": "text", "direction": "incoming", "time": "02:15", "text": "Wkwk kaget kan! Ini aku di teras depan bawa martabak manis! Buka pintu cepet!" }
  ]
}

Syarat Wajib Naskah:
1. JUMLAH PESAN: Buat 8 sampai 14 bubble chat obrolan panjang, mendalam, dan lengkap dari awal sampai tamat!
2. STRUKTUR CERITA LENGKAP: Harus ada Pembuka ➔ Masalah/Drama ➔ Puncak Emosi/Puncak Ketegangan ➔ KLIMAKS / ENDING PLOT TWIST (Plot twist lucu, kaget, atau lega). Jangan gantung!
3. TYPE VARIASI: Boleh gunakan type "text" dan sesekali "voice" (Voice Note dengan "vnDuration": "0:15").
4. JAM REALISTIS: Jam (time) harus bertambah secara ALAMI & REALISTIS (misal 02:05 -> 02:07 -> 02:09 -> 02:12 -> 02:16).
5. BAHASA: Gunakan bahasa gaul anak muda Indonesia yang sangat santai, natural, dan ekspresif.
6. Respon HANYA string JSON murni tanpa pembungkus markdown.`;

        const modelNames = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let geminiRes = null;
        for (const m of modelNames) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
          try {
            const res = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  { role: 'user', parts: [{ text: `${systemInstruction}\n\nIde Cerita: ${prompt}` }] }
                ]
              })
            });
            if (res.ok) {
              geminiRes = res;
              break;
            }
          } catch (e) {
            console.warn(`Model ${m} failed, trying next...`);
          }
        }

        if (!geminiRes) {
          throw new Error('Semua endpoint Gemini AI gagal dihubungi.');
        }

        const geminiJson = await geminiRes.json();
        const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);

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
