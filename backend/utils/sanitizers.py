import re
import bleach
from flask import current_app
from markupsafe import escape as escape_html

MAX_STRING_LEN = 5000
MAX_CONTENT_LEN = 50000


def sanitize_text(text, max_len=MAX_STRING_LEN):
    if not text:
        return ''
    text = str(text).strip()
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = bleach.clean(text, tags=[], strip=True)
    return text[:max_len]


def sanitize_html_escape(text, max_len=MAX_STRING_LEN):
    return escape_html(sanitize_text(text, max_len))


def validate_file_type(f, allowed_extensions, allowed_mime_prefixes):
    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    if ext not in allowed_extensions:
        return False, f"File type .{ext} not allowed"
    if ext in ('png', 'jpg', 'jpeg', 'gif', 'webp'):
        try:
            from PIL import Image
            img = Image.open(f)
            img.verify()
            f.seek(0)
        except Exception:
            return False, "Invalid image file"
    return True, ''
