from datetime import timedelta
import os

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("FLASK_SECRET_KEY environment variable is required. Copy .env.example to .env and set it.")

    _db_url = os.environ.get("DATABASE_URL")
    if _db_url and _db_url.startswith("postgresql"):
        if "sslmode" not in _db_url:
            sep = "&" if "?" in _db_url else "?"
            _db_url += f"{sep}sslmode=require"
        SQLALCHEMY_DATABASE_URI = _db_url
    else:
        SQLALCHEMY_DATABASE_URI = _db_url or f"sqlite:///{os.path.join(BASE_DIR, 'backend', 'scholrnet.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 5,
        'connect_args': {
            'connect_timeout': 5,
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
        }
    }
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB max upload

    # Session security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = True
    SESSION_PERMANENT = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # Rate limiting storage
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")

    # Firebase client config (injected into templates — these are client-safe)
    FIREBASE_CONFIG = {
        "apiKey": os.environ.get("FIREBASE_API_KEY", ""),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.environ.get("FIREBASE_APP_ID", ""),
    }

    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_STORAGE_KEY = os.environ.get("SUPABASE_STORAGE_KEY", "")

    TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")
    TURNSTILE_SITE_KEY = os.environ.get("TURNSTILE_SITE_KEY", "")

    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    APP_URL = os.environ.get("APP_URL", "http://localhost:5000")
