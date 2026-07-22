#!/usr/bin/env python3
"""
capture.py — WhatsApp Asset Generator v2 | Dynamic Screenshot Engine
For You, Always — Internal Tool

Supports dynamic message count via --config JSON file.

REQUIREMENTS:
    pip install playwright
    playwright install chromium

QUICK USAGE (with config file — recommended):
    python capture.py --config config.json

EXAMPLE config.json:
    {
        "name": "Sayang 💙",
        "pfp": "assets/pfp.jpg",
        "scale": 2,
        "output": "./output",
        "messages": [
            {"direction": "incoming", "type": "image",  "content": "assets/meme.jpg"},
            {"direction": "outgoing", "type": "text",   "content": "Heyy, I got something for you 🎁"},
            {"direction": "outgoing", "type": "text",   "content": "Scan the QR below to redeem ✨"},
            {"direction": "outgoing", "type": "qr",     "content": "assets/qr_code.png"}
        ]
    }

Message types:
    text  — text bubble. "content" = string
    image — image or GIF bubble. "content" = file path
    qr    — QR code bubble (outgoing only). "content" = file path

OUTPUT:
    Frame_01.png → Base WA UI (no messages)
    Frame_02.png → + Message 1
    Frame_03.png → + Message 1 + 2
    ...
    Frame_N+1.png → All messages
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path


# ─── Playwright import check ──────────────────────────────────────────────────
try:
    from playwright.sync_api import sync_playwright, Page
except ImportError:
    print("❌  Playwright not found. Run:\n    pip install playwright && playwright install chromium")
    sys.exit(1)


# ─── Canvas dimensions (must match index.html) ────────────────────────────────
CANVAS_W = 390
CANVAS_H = 844


# ─── Helpers ──────────────────────────────────────────────────────────────────

def file_to_data_url(path: str) -> str:
    """Read image file → base64 data URL."""
    p = Path(path).resolve()
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")

    ext_to_mime = {
        ".jpg":  "image/jpeg", ".jpeg": "image/jpeg",
        ".png":  "image/png",  ".gif":  "image/gif",
        ".webp": "image/webp", ".svg":  "image/svg+xml",
    }
    mime = ext_to_mime.get(p.suffix.lower(), "image/png")

    with open(p, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f"data:{mime};base64,{b64}"


def msg_time(index: int) -> str:
    """Generate display time for the Nth message (matches app.js msgTime)."""
    total_min = 9 * 60 + 41 + index
    h, m = divmod(total_min, 60)
    return f"{h}:{m:02d}"


# ─── Asset Injection ──────────────────────────────────────────────────────────

def inject_assets(page: Page, name: str, pfp_path: str | None, messages: list) -> None:
    """Inject name, PFP, and all message data into the WA canvas."""

    # Name
    if name:
        safe = name.replace("'", "\\'")
        page.evaluate(f"document.getElementById('wa-name').textContent = '{safe}';")

    # PFP
    if pfp_path:
        pfp_url = file_to_data_url(pfp_path)
        page.evaluate(f"""
            const img = document.getElementById('wa-pfp');
            img.src = '{pfp_url}';
            img.style.display = 'block';
            const fb = document.getElementById('wa-pfp-fallback');
            if (fb) fb.style.display = 'none';
        """)

    # Messages — build state.messages and re-render
    js_messages = []
    for i, msg in enumerate(messages):
        msg_obj = {
            "id":        f"py_msg_{i}",
            "direction": msg.get("direction", "outgoing"),
            "type":      msg.get("type", "text"),
            "text":      msg.get("content", "") if msg.get("type") == "text" else "",
            "dataUrl":   "",
            "fileName":  "",
            "isGif":     False,
        }

        # Convert file paths to data URLs for image/qr types
        if msg.get("type") in ("image", "qr") and msg.get("content"):
            try:
                data_url = file_to_data_url(msg["content"])
                msg_obj["dataUrl"] = data_url
                msg_obj["fileName"] = Path(msg["content"]).name
                msg_obj["isGif"] = Path(msg["content"]).suffix.lower() == ".gif"
            except FileNotFoundError as e:
                print(f"  ⚠️  Warning: {e}")

        js_messages.append(msg_obj)

    # Inject into state and re-render canvas
    page.evaluate(f"""
        // Inject messages into state
        state.messages = {json.dumps(js_messages)};
        // Re-render canvas
        renderCanvas();
    """)

    # Wait for images to load
    page.evaluate("""
        () => new Promise((resolve) => {
            const imgs = document.querySelectorAll('#wa-canvas img');
            const pending = Array.from(imgs).filter(i => !i.complete);
            if (!pending.length) { resolve(); return; }
            let count = 0;
            pending.forEach(img => {
                const done = () => { count++; if (count >= pending.length) resolve(); };
                img.addEventListener('load', done);
                img.addEventListener('error', done);
            });
            // Timeout fallback
            setTimeout(resolve, 8000);
        })
    """)


# ─── Frame Capture ────────────────────────────────────────────────────────────

def apply_frame(page: Page, frame_index: int) -> None:
    """Show first frame_index messages (mirrors applyFrame in app.js)."""
    page.evaluate(f"""
        const messages = document.querySelectorAll('#wa-messages > [data-frame-index]');
        messages.forEach((el) => {{
            const idx = parseInt(el.getAttribute('data-frame-index') || '999', 10);
            el.style.display = idx < {frame_index} ? '' : 'none';
        }});
    """)


def capture_frame(page: Page, frame_index: int, output_dir: Path, frame_name: str) -> Path:
    """Apply frame state and screenshot the canvas element."""
    apply_frame(page, frame_index)
    time.sleep(0.15)
    page.wait_for_timeout(120)

    out_path = output_dir / f"{frame_name}.png"
    page.locator("#wa-canvas").screenshot(path=str(out_path), type="png")
    print(f"  ✅  {frame_name}.png  ({out_path.stat().st_size // 1024} KB)")
    return out_path


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="WhatsApp Asset Generator v2 — Dynamic Screenshot Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--config", help="Path to JSON config file (recommended)")
    parser.add_argument("--name",   help="Contact name (overrides config)")
    parser.add_argument("--pfp",    help="Profile picture path (overrides config)")
    parser.add_argument("--scale",  type=int, choices=[1,2,3], help="Device scale (overrides config)")
    parser.add_argument("--out",    help="Output directory (overrides config)")
    parser.add_argument("--html",   help="Path to index.html (auto-detected if omitted)")

    args = parser.parse_args()

    # ── Load config ────────────────────────────────────────────────────────────
    config = {}
    if args.config:
        cfg_path = Path(args.config).resolve()
        if not cfg_path.exists():
            print(f"❌  Config file not found: {cfg_path}")
            sys.exit(1)
        with open(cfg_path) as f:
            config = json.load(f)
        print(f"📋  Loaded config: {cfg_path}")

    # CLI args override config
    name      = args.name   or config.get("name", "Contact")
    pfp       = args.pfp    or config.get("pfp")
    scale     = args.scale  or config.get("scale", 2)
    out_dir   = args.out    or config.get("output", "./output")
    messages  = config.get("messages", [])

    if not messages:
        print("❌  No messages defined. Add them to config.json or edit state.messages in app.js.")
        sys.exit(1)

    total_frames = len(messages) + 1  # Frame 1 = base (no messages)

    # ── Resolve paths ──────────────────────────────────────────────────────────
    script_dir = Path(__file__).parent.resolve()
    html_path  = Path(args.html).resolve() if args.html else (script_dir / "index.html")
    output_dir = Path(out_dir).resolve()

    if not html_path.exists():
        print(f"❌  index.html not found: {html_path}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🚀  WhatsApp Asset Generator v2")
    print(f"    Contact : {name}")
    print(f"    Messages: {len(messages)}")
    print(f"    Frames  : {total_frames}")
    print(f"    Scale   : {scale}×  → {CANVAS_W * scale}×{CANVAS_H * scale}px")
    print(f"    Output  : {output_dir}\n")

    # ── Playwright ────────────────────────────────────────────────────────────
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--font-render-hinting=none",
            ],
        )

        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=scale,
        )

        page = context.new_page()
        page.goto(html_path.as_uri(), wait_until="networkidle", timeout=30_000)
        page.wait_for_timeout(1800)  # Allow Tailwind CDN + fonts
        print("🌐  Page loaded.\n")

        # Inject all assets
        print("📦  Injecting assets…")
        inject_assets(page, name, pfp, messages)
        page.wait_for_timeout(600)
        print("    Done.\n")

        # Capture frames
        print("📸  Capturing frames…")
        for i in range(total_frames):
            num  = str(i + 1).zfill(2)
            name_str = f"Frame_{num}"
            desc = "Base UI" if i == 0 else f"+ Message {i}"
            print(f"    → Frame {i+1}/{total_frames}: {name_str}  ({desc})")
            capture_frame(page, i, output_dir, name_str)

        context.close()
        browser.close()

    print(f"\n🎉  Done! {total_frames} frames saved to: {output_dir}\n")


if __name__ == "__main__":
    main()
