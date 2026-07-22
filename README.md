# WhatsApp Asset Generator — For You, Always
## Internal Tool | README

---

### 📁 Project Structure

```
whatsapp-konten/
├── index.html       ← Dashboard + WA Canvas (open this in browser)
├── app.js           ← JavaScript: state, injection, capture logic
├── style.css        ← Dashboard + WA canvas custom CSS
├── capture.py       ← Python Playwright automation script
├── assets/
│   └── wa-pattern.svg   ← Chat background pattern tile
├── output/          ← Auto-created by capture.py
└── README.md        ← This file
```

---

### 🚀 Quick Start — Browser Mode (Recommended for Testing)

1. Open `index.html` in a modern browser (Chrome/Edge recommended).
2. Fill in the **Control Panel** on the left:
   - Enter the contact name
   - Upload profile picture, meme image, QR code
   - Type message 2 and message 3 texts
3. Use the **Frame Preview** buttons to preview each frame live.
4. Click **Generate & Download ZIP** → downloads `WhatsApp_Assets_YYYYMMDD.zip`.

> **Note:** Browser mode uses `html2canvas`. For production-quality captures (pixel-perfect), use the Python script below.

---

### 🐍 Python Capture Engine (Production / Batch Mode)

#### Installation

```bash
pip install playwright
playwright install chromium
```

#### Usage

```bash
python capture.py \
  --name "Galih 💙" \
  --pfp path/to/profile.jpg \
  --msg1 path/to/meme.jpg \
  --msg2 "Heyy, I got something for you 🎁" \
  --msg3 "Scan the QR below to redeem your gift ✨" \
  --qr path/to/qr_code.png \
  --scale 2 \
  --out ./output
```

#### Scale Options

| `--scale` | Output Size     | Use For           |
|-----------|-----------------|-------------------|
| `1`       | 390 × 844 px    | Preview / Draft   |
| `2`       | 780 × 1688 px   | ✅ Recommended    |
| `3`       | 1170 × 2532 px  | Ultra / Print     |

#### Output

```
output/
├── Frame_01.png   ← Base UI + Header (no messages)
├── Frame_02.png   ← + Incoming image (meme)
├── Frame_03.png   ← + Outgoing text 1
├── Frame_04.png   ← + Outgoing text 2
└── Frame_05.png   ← + QR Code gift
```

---

### 🎨 WhatsApp Dark Mode Color Reference

| Element             | Hex       |
|---------------------|-----------|
| Chat background     | `#111B21` |
| Header / App bar    | `#202C33` |
| Input bar           | `#2A3942` |
| Incoming bubble     | `#202C33` |
| Outgoing bubble     | `#005C4B` |
| Accent / Online     | `#00A884` |
| Primary text        | `#E9EDEF` |
| Secondary text      | `#8696A0` |
| Blue ticks (read)   | `#53BDEB` |

---

### ⚙️ Customization

**Change canvas size** — Edit in `index.html`:
```html
<div id="wa-canvas" style="width: 390px; height: 844px;">
```
Also update in `capture.py`:
```python
CANVAS_WIDTH  = 390
CANVAS_HEIGHT = 844
```

**Add more frames** — Edit the `FRAMES` array in both `app.js` and `capture.py`.

**Change timestamps** — Edit the hardcoded `9:41`, `9:42`, `9:43` values in `index.html` message bubbles.

---

### 💡 Tips for Best Quality

- **QR Code source**: Use at least 500×500px PNG with no anti-aliasing
- **Profile picture**: Square images work best (auto-cropped to circle)
- **Meme image**: Any aspect ratio — capped at 260px wide automatically
- **Python mode**: Always prefer Python for final export (true Chromium rendering)
- **Browser mode**: Great for rapid preview iteration

---

*Built for: For You, Always — Digital Gift Platform*
