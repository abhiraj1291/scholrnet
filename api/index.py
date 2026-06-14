import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from flask import Flask, request, jsonify
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

from app import register_routes

try:
    with app.app_context():
        register_routes(app, bcrypt, login_manager, limiter)
except Exception:
    import traceback
    print(f"ROUTE REGISTRATION ERROR (non-fatal, serving fallback): {traceback.format_exc()}", file=sys.stderr)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def fallback(path):
        return """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ScholrNet</title>
<style>body{margin:0;padding:2rem;font-family:-apple-system,sans-serif;background:#f4f6f9;color:#1a2744;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{max-width:28rem;text-align:center;background:#fff;padding:2.5rem;border-radius:1.5rem;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
h1{font-size:1.5rem;margin:0 0 0.5rem}
p{font-size:0.875rem;color:#5a6a7a;margin:0 0 1.5rem;line-height:1.6}
.btn{display:inline-block;padding:0.75rem 2rem;background:#1a2744;color:#fff;border-radius:0.75rem;text-decoration:none;font-weight:600;font-size:0.875rem}
</style></head>
<body><div class="card">
<h1>ScholrNet</h1>
<p>We're waking up the server. Please refresh in a moment.</p>
<a class="btn" href="/">Refresh</a>
</div></body></html>"""
