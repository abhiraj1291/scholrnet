"""Entry point for ScholrNet v2."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from flask import Flask, request
from sqlalchemy import text
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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

# Security headers on every response
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com https://apis.google.com; "
        "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; "
        "img-src 'self' data: blob: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "frame-src 'self' https://*.firebaseapp.com; "
        "connect-src 'self' https://*.googleapis.com wss://*.firebaseio.com https://*.supabase.co; "
        "media-src 'self' data: blob:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    response.headers.pop("Server", None)
    # Cache static assets for 1 year
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response

from app import register_routes

with app.app_context():
    register_routes(app, bcrypt, login_manager, limiter)
    db.create_all()
    # Add missing columns (safe to re-run)
    with db.engine.connect() as conn:
        for col in [('groq_api_key', 'VARCHAR(200)')]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col[0]} {col[1]}"))
            except Exception:
                pass  # Column already exists
    # SQLite-specific optimizations
    if 'sqlite' in str(db.engine.url):
        with db.engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=False)
