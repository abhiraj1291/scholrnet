import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from flask import Flask, request
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

from config import Config
from models import db

app = Flask(
    __name__,
    template_folder=os.path.join(FRONTEND_DIR, 'templates'),
    static_folder=os.path.join(FRONTEND_DIR, 'static'),
    static_url_path='/static'
)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
Compress(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "60 per hour"],
    storage_uri=app.config.get("RATELIMIT_STORAGE_URI", "memory://"),
)

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com https://apis.google.com https://challenges.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; "
        "img-src 'self' data: blob: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "frame-src 'self' https://*.firebaseapp.com https://challenges.cloudflare.com; "
        "connect-src 'self' https://*.googleapis.com wss://*.firebaseio.com https://*.supabase.co https://challenges.cloudflare.com; "
        "media-src 'self' data: blob:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    response.headers.pop("Server", None)
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=86400'
    return response

from app import register_routes, enable_rls

_startup_ok = False
_startup_error = None
try:
    with app.app_context():
        db.create_all()
        enable_rls()
        register_routes(app, bcrypt, login_manager, limiter)
    _startup_ok = True
except Exception as e:
    import traceback
    _startup_error = traceback.format_exc()
    print(f"CRITICAL STARTUP ERROR: {_startup_error}", file=sys.stderr)

if not _startup_ok:
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def fallback(path):
        return f"""<!DOCTYPE html><html><head><title>ScholrNet</title><meta charset="utf-8">
<style>body{{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9}}
.card{{max-width:480px;padding:2rem;text-align:center;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}}
h1{{font-size:1.5rem;color:#1a2744}}p{{color:#5a6a7a;font-size:0.9rem;line-height:1.6}}</style></head>
<body><div class="card"><h1>ScholrNet</h1>
<p>We're doing some maintenance. Check back in a few minutes.</p>
<pre style="font-size:0.7rem;color:#9aa6b5;margin-top:1rem;text-align:left;max-height:200px;overflow:auto">{_startup_error[:500] if _startup_error else 'Unknown error'}</pre>
</div></body></html>""", 503
