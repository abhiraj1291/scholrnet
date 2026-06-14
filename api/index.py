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

_startup_error = None
try:
    with app.app_context():
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                db.create_all()
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"DB CONNECT ATTEMPT {attempt + 1} FAILED, retrying in 2s: {e}")
                    time.sleep(2)
                else:
                    raise
        enable_rls()
        register_routes(app, bcrypt, login_manager, limiter)
except Exception as e:
    import traceback
    _startup_error = traceback.format_exc()
    print(f"STARTUP ERROR: {_startup_error}", file=sys.stderr)

if _startup_error:
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def fallback(path):
        return f"""<!DOCTYPE html><html><head><title>ScholrNet - Error</title><meta charset="utf-8">
<style>body{{font-family:monospace;padding:2rem;background:#1a1a2e;color:#e0e0e0}}
pre{{white-space:pre-wrap;word-break:break-word;background:#16213e;padding:1rem;border-radius:8px;max-width:800px;margin:0 auto}}
h1{{color:#e94560}}</style></head><body><h1>Startup Error</h1><pre>{_startup_error}</pre></body></html>""", 500
