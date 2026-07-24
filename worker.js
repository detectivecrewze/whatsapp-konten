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

    // GET /free-tts — Proxy Free Neural Speech / Google TTS without CORS issues
    if (request.method === 'GET' && url.pathname === '/free-tts') {
      try {
        const text = url.searchParams.get('text') || '';
        const lang = url.searchParams.get('lang') || 'id';
        if (!text) {
          return new Response('Missing text', { status: 400, headers: corsHeaders });
        }

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
        const res = await fetch(ttsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!res.ok) {
          return new Response('TTS upstream error', { status: res.status, headers: corsHeaders });
        }

        const audioBuf = await res.arrayBuffer();
        return new Response(audioBuf, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      } catch (err) {
        return new Response(err.message, { status: 500, headers: corsHeaders });
      }
    }

    // POST /upload-audio — Upload MP3 audio binary (R2 / Storage) and return public CDN URL
    if (request.method === 'POST' && url.pathname === '/upload-audio') {
      try {
        const audioBuffer = await request.arrayBuffer();
        const customKey = url.searchParams.get('key');
        const key = customKey || `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`;

        if (env.WA_AUDIO_R2) {
          await env.WA_AUDIO_R2.put(key, audioBuffer, {
            httpMetadata: { contentType: 'audio/mpeg' }
          });
        } else if (env.WA_TEMPLATES_KV) {
          await env.WA_TEMPLATES_KV.put(key, audioBuffer);
        }

        const publicUrl = `${url.origin}/audio/${key}`;
        return new Response(JSON.stringify({ url: publicUrl, key }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // GET /audio/:key — Serve MP3 audio file with CDN caching
    if (request.method === 'GET' && url.pathname.startsWith('/audio/')) {
      const key = url.pathname.replace('/audio/', '');
      let audioStream = null;

      if (env.WA_AUDIO_R2) {
        const object = await env.WA_AUDIO_R2.get(key);
        if (object) {
          audioStream = object.body;
        }
      }

      if (!audioStream && env.WA_TEMPLATES_KV) {
        const data = await env.WA_TEMPLATES_KV.get(key, 'arrayBuffer');
        if (data) {
          audioStream = data;
        }
      }

      if (!audioStream) {
        return new Response('Audio file not found', { status: 404, headers: corsHeaders });
      }

      return new Response(audioStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
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
   - DILARANG menyisipkan tag emosi kurung siku seperti [scared], [whispers], [laughing], dll.
   - DILARANG menggunakan format dramatis berlebihan seperti titik-titik berturut-turut banyak atau HURUF KAPITAL TERIAKAN.
   - Tulis teks percakapan biasa yang santai, alami, bercanda/serius sesuai tema, dan manusiawi.`
          : `3. ELEVENLABS AUDIO EMOTION TAGS & INTENSIFIKASI FORMATTING (SANGAT WAJIB & INTENS):
   - AI ElevenLabs v3 SANGAT PEKA terhadap simbol tanda baca, kapitalisasi, dan Audio Tag.
   - WAJIB SISIPKAN AUDIO TAG EMOSI DI SETIAP BUBBLE CHAT (terutama untuk Horor, Suspense, & Drama):
     * KALO HOROR / SUSPENSE / MISTERI (WAJIB EKSTREM & MENCEKAM):
       - WAJIB pasang Kombo Tag di AWAL setiap bubble: [scared][whispers], [panicked][shouting], [gasp][fearful], [crying][desperate], [trembling][quietly], [angry][shouting].
       - WAJIB gunakan Jeda Napas Ketakutan (... / ......), Gagap (B-bu..., K-kamu...), Teriakan ALL CAPS (JANGAN BUKA!), & Cutoff (—).
       - Contoh: { "type": "text", "direction": "outgoing", "time": "02:15", "text": "[scared][whispers] B-bu...... di luar kamar...... ada yang ketuk pintu......" }
     * KALO KOMEDI / LUCU / PRANK:
       - Gunakan tag: [laughing], [excited], [gasp], [angry], [sighs], [quietly]. Contoh: [laughing] Wkwkwk bjir... lu seriusan?!
     * KALO ROMANTIS / BUCIN:
       - Gunakan tag: [whispers], [shy], [happy], [sighs], [quietly], [crying]. Contoh: [whispers] Aku... aku kangen banget sama kamu...`;

        const systemInstruction = `Kamu adalah penulis naskah cerita pendek percakapan WhatsApp viral profesional (spesialis konten Komedi, Romantis/Bucin, Drama, Horor, dan Olshop/Daily TikTok/Reels/Shorts).

Format Output WAJIB JSON Murni:
{
  "chatType": "personal",
  "name": "Pacar 💕",
  "time": "21:30",
  "messages": [
    { "type": "text", "direction": "outgoing", "time": "21:30", "text": "Sayang" },
    { "type": "text", "direction": "outgoing", "time": "21:30", "text": "Kamu udah tidur belom?" },
    { "type": "text", "direction": "incoming", "senderName": "Pacar", "senderColor": "#25D366", "time": "21:31", "text": "Belom nih, baru kelar cuci muka. Kenapa?" }
  ]
}

Aturan Penulisan Gaya Chat WhatsApp (SANGAT PENTING):
1. GAYA KETIKAN TEXT HP REALISTIS & MANUSIAWI (BUKAN BOT / BAKU OPERA):
   - Pesan buatanmu HARUS terasa seperti teks asli orang Indonesia yang diketik pakai jempol di HP (singkat, 1-8 kata per bubble, spontan, pakai bahasa gaul/santai sehari-hari seperti: wkwk, njir, banget, gak, lu, gua, aku, kamu, dll. sesuai konteks).
   - DILARANG BIKIN KALIMAT NARRATIVE TEATER PANJANG BAKU BOHONGAN.
   - Pisahkan teks menjadi bubble-bubble chat pendek yang alami!

2. FLEXIBEL ADAPTASI GENRE / TEMA (SESUAIKAN DENGAN IDE USER):
   - BACA DENGAN TELITI ide/skenario dari User dan buat cerita yang 100% SESUAI GENRE NYA:
     * Kalo ide HOROR/SUSPENSE: Buat suasana seram mencekam, rasa takut luar biasa, intonasi emosi melimpah di setiap bubble, atau plot twist impostor (bisa gunakan notifikasi push pengirim asli).
     * Kalo ide KOMEDI/LUCU/PRANK: Buat cerita humor yang lucu, ada kebodohan konyol, salah paham kocak, atau ending yang bikin ngakak/tepok jidat. Bahasa santai & gaul!
     * Kalo ide ROMANTIS/BUCIN: Buat obrolan manis, cemburu lucu, kangen, atau momen romantis yang bikin senyum-senyum sendiri.
     * Kalo ide DAILY/OLSHOP/NAGIH UTANG: Buat obrolan realistis sehari-hari yang menghibur & relatable.

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
