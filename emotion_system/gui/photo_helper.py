"""
gui/photo_helper.py
===================
Shared photo loading system for ALL pages (student, doctor, parent).
Priority: 1. Local student_photos/ folder
           2. student_photo_links.json (local path or Google Drive URL)
           3. Coloured circle avatar with initials
"""
import os, threading, json
import customtkinter as ctk
from PIL import Image, ImageDraw

# ── Paths ──────────────────────────────────────────────────
_ROOT       = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
_PHOTOS_DIR = os.path.join(_ROOT, "student_photos")
_LINKS_JSON = os.path.join(_ROOT, "student_photo_links.json")

# ── In-memory cache ────────────────────────────────────────
_CACHE:     dict = {}   # key → CTkImage
_LINKS:     dict = {}   # sid → local_path or gdrive_url
_LINKS_LOADED = False


def _load_links():
    global _LINKS_LOADED
    if _LINKS_LOADED:
        return
    _LINKS_LOADED = True
    if os.path.exists(_LINKS_JSON):
        try:
            with open(_LINKS_JSON, encoding="utf-8") as f:
                _LINKS.update(json.load(f))
        except Exception as e:
            print(f"[photo] JSON load error: {e}")


def _gdrive_to_url(url: str) -> str:
    """Convert any Google Drive share URL to direct download URL."""
    if "id=" in url:
        fid = url.split("id=")[1].split("&")[0]
    elif "/d/" in url:
        fid = url.split("/d/")[1].split("/")[0]
    else:
        return url
    return f"https://lh3.googleusercontent.com/d/{fid}"


def _load_pil(sid: str, size: tuple) -> Image.Image | None:
    """
    Try to load photo PIL image.
    Priority: local file → JSON link (local path or URL)
    """
    _load_links()

    # 1. Local student_photos/SID.jpg
    for ext in ("jpg", "jpeg", "png"):
        p = os.path.join(_PHOTOS_DIR, f"{sid}.{ext}")
        if os.path.exists(p):
            try:
                return _crop_square(Image.open(p).convert("RGB"), size)
            except Exception:
                pass

    # 2. From links JSON
    link = _LINKS.get(sid, "")
    if link:
        # Check if it's a local path
        if os.path.exists(link):
            try:
                return _crop_square(Image.open(link).convert("RGB"), size)
            except Exception:
                pass
        # Otherwise try as URL (Google Drive)
        elif link.startswith("http"):
            try:
                import requests
                from io import BytesIO
                url = _gdrive_to_url(link) if "drive.google" in link else link
                r = requests.get(url, timeout=8,
                                  headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code == 200 and len(r.content) > 500:
                    return _crop_square(
                        Image.open(BytesIO(r.content)).convert("RGB"), size)
            except Exception:
                pass

    return None


def _crop_square(img: Image.Image, size: tuple) -> Image.Image:
    w, h = img.size
    m = min(w, h)
    img = img.crop(((w-m)//2, (h-m)//2, (w+m)//2, (h+m)//2))
    return img.resize(size, Image.LANCZOS)


def _make_avatar(color: str, size: int, initials: str = "?") -> Image.Image:
    """Professional colored circle with initials."""
    try:
        r = int(color[1:3], 16)
        g = int(color[3:5], 16)
        b = int(color[5:7], 16)
    except Exception:
        r, g, b = 59, 130, 246

    base   = Image.new("RGB", (size, size), (12, 23, 42))
    circle = Image.new("RGB", (size, size), (r, g, b))
    mask   = Image.new("L",   (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    base.paste(circle, mask=mask)

    # Draw initials
    draw    = ImageDraw.Draw(base)
    font_sz = max(12, size // 3)
    try:
        from PIL import ImageFont
        for font_path in ["arial.ttf", "Arial.ttf",
                          "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                          "/System/Library/Fonts/Helvetica.ttc"]:
            try:
                font = ImageFont.truetype(font_path, font_sz)
                break
            except Exception:
                font = None
        if font is None:
            font = ImageFont.load_default()
    except Exception:
        font = None

    text = (initials[:2]).upper()
    if font:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    else:
        tw = th = font_sz

    draw.text(((size-tw)//2, (size-th)//2), text,
               fill="white", font=font)
    return base


def get_photo(sid: str, name: str = "", color: str = "#3b82f6",
               size: tuple = (96, 96)) -> ctk.CTkImage:
    """
    Return cached CTkImage for student.
    Always returns something — real photo or avatar.
    """
    key = f"{sid}_{size[0]}"
    if key in _CACHE:
        return _CACHE[key]

    # Get initials from name
    parts    = name.strip().split()
    initials = "".join(p[0] for p in parts[:2]).upper() if parts else "?"

    pil = _load_pil(sid, size) or _make_avatar(color, size[0], initials)

    # Apply circular mask
    mask = Image.new("L", pil.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, pil.width, pil.height], fill=255)
    out = Image.new("RGB", pil.size, (12, 23, 42))
    out.paste(pil, mask=mask)

    tk_img = ctk.CTkImage(light_image=out, dark_image=out, size=size)
    _CACHE[key] = tk_img
    return tk_img


def async_photo(widget, sid: str, name: str = "",
                 color: str = "#3b82f6", size: tuple = (96, 96)):
    """Load photo in background thread, update widget when done."""
    def _work():
        img = get_photo(sid, name, color, size)
        def _apply():
            try:
                widget.configure(image=img, text="")
            except Exception:
                pass
        try:
            widget.after(0, _apply)
        except Exception:
            pass
    threading.Thread(target=_work, daemon=True).start()


def clear_cache():
    """Clear photo cache (call when switching dark/light mode)."""
    _CACHE.clear()
