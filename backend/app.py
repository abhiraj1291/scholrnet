import os
import json
import random
import re
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

import bleach

from flask import render_template, request, jsonify, redirect, url_for, session, abort, Response, current_app
from flask_login import login_user, logout_user, login_required, current_user
from markupsafe import escape as escape_html

from config import Config
from models import db, User, Achievement, Project, Post, Comment, Ad, Opportunity, TeamRequest
from models import TeamApplicant, VerificationRequest, Mentor, MentorshipRequest, MentorInteraction
from models import Notification, ChatMessage, School, SchoolAnnouncement, Connection, UserLike, EventRegistration, Experience, Club, ClubMember, ClubJoinRequest

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

def send_email(to_email, subject, html_body):
    api_key = (os.environ.get('RESEND_API_KEY', '') or '').strip()
    if api_key:
        import http.client, ssl, json
        body = json.dumps({
            'from': 'ScholrNet <noreply@scholrnet.in>',
            'to': [to_email],
            'subject': subject,
            'html': html_body
        })
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection('api.resend.com', context=ctx, timeout=15)
        try:
            conn.request('POST', '/emails', body, {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            })
            resp = conn.getresponse()
            data = resp.read().decode()
            if resp.status == 200:
                print(f"EMAIL SENT via Resend: {json.loads(data).get('id', 'ok')}")
                return True
            else:
                print(f"EMAIL SEND FAILED ({resp.status}): {data}")
        except Exception as e:
            print(f"EMAIL SEND FAILED: {e}")
        finally:
            conn.close()
    print(f"EMAIL ({to_email}): {subject}\n{html_body}")
    return False

LOGO_B64 = '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'

def email_otp_body(name, otp, purpose):
    title = purpose
    return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<tr><td style="padding:32px 32px 24px;text-align:center">
<img src="data:image/png;base64,{LOGO_B64}" alt="ScholrNet" height="32" style="display:block;margin:0 auto 16px">
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a2744">{escape_html(title)}</h1>
<p style="margin:0 0 24px;font-size:14px;color:#5a6a7a">Hi {escape_html(name)},</p>
<div style="background:#f0f4ff;border-radius:12px;padding:20px;margin-bottom:24px">
<div style="font-size:12px;color:#5a6a7a;margin-bottom:8px">Your verification code</div>
<div style="font-size:36px;font-weight:900;color:#1a2744;letter-spacing:8px">{otp}</div>
<div style="font-size:12px;color:#5a6a7a;margin-top:8px">Expires in 10 minutes</div>
</div>
<p style="margin:0 0 4px;font-size:13px;color:#5a6a7a;line-height:1.5">If you didn't request this, please ignore this email.</p>
<p style="margin:0;font-size:13px;color:#5a6a7a">— ScholrNet Team</p>
</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#9aa6b5;border-top:1px solid #eef0f4">
ScholrNet — Academic Trust Network
</td></tr></table></td></tr></table></body></html>'''

def validate_file_type(f, allowed_extensions, allowed_mime_prefixes):
    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    if ext not in allowed_extensions:
        return False, f"File type .{ext} not allowed"
    # Check magic bytes via Pillow for images
    if ext in ('png', 'jpg', 'jpeg', 'gif', 'webp'):
        try:
            from PIL import Image
            img = Image.open(f)
            img.verify()
            f.seek(0)
        except Exception:
            return False, "Invalid image file"
    return True, ''

def register_routes(app, bcrypt, login_manager, limiter):
    supabase_url = current_app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = current_app.config.get("SUPABASE_STORAGE_KEY", "")
    supabase_bucket = "uploads"

    @app.before_request
    def csrf_protect():
        if request.is_json and request.content_length and request.content_length > 1024 * 1024:
            return jsonify({'error': 'Request too large'}), 413
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            origin = request.headers.get('Origin', '')
            referer = request.headers.get('Referer', '')
            allowed_hosts = ['scholrnet.in', 'www.scholrnet.in', 'localhost', '127.0.0.1']
            valid = False
            if origin:
                parsed = urlparse(origin)
                if parsed.hostname in allowed_hosts or (parsed.hostname and parsed.hostname.endswith('.vercel.app')):
                    valid = True
            if referer:
                parsed = urlparse(referer)
                if parsed.hostname in allowed_hosts or (parsed.hostname and parsed.hostname.endswith('.vercel.app')):
                    valid = True
            if not valid and (origin or referer):
                return jsonify({'error': 'Forbidden'}), 403

    @app.before_request
    def check_2fa():
        if current_user.is_authenticated and session.get('2fa_required'):
            endpoint = request.endpoint or ''
            allowed = ('verify_2fa', 'api_2fa_verify_login', 'logout', 'static')
            if not any(endpoint == a or endpoint.endswith('.' + a) for a in allowed):
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({'error': '2FA verification required'}), 401
                return redirect(url_for('verify_2fa'))

    import traceback, sys

    # Always ensure critical users table columns exist (needed for registration/login/etc.)
    try:
        from sqlalchemy import text, inspect
        inspector = inspect(db.engine)
        users_cols = [c['name'] for c in inspector.get_columns('users')]
        with db.engine.connect() as conn:
            if 'school_verified' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN school_verified BOOLEAN DEFAULT FALSE"))
            if 'verified_school_id' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN verified_school_id INTEGER REFERENCES schools(id)"))
            if 'totp_secret' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32) DEFAULT ''"))
            if 'totp_enabled' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE"))
            if 'totp_backup_codes' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN totp_backup_codes TEXT DEFAULT ''"))
            if 'email_verified' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))
            if 'email_verify_token' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verify_token VARCHAR(128) DEFAULT ''"))
            if 'reset_password_token' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(128) DEFAULT ''"))
            if 'reset_password_token_expires' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_password_token_expires VARCHAR(30) DEFAULT ''"))
            if 'email_otp' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_otp VARCHAR(6) DEFAULT ''"))
            if 'email_otp_expires' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_otp_expires TIMESTAMP"))
            if 'reset_otp' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_otp VARCHAR(6) DEFAULT ''"))
            if 'reset_otp_expires' not in users_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_otp_expires TIMESTAMP"))
            conn.commit()
    except Exception as e:
        print(f"AUTO-MIGRATE: users column migration failed: {e}")

    # Extended migrations (gated) — schools, ads, clubs, chat, etc.
    if os.environ.get('RUN_MIGRATIONS', '').lower() == 'true':
        try:
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            schools_cols = [c['name'] for c in inspector.get_columns('schools')]
            with db.engine.connect() as conn:
                if 'verification_code' not in schools_cols:
                    conn.execute(text("ALTER TABLE schools ADD COLUMN verification_code VARCHAR(8) DEFAULT ''"))
                if 'verified_by_email' not in schools_cols:
                    conn.execute(text("ALTER TABLE schools ADD COLUMN verified_by_email VARCHAR(200) DEFAULT ''"))
                try:
                    ads_cols = [c['name'] for c in inspector.get_columns('ads')]
                    if 'active' not in ads_cols:
                        conn.execute(text("ALTER TABLE ads ADD COLUMN active BOOLEAN DEFAULT TRUE"))
                    if 'target_role' not in ads_cols:
                        conn.execute(text("ALTER TABLE ads ADD COLUMN target_role VARCHAR(30) DEFAULT ''"))
                    if 'created_at' not in ads_cols:
                        conn.execute(text("ALTER TABLE ads ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
                except Exception:
                    print("AUTO-MIGRATE: ads table or columns may already exist, continuing")
                try:
                    chat_cols = [c['name'] for c in inspector.get_columns('chat_messages')]
                    if 'is_read' not in chat_cols:
                        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE"))
                except Exception:
                    print("AUTO-MIGRATE: chat_messages table may not exist yet, continuing")
                try:
                    vreq_cols = [c['name'] for c in inspector.get_columns('verification_requests')]
                    if 'school_id' not in vreq_cols:
                        conn.execute(text("ALTER TABLE verification_requests ADD COLUMN school_id INTEGER REFERENCES schools(id)"))
                except Exception:
                    print("AUTO-MIGRATE: verification_requests table may not exist yet, continuing")
                try:
                    posts_cols = [c['name'] for c in inspector.get_columns('posts')]
                    if 'club_id' not in posts_cols:
                        conn.execute(text("ALTER TABLE posts ADD COLUMN club_id INTEGER REFERENCES clubs(id)"))
                except Exception:
                    print("AUTO-MIGRATE: posts table migration failed, continuing")
                conn.commit()
                conn.execute(text("CREATE TABLE IF NOT EXISTS clubs (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, description TEXT DEFAULT '', bio TEXT DEFAULT '', is_private BOOLEAN DEFAULT FALSE, owner_id INTEGER REFERENCES users(id) NOT NULL, avatar VARCHAR(300) DEFAULT '', cover_url VARCHAR(500) DEFAULT '', created_at VARCHAR(30) DEFAULT '', member_count INTEGER DEFAULT 1, tags VARCHAR(500) DEFAULT '')"))
                conn.execute(text("CREATE TABLE IF NOT EXISTS club_members (id SERIAL PRIMARY KEY, club_id INTEGER REFERENCES clubs(id) NOT NULL, user_id INTEGER REFERENCES users(id) NOT NULL, role VARCHAR(20) DEFAULT 'member', joined_at VARCHAR(30) DEFAULT '')"))
                conn.execute(text("CREATE TABLE IF NOT EXISTS club_join_requests (id SERIAL PRIMARY KEY, club_id INTEGER REFERENCES clubs(id) NOT NULL, user_id INTEGER REFERENCES users(id) NOT NULL, status VARCHAR(20) DEFAULT 'pending', requested_at VARCHAR(30) DEFAULT '', responded_at VARCHAR(30) DEFAULT '')"))
                try:
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_club_member ON club_members(club_id, user_id)"))
                except Exception:
                    pass
                try:
                    clubs_cols2 = [c['name'] for c in inspector.get_columns('clubs')]
                    if 'is_private' not in clubs_cols2:
                        conn.execute(text("ALTER TABLE clubs ADD COLUMN is_private BOOLEAN DEFAULT FALSE"))
                    if 'bio' not in clubs_cols2:
                        conn.execute(text("ALTER TABLE clubs ADD COLUMN bio TEXT DEFAULT ''"))
                except Exception:
                    print("AUTO-MIGRATE: clubs columns migration, continuing")
                conn.commit()
                try:
                    conn.execute(text("CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), user_name VARCHAR(100) DEFAULT '', action VARCHAR(50) NOT NULL, target_type VARCHAR(50) DEFAULT '', target_id INTEGER, detail TEXT DEFAULT '', ip_address VARCHAR(45) DEFAULT '', timestamp VARCHAR(30) DEFAULT '')"))
                except Exception:
                    print("AUTO-MIGRATE: audit_logs table creation, continuing")
                conn.commit()
        except Exception as e:
            print(f"AUTO-MIGRATE: {e}, continuing")

    @app.context_processor
    def inject_globals():
        try:
            if current_user.is_authenticated and (current_user.role in ('admin', 'super_admin') or not current_user.school_verified):
                return {'schools': get_all_schools()}
        except Exception:
            pass
        return {'schools': []}

    @app.errorhandler(404)
    def not_found(e):
        return render_template('error.html', code=404, title='Page Not Found', message='The page you are looking for does not exist.', emoji='🔍'), 404

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('error.html', code=403, title='Access Denied', message='You do not have permission to access this page.', emoji='🚫'), 403

    @app.errorhandler(500)
    def server_error(e):
        err = traceback.format_exc()
        print("SERVER ERROR:", err)
        return render_template('error.html', code=500, title='Something Went Wrong', message=f'{err[:500]}', emoji='⚠️'), 500

    MIME_TYPES = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'mp4': 'video/mp4',
        'mov': 'video/quicktime', 'svg': 'image/svg+xml',
    }

    def _is_verified(u):
        return u and (u.role in ('admin', 'super_admin') or u.email == 'abhiraj29in@gmail.com')

    def _save_to_supabase(file_data, bucket, path, content_type=None):
        if not supabase_url or not supabase_key:
            return None
        if not content_type:
            ext = path.rsplit('.', 1)[-1].lower() if '.' in path else ''
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')
        import urllib.request
        req = urllib.request.Request(
            f"{supabase_url}/storage/v1/object/{bucket}/{path}",
            data=file_data,
            headers={
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": content_type,
            },
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=25)
            return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
        except Exception:
            return None

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return User.query.get(int(user_id))
        except (ValueError, TypeError):
            return None

    @app.before_request
    def check_pending_role():
        if current_user.is_authenticated and current_user.role == 'pending':
            allowed = ['choose_role', 'api_set_role', 'logout', 'static', 'verify_email_otp', 'api_resend_verify_otp']
            if request.endpoint not in allowed and not request.path.startswith('/static/'):
                return redirect(url_for('choose_role'))
        # Redirect unverified users to verify page (only if explicitly False, not NULL for old users)
        if current_user.is_authenticated and current_user.email_verified is False:
            allowed = ['verify_email_otp', 'api_resend_verify_otp', 'logout', 'static', 'api_delete_account']
            if request.endpoint not in allowed and not request.path.startswith('/static/'):
                return redirect(url_for('verify_email_otp'))
        # Redirect users without a username to choose-username (skip for certain endpoints)
        if current_user.is_authenticated and not current_user.username and current_user.role != 'pending' and current_user.email_verified:
            allowed = ['choose_username', 'api_username_check', 'api_username_set', 'verify_email_otp', 'api_resend_verify_otp', 'logout', 'static']
            if request.endpoint not in allowed and not request.path.startswith('/static/'):
                return redirect(url_for('choose_username'))

    def get_gemini_client():
        api_key = app.config.get("GEMINI_API_KEY", "")
        if not api_key or api_key == "MY_GEMINI_API_KEY":
            return None
        try:
            from google import genai
            return genai.Client(api_key=api_key)
        except Exception:
            return None

    def jnow():
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    def short_ts():
        return "Just now"

    def active_ads():
        try:
            q = Ad.query.filter_by(active=True)
            if current_user.is_authenticated and current_user.role:
                q = q.filter((Ad.target_role == '') | (Ad.target_role == current_user.role))
            return q.order_by(Ad.id.desc()).limit(20).all()
        except Exception:
            return Ad.query.limit(20).all()

    def get_all_posts():
        return Post.query.order_by(Post.id.desc()).limit(50).all()

    def get_all_opportunities():
        return Opportunity.query.limit(50).all()

    def get_all_team_requests():
        return TeamRequest.query.order_by(TeamRequest.id.desc()).limit(50).all()

    def get_all_mentors():
        return Mentor.query.limit(50).all()

    def get_all_schools():
        return School.query.limit(50).all()

    def get_user_notifications(user_id):
        return Notification.query.filter_by(user_id=user_id).order_by(Notification.id.desc()).limit(20).all()

    def audit_log(action, target_type=None, target_id=None, detail=''):
        from flask import request
        log = AuditLog(
            user_id=current_user.id if current_user.is_authenticated else None,
            user_name=current_user.name if current_user.is_authenticated else 'anonymous',
            action=action, target_type=target_type, target_id=target_id,
            detail=detail, ip_address=request.remote_addr or '',
            timestamp=short_ts()
        )
        db.session.add(log)
        db.session.flush()

    # ---- AUTH ROUTES ----
    @app.route('/')
    def index():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        return render_template('landing.html')

    @app.route('/login', methods=['GET', 'POST'])
    @limiter.limit("30 per 15 minutes", methods=['POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        if request.method == 'POST':
            email = request.form.get('email', '').strip().lower()
            password = request.form.get('password', '')
            if len(email) > 254 or len(password) > 128:
                return render_template('auth/login.html', error="Invalid credentials")
            user = User.query.filter_by(email=email).first()
            if user and user.password_hash != '*firebase*':
                try:
                    if bcrypt.check_password_hash(user.password_hash, password):
                        login_user(user)
                        session.permanent = True
                        if user.totp_enabled:
                            session['2fa_required'] = True
                            return redirect(url_for('verify_2fa'))
                        return redirect(url_for('dashboard'))
                except Exception:
                    print("LOGIN ERROR: bcrypt check failed for user", email)
            return render_template('auth/login.html', error="Invalid email or password")
        return render_template('auth/login.html',
            firebase_config=app.config.get("FIREBASE_CONFIG", {})
        )

    @app.route('/api/auth/firebase', methods=['POST'])
    @limiter.limit("20 per 15 minutes")
    def api_firebase_auth():
        data = request.json
        if not data or not data.get('email'):
            return jsonify({'success': False, 'error': 'Missing email'}), 400
        email = data['email'].strip().lower()
        if len(email) > 254:
            return jsonify({'success': False, 'error': 'Invalid email'}), 400
        name = sanitize_text(data.get('name', email.split('@')[0]), 100)
        photo = sanitize_text(data.get('photo', ''), 500)
        uid = sanitize_text(data.get('uid', ''), 128)
        provider = sanitize_text(data.get('provider', 'firebase'), 50)

        # Optional: verify Firebase ID token if firebase-admin is configured
        id_token = sanitize_text(data.get('idToken', ''), 2000)
        if id_token and 'FIREBASE_SERVICE_ACCOUNT' in os.environ:
            try:
                import firebase_admin
                if not firebase_admin._apps:
                    cred_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
                    if cred_path and os.path.exists(cred_path):
                        cred = firebase_admin.credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(cred)
                if firebase_admin._apps:
                    decoded = firebase_admin.auth.verify_id_token(id_token)
                    if decoded.get('email', '').lower() != email:
                        return jsonify({'success': False, 'error': 'Token email mismatch'}), 403
            except Exception:
                pass  # Fall through if firebase-admin not fully configured

        user = User.query.filter_by(email=email).first()
        if not user:
            avatar = "".join(p[0] for p in name.strip().split() if p)[:2].upper() or "FB"
            user = User(
                name=name, email=email, password_hash='*firebase*',
                school='', role='pending', avatar=avatar,
                grade='', bio='Joined via ' + provider,
                avatar_url=photo, email_verified=True
            )
            db.session.add(user)
            db.session.commit()
            login_user(user)
            session.permanent = True
            return jsonify({'success': True, 'redirect': '/choose-role', 'new_user': True})
        else:
            if photo and not user.avatar_url:
                user.avatar_url = photo
                db.session.commit()
        login_user(user)
        session.permanent = True
        return jsonify({'success': True, 'redirect': '/dashboard'})

    @app.route('/register', methods=['GET', 'POST'])
    @limiter.limit("5 per 15 minutes")
    def register():
        try:
            if current_user.is_authenticated:
                return redirect(url_for('dashboard'))
            turnstile_key = current_app.config.get('TURNSTILE_SECRET_KEY', '')
            if request.method == 'POST':
                if turnstile_key:
                    token = request.form.get('cf-turnstile-response', '')
                    if not token:
                        return render_template('auth/register.html', error="Please complete the security check", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                    try:
                        import urllib.request, urllib.parse, json
                        verify = urllib.request.Request('https://challenges.cloudflare.com/turnstile/v0/siteverify',
                            data=urllib.parse.urlencode({'secret': turnstile_key, 'response': token}).encode(),
                            headers={'Content-Type': 'application/x-www-form-urlencoded'})
                        with urllib.request.urlopen(verify, timeout=10) as resp:
                            result = json.loads(resp.read())
                            if not result.get('success'):
                                return render_template('auth/register.html', error="Security check failed. Please try again.", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                    except Exception:
                        return render_template('auth/register.html', error="Security check unavailable. Please try again.", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                name = sanitize_text(request.form.get('name', ''), 100)
                email = request.form.get('email', '').strip().lower()
                password = request.form.get('password', '')
                school = sanitize_text(request.form.get('school', ''), 200)
                role = request.form.get('role', 'student')
                username = request.form.get('username', '').strip().lower()

                if not name or not email or not password:
                    return render_template('auth/register.html', error="All fields are required", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                if len(email) > 254:
                    return render_template('auth/register.html', error="Email too long", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                if len(password) < 8:
                    return render_template('auth/register.html', error="Password must be at least 8 characters", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                if len(password) > 128:
                    return render_template('auth/register.html', error="Password too long", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                if role not in ('student', 'teacher', 'mentor', 'counselor'):
                    role = 'student'
                existing = User.query.filter_by(email=email).first()
                if existing:
                    if existing.email_verified:
                        return render_template('auth/register.html', error="Email already registered", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                    import secrets, random
                    from datetime import datetime, timedelta
                    otp = str(random.randint(100000, 999999))
                    existing.email_otp = otp
                    existing.email_otp_expires = datetime.utcnow() + timedelta(minutes=10)
                    db.session.commit()
                    send_email(email, 'Verify your ScholrNet email',
                        email_otp_body(existing.name, otp, 'Verify Your Email'))
                    login_user(existing)
                    session.permanent = True
                    session['verify_email'] = True
                    return redirect(url_for('verify_email_otp'))
                if username:
                    if not re.match(r'^[a-z0-9_]{3,30}$', username):
                        return render_template('auth/register.html', error="Username: 3-30 chars, letters, numbers, underscores only", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                    if User.query.filter_by(username=username).first():
                        return render_template('auth/register.html', error="Username already taken", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
                hashed = bcrypt.generate_password_hash(password).decode('utf-8')
                avatar = "".join(p[0] for p in name.strip().split() if p)[:2].upper() or "ST"
                import secrets, random
                otp = str(random.randint(100000, 999999))
                from datetime import datetime, timedelta
                otp_expires = datetime.utcnow() + timedelta(minutes=10)
                user = User(name=name, email=email, password_hash=hashed, school=school, role=role,
                            avatar=avatar, grade="Class XII", bio="Active ScholrNet Member",
                            username=username or None,
                            email_otp=otp, email_otp_expires=otp_expires)
                db.session.add(user)
                db.session.commit()
                send_email(email, 'Verify your ScholrNet email',
                    email_otp_body(name, otp, 'Verify Your Email'))
                login_user(user)
                session.permanent = True
                session['verify_email'] = True
                return redirect(url_for('verify_email_otp'))
            return render_template('auth/register.html', turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
        except Exception as e:
            import traceback
            traceback.print_exc()
            return render_template('auth/register.html', error=f"Registration error: {e}", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))

    @app.route('/verify-email-otp', methods=['GET', 'POST'])
    @login_required
    def verify_email_otp():
        if current_user.email_verified:
            return redirect(url_for('dashboard'))
        if request.method == 'POST':
            try:
                otp = request.form.get('otp', '').strip()
                if not otp or not otp.isdigit() or len(otp) != 6:
                    return render_template('auth/verify_otp.html', error='Enter a valid 6-digit code')
                from datetime import datetime
                expires = current_user.email_otp_expires
                if isinstance(expires, str):
                    expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
                if current_user.email_otp != otp or not expires or datetime.utcnow() > expires:
                    return render_template('auth/verify_otp.html', error='Invalid or expired code')
                current_user.email_verified = True
                current_user.email_otp = ''
                current_user.email_otp_expires = None
                db.session.commit()
                session.pop('verify_email', None)
                if not current_user.username:
                    return redirect(url_for('choose_username'))
                return redirect(url_for('dashboard'))
            except Exception as e:
                import traceback; traceback.print_exc()
                return render_template('auth/verify_otp.html', error=f'Verification error: {e}')
        return render_template('auth/verify_otp.html', email=current_user.email, otp=current_user.email_otp)

    @app.route('/api/verify-email/resend-otp', methods=['POST'])
    @login_required
    @limiter.limit("3 per 5 minutes")
    def api_resend_verify_otp():
        if current_user.email_verified:
            return jsonify({'success': False, 'error': 'Already verified'}), 400
        from datetime import datetime, timedelta
        last = session.get('resend_otp_at', 0)
        if isinstance(last, (int, float)) and last > 0 and datetime.utcnow().timestamp() - last < 30:
            return jsonify({'success': False, 'error': 'Wait 30 seconds before resending'}), 429
        import random
        otp = str(random.randint(100000, 999999))
        current_user.email_otp = otp
        current_user.email_otp_expires = datetime.utcnow() + timedelta(minutes=10)
        db.session.commit()
        session['resend_otp_at'] = datetime.utcnow().timestamp()
        send_email(current_user.email, 'Verify your ScholrNet email',
            email_otp_body(current_user.name, otp, 'Verify Your Email'))
        return jsonify({'success': True, 'otp': otp})

    @app.route('/verify-email/<token>')
    def verify_email(token):
        user = User.query.filter(User.email_verify_token != '', User.email_verified == False).first()
        if not user:
            return render_template('error.html', code=400, title='Invalid Link', message='This verification link is invalid or expired.', emoji='🔗')
        import bcrypt as bc
        for u in User.query.filter(User.email_verify_token != '', User.email_verified == False).all():
            try:
                if bc.check_password_hash(u.email_verify_token, token):
                    u.email_verified = True
                    u.email_verify_token = ''
                    db.session.commit()
                    login_user(u)
                    return render_template('auth/verify_success.html')
            except Exception:
                continue
        return render_template('error.html', code=400, title='Invalid Link', message='This verification link is invalid or expired.', emoji='🔗')

    @app.route('/forgot-password', methods=['GET', 'POST'])
    @limiter.limit("5 per 15 minutes")
    def forgot_password():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        if request.method == 'POST':
            email = request.form.get('email', '').strip().lower()
            user = User.query.filter_by(email=email).first()
            if user:
                import random
                from datetime import datetime, timedelta
                otp = str(random.randint(100000, 999999))
                user.reset_otp = otp
                user.reset_otp_expires = datetime.utcnow() + timedelta(minutes=10)
                db.session.commit()
                send_email(email, 'Reset your ScholrNet password',
                    email_otp_body(user.name, otp, 'Reset Your Password'))
                session['reset_email'] = email
                return redirect(url_for('reset_password_otp'))
            return render_template('auth/forgot_sent.html')
        return render_template('auth/forgot.html')

    @app.route('/reset-password-otp', methods=['GET', 'POST'])
    @limiter.limit("10 per 15 minutes")
    def reset_password_otp():
        email = session.get('reset_email', '')
        if not email:
            return redirect(url_for('forgot_password'))
        if request.method == 'POST':
            try:
                otp = request.form.get('otp', '').strip()
                password = request.form.get('password', '')
                if not otp or not otp.isdigit() or len(otp) != 6:
                    return render_template('auth/reset_otp.html', error='Enter a valid 6-digit code', email=email)
                if len(password) < 8 or len(password) > 128:
                    return render_template('auth/reset_otp.html', error='Password must be 8-128 characters', email=email)
                user = User.query.filter_by(email=email).first()
                if not user:
                    return redirect(url_for('forgot_password'))
                from datetime import datetime
                expires = user.reset_otp_expires
                if isinstance(expires, str):
                    expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
                if user.reset_otp != otp or not expires or datetime.utcnow() > expires:
                    return render_template('auth/reset_otp.html', error='Invalid or expired code', email=email)
                user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
                user.reset_otp = ''
                user.reset_otp_expires = None
                db.session.commit()
                session.pop('reset_email', None)
                return render_template('auth/reset_success.html')
            except Exception as e:
                import traceback; traceback.print_exc()
                return render_template('auth/reset_otp.html', error=f'Error: {e}', email=email)
        return render_template('auth/reset_otp.html', email=email)

    @app.route('/reset-password/<token>', methods=['GET', 'POST'])
    @limiter.limit("5 per 15 minutes")
    def reset_password(token):
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        if request.method == 'POST':
            password = request.form.get('password', '')
            if len(password) < 8 or len(password) > 128:
                return render_template('auth/reset.html', error='Password must be 8-128 characters', token=token)
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc).isoformat()
            for u in User.query.filter(User.reset_password_token != '').all():
                try:
                    if bcrypt.check_password_hash(u.reset_password_token, token):
                        if u.reset_password_token_expires and u.reset_password_token_expires > now:
                            u.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
                            u.reset_password_token = ''
                            u.reset_password_token_expires = ''
                            db.session.commit()
                            return render_template('auth/reset_success.html')
                except Exception:
                    continue
            return render_template('auth/reset.html', error='Invalid or expired reset link', token=token)
        return render_template('auth/reset.html', token=token)

    @app.route('/choose-role')
    @login_required
    def choose_role():
        if current_user.role != 'pending':
            return redirect(url_for('dashboard'))
        return render_template('choose_role.html',
            user=current_user,
            notifications=[]
        )

    @app.route('/api/profile/role', methods=['POST'])
    @login_required
    def api_set_role():
        data = request.json
        role = data.get('role', '')
        if role not in ('student', 'teacher', 'mentor'):
            return jsonify({'success': False, 'error': 'Invalid role'}), 400
        current_user.role = role
        db.session.commit()
        return jsonify({'success': True, 'redirect': '/dashboard'})

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('login'))

    # ---- PAGE ROUTES ----
    @app.route('/dashboard')
    @login_required
    def dashboard():
        import traceback
        try:
            return render_template('feed.html',
                user=current_user,
                posts=get_all_posts(),
                ads=active_ads(),
                schools=get_all_schools(),
                opportunities=get_all_opportunities(),
                team_requests=get_all_team_requests(),
                mentors=get_all_mentors(),
                achievements=Achievement.query.filter_by(user_id=current_user.id).order_by(Achievement.id.desc()).all(),
                projects=Project.query.filter_by(user_id=current_user.id).order_by(Project.id.desc()).all(),
                verification_requests=VerificationRequest.query.order_by(VerificationRequest.id.desc()).limit(200).all() if current_user.role in ('admin', 'super_admin') else [],
                notifications=get_user_notifications(current_user.id),
                registered_event_ids=[r.announce_id for r in EventRegistration.query.filter_by(user_id=current_user.id).all()],
                connections=[c.connected_user_id for c in Connection.query.filter_by(user_id=current_user.id).all()]
            )
        except Exception as e:
            print(f"DASHBOARD ERROR: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    @app.route('/profile')
    @login_required
    def profile_page():
        return redirect(f'/profile/{current_user.id}')

    @app.route('/profile/<int:user_id>')
    @login_required
    def profile_by_id(user_id):
        puser = User.query.get(user_id)
        if not puser:
            abort(404)
        friend_status = 'none'
        conn = Connection.query.filter(
            ((Connection.user_id == current_user.id) & (Connection.connected_user_id == user_id)) |
            ((Connection.user_id == user_id) & (Connection.connected_user_id == current_user.id))
        ).first()
        if conn:
            if conn.status == 'accepted':
                friend_status = 'friends'
            elif conn.user_id == current_user.id:
                friend_status = 'pending_sent'
            else:
                friend_status = 'pending_received'
        is_own = (user_id == current_user.id)
        return render_template('profile.html',
            user=current_user,
            puser=puser,
            is_own=is_own,
            friend_status=friend_status,
            is_verified=_is_verified(puser),
            achievements=Achievement.query.filter_by(user_id=user_id).order_by(Achievement.id.desc()).all(),
            projects=Project.query.filter_by(user_id=user_id).order_by(Project.id.desc()).all(),
            posts=Post.query.filter_by(author_id=user_id).order_by(Post.id.desc()).all(),
            ads=active_ads(),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/u/<username>')
    @login_required
    def profile_by_username(username):
        puser = User.query.filter_by(username=username).first()
        if not puser:
            abort(404)
        return redirect(url_for('profile_by_id', user_id=puser.id))

    @app.route('/share/<username>')
    def share_profile(username):
        puser = User.query.filter_by(username=username).first()
        if not puser:
            abort(404)
        achievements = Achievement.query.filter_by(user_id=puser.id).order_by(Achievement.id.desc()).all()
        projects = Project.query.filter_by(user_id=puser.id).order_by(Project.id.desc()).all()
        experiences = Experience.query.filter_by(user_id=puser.id).order_by(Experience.id.desc()).all()
        return render_template('share.html',
            puser=puser,
            achievements=achievements,
            projects=projects,
            experiences=experiences,
            is_verified=_is_verified(puser)
        )

    @app.route('/post/<int:post_id>')
    def single_post(post_id):
        post = Post.query.get_or_404(post_id)
        author = User.query.get(post.author_id) if post.author_id else None
        return render_template('post.html',
            post=post,
            author=author,
            is_verified=_is_verified(author) if author else False
        )

    @app.route('/public')
    def public_timeline():
        posts = Post.query.order_by(Post.id.desc()).limit(50).all()
        enriched = []
        for p in posts:
            author = User.query.get(p.author_id) if p.author_id else None
            enriched.append({
                'id': p.id,
                'title': p.title,
                'content': p.content,
                'image_url': p.image_url,
                'timestamp': p.timestamp,
                'author_name': p.author_name,
                'author_school': p.author_school,
                'author_username': author.username if author else None,
                'author_avatar_url': author.avatar_url if author else '',
                'author_verified': _is_verified(author) if author else False
            })
        return render_template('public.html', posts=enriched)

    @app.route('/choose-username')
    @login_required
    def choose_username():
        if current_user.username:
            return redirect(url_for('dashboard'))
        return render_template('choose_username.html',
            user=current_user,
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/api/username/check', methods=['GET'])
    def api_username_check():
        u = request.args.get('u', '').strip().lower()
        if not u:
            return jsonify({'available': False, 'error': 'Empty username'})
        if not re.match(r'^[a-z0-9_]{3,30}$', u):
            return jsonify({'available': False, 'error': '3-30 chars, letters, numbers, underscores only'})
        taken = User.query.filter_by(username=u).first() is not None
        return jsonify({'available': not taken})

    @app.route('/api/username/set', methods=['POST'])
    @login_required
    def api_username_set():
        data = request.json or {}
        u = data.get('username', '').strip().lower()
        if not u:
            return jsonify({'success': False, 'error': 'Username is required'}), 400
        if not re.match(r'^[a-z0-9_]{3,30}$', u):
            return jsonify({'success': False, 'error': '3-30 chars, letters, numbers, underscores only'}), 400
        existing = User.query.filter_by(username=u).first()
        if existing and existing.id != current_user.id:
            return jsonify({'success': False, 'error': 'Username already taken'}), 400
        current_user.username = u
        db.session.commit()
        return jsonify({'success': True, 'username': u})

    @app.route('/opportunities')
    @login_required
    def opportunities_page():
        return render_template('opportunities.html',
            user=current_user,
            opportunities=get_all_opportunities(),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/teams')
    @login_required
    def teams_page():
        return render_template('teams.html',
            user=current_user,
            team_requests=get_all_team_requests(),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/mentors')
    @login_required
    def mentors_page():
        return render_template('mentors.html',
            user=current_user,
            mentors=get_all_mentors(),
            mentorship_requests=MentorshipRequest.query.filter_by(student_id=current_user.id).order_by(MentorshipRequest.id.desc()).all(),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/analytics')
    @login_required
    def analytics_page():
        return render_template('analytics.html',
            user=current_user,
            achievements=Achievement.query.filter_by(user_id=current_user.id).all(),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/advisor')
    @login_required
    def advisor_page():
        return render_template('advisor.html',
            user=current_user,
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/clubs')
    @login_required
    def clubs_page():
        return render_template('clubs.html',
            user=current_user,
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/club/<int:club_id>')
    @login_required
    def club_detail_page(club_id):
        club = Club.query.get_or_404(club_id)
        owner = User.query.get(club.owner_id)
        is_member = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first() is not None
        user_role = None
        join_request_pending = False
        if is_member:
            mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
            user_role = mem.role if mem else None
        else:
            pending_req = ClubJoinRequest.query.filter_by(club_id=club_id, user_id=current_user.id, status='pending').first()
            join_request_pending = pending_req is not None
        members = ClubMember.query.filter_by(club_id=club_id).order_by(ClubMember.id.asc()).all()
        member_ids = [m.user_id for m in members]
        user_map = {}
        if member_ids:
            users = User.query.filter(User.id.in_(member_ids)).all()
            user_map = {u.id: u for u in users}
        return render_template('club_detail.html',
            club=club, owner=owner, is_member=is_member, user_role=user_role,
            join_request_pending=join_request_pending,
            members=members, user_map=user_map,
            user=current_user,
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/search')
    @login_required
    def search_page():
        return render_template('search.html',
            user=current_user,
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/chat')
    @login_required
    def chat_page():
        return render_template('chat.html',
            user=current_user,
            firebase_config=app.config.get("FIREBASE_CONFIG", {}),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/school-desk')
    @login_required
    def school_desk():
        if current_user.role not in ('admin', 'super_admin'):
            return redirect(url_for('dashboard'))
        return render_template('school.html',
            user=current_user,
            schools=get_all_schools(),
            verification_requests=VerificationRequest.query.order_by(VerificationRequest.id.desc()).limit(200).all(),
            notifications=get_user_notifications(current_user.id)
        )

    @app.route('/admin-panel')
    @login_required
    def admin_panel():
        if current_user.role != 'super_admin':
            return redirect(url_for('dashboard'))
        return render_template('admin_panel.html',
            user=current_user,
            posts=get_all_posts(),
            ads=active_ads(),
            schools=get_all_schools(),
            notifications=get_user_notifications(current_user.id)
        )

    # ---- API ENDPOINTS ----

    @app.route('/api/post/create', methods=['POST'])
    @login_required
    @limiter.limit("30 per minute")
    def api_create_post():
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form
            uploaded = request.files.getlist('files')
            image_urls = []
            for f in uploaded:
                if f and f.filename:
                    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
                    allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov'}
                    if ext in allowed_ext:
                        safe_name = f"{uuid.uuid4().hex[:16]}_{current_user.id}.{ext}"
                        url = _save_to_supabase(f.read(), 'uploads', safe_name)
                        if url:
                            image_urls.append(url)
            image_url = '|||'.join(image_urls)
        else:
            data = request.json or {}
            image_url = sanitize_text(data.get('imageUrl', ''), 500)
        tags_raw = data.get('tags', [])
        if isinstance(tags_raw, str):
            tags_raw = [sanitize_text(t, 50) for t in tags_raw.split(',') if t.strip()]
        elif isinstance(tags_raw, list):
            tags_raw = [sanitize_text(str(t), 50) for t in tags_raw if t]
        club_id = data.get('club_id', type=int) if isinstance(data, dict) else None
        if club_id:
            is_member = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
            if not is_member:
                return jsonify({'error': 'You are not a member of this club'}), 403
        post = Post(
            author_id=current_user.id,
            author_name=sanitize_text(data.get('author_name', current_user.name), 100),
            author_avatar=sanitize_text(data.get('author_avatar', current_user.avatar), 50),
            author_school=sanitize_text(data.get('author_school', current_user.school), 200),
            type=sanitize_text(data.get('type', 'achievement'), 50),
            title=sanitize_text(data.get('title', ''), 200),
            content=sanitize_text(data.get('content', ''), MAX_CONTENT_LEN),
            badge_text=sanitize_text(data.get('badge', data.get('badgeText', '')), 100),
            likes=0,
            tags=json.dumps(tags_raw[:20]),
            timestamp=short_ts(),
            video_url=sanitize_text(data.get('video_url', data.get('videoUrl', '')), 500) if (data.get('video_url') or data.get('videoUrl', '')).startswith(('http://','https://')) else '',
            image_url=image_url,
            club_id=club_id
        )
        db.session.add(post)
        db.session.commit()
        # Notify friends about new post (bulk insert for serverless perf)
        try:
            friend_ids = [c.user_id for c in Connection.query.filter(
                Connection.connected_user_id == current_user.id, Connection.status == 'accepted').all()]
            friend_ids += [c.connected_user_id for c in Connection.query.filter(
                Connection.user_id == current_user.id, Connection.status == 'accepted').all()]
            friend_ids = set(friend_ids)
            if friend_ids:
                now = short_ts()
                title = sanitize_text(current_user.name, 100) + " created a new post"
                for fid in friend_ids:
                    db.session.add(Notification(
                        user_id=fid, title=title, type='friend_post',
                        from_user=current_user.name, timestamp=now
                    ))
                db.session.commit()
        except Exception:
            db.session.rollback()
        print("POST CREATED: id=%d image_url=%s" % (post.id, post.image_url))
        return jsonify({'success': True, 'post': {
            'id': post.id, 'title': post.title, 'content': post.content, 'likes': post.likes,
            'author_name': post.author_name, 'author_avatar': post.author_avatar,
            'badge_text': post.badge_text, 'timestamp': post.timestamp
        }})

    @app.route('/api/post/<int:post_id>/like', methods=['POST'])
    @login_required
    @limiter.limit("30 per minute")
    def api_like_post(post_id):
        existing = UserLike.query.filter_by(user_id=current_user.id, post_id=post_id).first()
        post = Post.query.get_or_404(post_id)
        if existing:
            db.session.delete(existing)
            post.likes = max(0, post.likes - 1)
            liked = False
        else:
            ul = UserLike(user_id=current_user.id, post_id=post_id)
            db.session.add(ul)
            post.likes = (post.likes or 0) + 1
            liked = True
        db.session.commit()
        return jsonify({'success': True, 'likes_count': post.likes, 'liked': liked})

    @app.route('/api/post/<int:post_id>/comment', methods=['POST'])
    @login_required
    @limiter.limit("30 per minute")
    def api_comment_post(post_id):
        data = request.json or {}
        comment = Comment(
            post_id=post_id,
            author=sanitize_text(data.get('author', current_user.name), 100),
            avatar=sanitize_text(data.get('avatar', current_user.avatar), 50),
            text=sanitize_text(data.get('text', ''), 2000),
            timestamp=short_ts()
        )
        db.session.add(comment)
        # Notify post author
        post = Post.query.get(post_id)
        if post and post.author_id and post.author_id != current_user.id:
            n = Notification(user_id=post.author_id,
                title=f"{sanitize_text(current_user.name, 100)} commented on your post",
                type="comment", from_user=current_user.name)
            db.session.add(n)
        db.session.commit()
        return jsonify({'success': True, 'comment': {
            'id': comment.id, 'author': {'name': comment.author, 'avatar': comment.avatar},
            'text': comment.text, 'timestamp': comment.timestamp
        }})

    @app.route('/api/post/<int:post_id>/comments', methods=['GET'])
    @login_required
    def api_get_comments(post_id):
        comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.id.asc()).all()
        return jsonify({'comments': [{'id': c.id, 'author': {'name': c.author, 'avatar': c.avatar}, 'text': c.text, 'timestamp': c.timestamp} for c in comments]})

    @app.route('/api/post/<int:post_id>/delete', methods=['POST'])
    @login_required
    def api_delete_post(post_id):
        post = Post.query.get_or_404(post_id)
        if current_user.role != 'super_admin' and post.author_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        Comment.query.filter_by(post_id=post_id).delete()
        UserLike.query.filter_by(post_id=post_id).delete()
        db.session.delete(post)
        db.session.commit()
        audit_log('delete_post', 'post', post_id)
        return jsonify({'success': True})

    @app.route('/api/achievement/create', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_add_achievement():
        data = request.json or {}
        ach = Achievement(
            user_id=current_user.id,
            title=sanitize_text(data.get('title', ''), 200),
            description=sanitize_text(data.get('description', ''), 2000),
            category=sanitize_text(data.get('category', 'Excellence'), 100),
            institution=sanitize_text(data.get('institution', ''), 200),
            year=sanitize_text(str(data.get('year', '')), 10),
            certificate_file=sanitize_text(data.get('certificateFile', ''), 500),
            verification_status='NotVerified'
        )
        db.session.add(ach)
        db.session.commit()
        return jsonify({'success': True, 'achievement': {'id': ach.id, 'title': ach.title, 'category': ach.category, 'institution': ach.institution, 'year': ach.year, 'verification_status': ach.verification_status}})

    @app.route('/api/achievement/<int:ach_id>/delete', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_delete_achievement(ach_id):
        ach = Achievement.query.get_or_404(ach_id)
        if ach.user_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        audit_log('delete_achievement', 'achievement', ach_id, f'title={ach.title}')
        db.session.delete(ach)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/achievement/<int:ach_id>/verify-request', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_request_achievement_verify(ach_id):
        ach = Achievement.query.get_or_404(ach_id)
        if ach.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        school_id = data.get('school_id', current_user.verified_school_id)
        if not school_id:
            return jsonify({'error': 'No school selected for verification'}), 400
        existing = VerificationRequest.query.filter_by(user_id=current_user.id, achievement_title=ach.title, status='pending').first()
        if existing:
            return jsonify({'error': 'A verification request for this achievement is already pending'}), 400
        vreq = VerificationRequest(
            user_id=current_user.id,
            student_name=current_user.name,
            student_school=current_user.school,
            school_id=school_id,
            achievement_title=ach.title,
            category=ach.category,
            institution=ach.institution,
            year=ach.year,
            details=ach.description,
            status='pending',
            requested_at=jnow()
        )
        db.session.add(vreq)
        db.session.commit()
        return jsonify({'success': True, 'request': {'id': vreq.id, 'status': vreq.status}})

    @app.route('/api/project/create', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_add_project():
        data = request.json or {}
        proj = Project(
            user_id=current_user.id,
            title=sanitize_text(data.get('title', ''), 200),
            description=sanitize_text(data.get('description', ''), 5000),
            collaborators=sanitize_text(data.get('collaborators', ''), 1000),
            link=sanitize_text(data.get('link', ''), 500),
            skills=sanitize_text(data.get('skills', ''), 1000),
            verification_status='NotVerified'
        )
        db.session.add(proj)
        db.session.commit()
        return jsonify({'success': True, 'project': {'id': proj.id, 'title': proj.title, 'skills': proj.skills, 'verification_status': proj.verification_status}})

    @app.route('/api/project/<int:proj_id>/delete', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_delete_project(proj_id):
        proj = Project.query.get_or_404(proj_id)
        if proj.user_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        audit_log('delete_project', 'project', proj_id, f'title={proj.title}')
        db.session.delete(proj)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/user/<int:user_id>/experiences', methods=['GET'])
    @login_required
    def api_get_experiences(user_id):
        exps = Experience.query.filter_by(user_id=user_id).order_by(Experience.is_current.desc(), Experience.id.desc()).all()
        return jsonify({'experiences': [{
            'id': e.id, 'company': e.company, 'role': e.role, 'description': e.description,
            'skills': e.skills, 'start_date': e.start_date, 'end_date': e.end_date,
            'is_current': e.is_current, 'created_at': e.created_at.isoformat() if e.created_at else ''
        } for e in exps]})

    @app.route('/api/experience/create', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_create_experience():
        data = request.json or {}
        exp = Experience(
            user_id=current_user.id,
            company=sanitize_text(data.get('company', ''), 200),
            role=sanitize_text(data.get('role', ''), 200),
            description=sanitize_text(data.get('description', ''), 5000),
            skills=sanitize_text(data.get('skills', ''), 500),
            start_date=sanitize_text(data.get('start_date', ''), 20),
            end_date=sanitize_text(data.get('end_date', ''), 20),
            is_current=bool(data.get('is_current', False))
        )
        db.session.add(exp)
        db.session.commit()
        return jsonify({'success': True, 'experience': {
            'id': exp.id, 'company': exp.company, 'role': exp.role
        }})

    @app.route('/api/experience/<int:exp_id>/edit', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_edit_experience(exp_id):
        exp = Experience.query.get_or_404(exp_id)
        if exp.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        exp.company = sanitize_text(data.get('company', exp.company), 200)
        exp.role = sanitize_text(data.get('role', exp.role), 200)
        exp.description = sanitize_text(data.get('description', exp.description), 5000)
        exp.skills = sanitize_text(data.get('skills', exp.skills), 500)
        exp.start_date = sanitize_text(data.get('start_date', exp.start_date), 20)
        exp.end_date = sanitize_text(data.get('end_date', exp.end_date), 20)
        exp.is_current = bool(data.get('is_current', exp.is_current))
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/experience/<int:exp_id>/delete', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_delete_experience(exp_id):
        exp = Experience.query.get_or_404(exp_id)
        if exp.user_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        db.session.delete(exp)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/verification-requests')
    @login_required
    def api_verification_requests():
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        query = VerificationRequest.query.filter_by(status='pending')
        if current_user.verified_school_id and current_user.role != 'super_admin':
            query = query.filter_by(school_id=current_user.verified_school_id)
        elif current_user.school and current_user.role != 'super_admin':
            query = query.filter(VerificationRequest.student_school == current_user.school)
        reqs = query.order_by(VerificationRequest.id.desc()).limit(50).all()
        import secrets
        return jsonify({'requests': [{
            'id': r.id, 'user_id': r.user_id, 'student_name': r.student_name,
            'student_school': r.student_school, 'achievement_title': r.achievement_title,
            'category': r.category, 'institution': r.institution, 'year': r.year,
            'details': r.details, 'status': r.status, 'requested_at': r.requested_at
        } for r in reqs]})

    @app.route('/api/verification-request', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_create_verification_request():
        data = request.json or {}
        vreq = VerificationRequest(
            user_id=current_user.id,
            student_name=sanitize_text(data.get('studentName', current_user.name), 100),
            student_school=sanitize_text(data.get('studentSchool', current_user.school), 200),
            achievement_title=sanitize_text(data.get('title', ''), 200),
            category=sanitize_text(data.get('category', ''), 100),
            institution=sanitize_text(data.get('institution', ''), 200),
            year=sanitize_text(data.get('year', ''), 10),
            certificate_name=sanitize_text(data.get('certificateFile', ''), 500),
            details=sanitize_text(data.get('details', ''), 5000),
            status='pending',
            requested_at=jnow()
        )
        db.session.add(vreq)
        db.session.commit()
        return jsonify({'success': True, 'request': {'id': vreq.id, 'status': vreq.status}})

    @app.route('/api/achievements')
    @login_required
    def api_achievements():
        user_id = request.args.get('user_id', type=int)
        if not user_id:
            return jsonify({'achievements': []})
        achs = Achievement.query.filter_by(user_id=user_id).order_by(Achievement.id.desc()).all()
        return jsonify({'achievements': [{'id': a.id, 'title': a.title, 'description': a.description, 'category': a.category, 'institution': a.institution, 'year': a.year, 'verification_status': a.verification_status, 'verified_by': a.verified_by, 'verified_at': a.verified_at, 'verification_hash': a.verification_hash} for a in achs]})

    @app.route('/api/projects')
    @login_required
    def api_projects():
        user_id = request.args.get('user_id', type=int)
        if not user_id:
            return jsonify({'projects': []})
        projs = Project.query.filter_by(user_id=user_id).order_by(Project.id.desc()).all()
        return jsonify({'projects': [{'id': p.id, 'title': p.title, 'description': p.description, 'collaborators': p.collaborators, 'link': p.link, 'skills': p.skills, 'verification_status': p.verification_status} for p in projs]})

    @app.route('/api/verification/<int:req_id>/action', methods=['POST'])
    @login_required
    def api_verification_action(req_id):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        vreq = VerificationRequest.query.get_or_404(req_id)
        if current_user.role != 'super_admin' and current_user.verified_school_id and vreq.school_id and vreq.school_id != current_user.verified_school_id:
            return jsonify({'error': 'This request does not belong to your school'}), 403
        data = request.json or {}
        action = data.get('action', '')
        if action not in ('approve', 'reject'):
            return jsonify({'error': 'Invalid action'}), 400
        vreq.status = 'approved' if action == 'approve' else 'rejected'
        if action == 'approve':
            matching = Achievement.query.filter_by(user_id=vreq.user_id, title=vreq.achievement_title).first()
            if matching:
                matching.verification_status = 'Verified'
                matching.verified_by = sanitize_text(current_user.school or "School Admin", 100)
                matching.verified_at = jnow()
                import secrets
                matching.verification_hash = f"SCHOLR-{secrets.token_hex(8).upper()}"
            post = Post(author_id=vreq.user_id, author_name=sanitize_text(vreq.student_name, 100),
                       author_avatar="".join(p[0] for p in vreq.student_name.split() if p)[:2].upper() or "ST",
                       author_school=sanitize_text(vreq.student_school, 200),
                       type='achievement',
                       title=f"SEAL APPROVED: {sanitize_text(vreq.achievement_title, 100)}!",
                       content="Official digital seal verified.",
                       badge_text=sanitize_text(vreq.category.upper(), 50),
                       likes=0, tags=json.dumps(["Verified","SealApproved"]), timestamp=short_ts())
            db.session.add(post)
            notif = Notification(user_id=vreq.user_id,
                               title=f"Your achievement '{sanitize_text(vreq.achievement_title, 100)}' has been verified!",
                               type='success', timestamp=short_ts(), unread=True)
            db.session.add(notif)
        db.session.commit()
        audit_log('verify_achievement', 'verification_request', req_id, f'action={action} achievement={vreq.achievement_title}')
        return jsonify({'success': True, 'status': vreq.status})

    # ===== Clubs API =====

    @app.route('/api/club/create', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_create_club():
        data = request.json or {}
        name = sanitize_text(data.get('name', ''), 200)
        if not name:
            return jsonify({'error': 'Club name is required'}), 400
        description = sanitize_text(data.get('description', ''), 5000)
        bio = sanitize_text(data.get('bio', ''), 5000)
        tags = sanitize_text(data.get('tags', ''), 500)
        is_private = data.get('is_private', False)
        club = Club(name=name, description=description, bio=bio, is_private=bool(is_private),
                    owner_id=current_user.id,
                    tags=tags, created_at=jnow(), member_count=1)
        db.session.add(club)
        db.session.flush()
        membership = ClubMember(club_id=club.id, user_id=current_user.id, role='owner', joined_at=jnow())
        db.session.add(membership)
        db.session.commit()
        return jsonify({'success': True, 'club': {'id': club.id, 'name': club.name, 'member_count': club.member_count, 'is_private': club.is_private}})

    @app.route('/api/clubs')
    @login_required
    def api_clubs():
        page = request.args.get('page', 1, type=int)
        search = request.args.get('q', '').strip()
        query = Club.query
        if search:
            query = query.filter(Club.name.ilike(f'%{search}%'))
        clubs = query.order_by(Club.id.desc()).paginate(page=page, per_page=20, error_out=False)
        return jsonify({'clubs': [{'id': c.id, 'name': c.name, 'description': c.description[:200] if c.description else '',
            'owner_id': c.owner_id, 'member_count': c.member_count, 'tags': c.tags, 'created_at': c.created_at,
            'is_private': c.is_private, 'avatar': c.avatar, 'cover_url': c.cover_url} for c in clubs.items],
            'total': clubs.total, 'pages': clubs.pages, 'page': page})

    @app.route('/api/club/<int:club_id>')
    @login_required
    def api_club_detail(club_id):
        club = Club.query.get_or_404(club_id)
        owner = User.query.get(club.owner_id)
        is_member = False
        user_role = None
        if current_user.is_authenticated:
            mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
            if mem:
                is_member = True
                user_role = mem.role
        members = ClubMember.query.filter_by(club_id=club_id).order_by(ClubMember.id.asc()).limit(50).all()
        member_ids = [m.user_id for m in members]
        user_map = {}
        if member_ids:
            users = User.query.filter(User.id.in_(member_ids)).all()
            user_map = {u.id: {'name': u.name, 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'role': u.role} for u in users}
        return jsonify({'club': {'id': club.id, 'name': club.name, 'description': club.description,
            'bio': club.bio or '', 'is_private': club.is_private, 'avatar': club.avatar or '', 'cover_url': club.cover_url or '',
            'owner_id': club.owner_id, 'owner_name': owner.name if owner else 'Unknown',
            'member_count': club.member_count, 'tags': club.tags, 'created_at': club.created_at},
            'members': [{'id': m.id, 'user_id': m.user_id, 'role': m.role, 'joined_at': m.joined_at,
                'user': user_map.get(m.user_id, {})} for m in members],
            'is_member': is_member, 'user_role': user_role})

    @app.route('/api/club/<int:club_id>/join', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_join_club(club_id):
        club = Club.query.get_or_404(club_id)
        existing = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
        if existing:
            return jsonify({'error': 'Already a member'}), 400
        if club.is_private:
            pending = ClubJoinRequest.query.filter_by(club_id=club_id, user_id=current_user.id, status='pending').first()
            if pending:
                return jsonify({'error': 'Join request already pending'}), 400
            req = ClubJoinRequest(club_id=club_id, user_id=current_user.id, status='pending', requested_at=jnow())
            db.session.add(req)
            db.session.commit()
            return jsonify({'success': True, 'pending': True, 'message': 'Join request sent. Waiting for approval.'})
        mem = ClubMember(club_id=club_id, user_id=current_user.id, role='member', joined_at=jnow())
        db.session.add(mem)
        club.member_count = (club.member_count or 0) + 1
        db.session.commit()
        return jsonify({'success': True, 'member_count': club.member_count})

    @app.route('/api/club/<int:club_id>/leave', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_leave_club(club_id):
        club = Club.query.get_or_404(club_id)
        mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
        if not mem:
            return jsonify({'error': 'Not a member'}), 400
        if mem.role == 'owner':
            return jsonify({'error': 'Owner cannot leave. Transfer ownership or delete the club.'}), 400
        db.session.delete(mem)
        club.member_count = max(0, (club.member_count or 1) - 1)
        db.session.commit()
        return jsonify({'success': True, 'member_count': club.member_count})

    @app.route('/api/club/<int:club_id>/posts')
    @login_required
    def api_club_posts(club_id):
        club = Club.query.get_or_404(club_id)
        page = request.args.get('page', 1, type=int)
        posts = Post.query.filter_by(club_id=club_id).order_by(Post.id.desc()).paginate(page=page, per_page=10, error_out=False)
        uids = set(p.author_id for p in posts.items if p.author_id)
        user_map = {}
        if uids:
            users = User.query.filter(User.id.in_(uids)).all()
            user_map = {u.id: {'name': u.name, 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'role': u.role} for u in users}
        return jsonify({'posts': [{'id': p.id, 'author_id': p.author_id, 'author_name': p.author_name, 'author_avatar': p.author_avatar, 'author_school': p.author_school, 'type': p.type, 'title': p.title, 'content': p.content[:500] if p.content else '', 'badge_text': p.badge_text, 'likes': p.likes or 0, 'tags': p.tags, 'timestamp': p.timestamp, 'image_url': p.image_url or '', 'video_url': p.video_url or '', 'author': user_map.get(p.author_id, {})} for p in posts.items],
            'total': posts.total, 'pages': posts.pages, 'page': page})

    @app.route('/api/club/<int:club_id>/update', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_update_club(club_id):
        club = Club.query.get_or_404(club_id)
        mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
        if not mem or mem.role not in ('owner', 'admin'):
            return jsonify({'error': 'Only the owner or admins can update the club'}), 403
        data = request.json or {}
        if 'name' in data:
            club.name = sanitize_text(data['name'], 200)
        if 'description' in data:
            club.description = sanitize_text(data['description'], 5000)
        if 'bio' in data:
            club.bio = sanitize_text(data['bio'], 5000)
        if 'tags' in data:
            club.tags = sanitize_text(data['tags'], 500)
        if 'is_private' in data:
            club.is_private = bool(data['is_private'])
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/club/<int:club_id>/delete', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_delete_club(club_id):
        club = Club.query.get_or_404(club_id)
        if club.owner_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Only the owner can delete the club'}), 403
        ClubMember.query.filter_by(club_id=club_id).delete()
        Post.query.filter_by(club_id=club_id).update({'club_id': None})
        audit_log('delete_club', 'club', club_id)
        db.session.delete(club)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/user/<int:user_id>/clubs')
    @login_required
    def api_user_clubs(user_id):
        memberships = ClubMember.query.filter_by(user_id=user_id).all()
        if not memberships:
            return jsonify({'clubs': []})
        club_ids = [m.club_id for m in memberships]
        clubs = Club.query.filter(Club.id.in_(club_ids)).all()
        club_map = {c.id: c for c in clubs}
        return jsonify({'clubs': [{'id': m.club_id, 'name': club_map[m.club_id].name if m.club_id in club_map else 'Unknown',
            'description': (club_map[m.club_id].description or '')[:200] if m.club_id in club_map else '',
            'member_count': club_map[m.club_id].member_count if m.club_id in club_map else 0,
            'is_private': club_map[m.club_id].is_private if m.club_id in club_map else False,
            'avatar': club_map[m.club_id].avatar or '' if m.club_id in club_map else '',
            'role': m.role, 'joined_at': m.joined_at} for m in memberships]})

    @app.route('/api/club/<int:club_id>/join-requests')
    @login_required
    def api_club_join_requests(club_id):
        club = Club.query.get_or_404(club_id)
        mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
        if not mem or mem.role not in ('owner', 'admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        reqs = ClubJoinRequest.query.filter_by(club_id=club_id, status='pending').order_by(ClubJoinRequest.id.asc()).all()
        user_ids = [r.user_id for r in reqs]
        user_map = {}
        if user_ids:
            users = User.query.filter(User.id.in_(user_ids)).all()
            user_map = {u.id: {'name': u.name, 'avatar': u.avatar_url or u.avatar or u.name[:2].upper(), 'avatar_url': u.avatar_url or '', 'role': u.role, 'school': u.school} for u in users}
        return jsonify({'requests': [{'id': r.id, 'user_id': r.user_id, 'status': r.status, 'requested_at': r.requested_at, 'user': user_map.get(r.user_id, {})} for r in reqs]})

    @app.route('/api/club/<int:club_id>/join-request/<int:req_id>/approve', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_approve_join_request(club_id, req_id):
        club = Club.query.get_or_404(club_id)
        mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
        if not mem or mem.role not in ('owner', 'admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        req = ClubJoinRequest.query.get_or_404(req_id)
        if req.club_id != club_id or req.status != 'pending':
            return jsonify({'error': 'Invalid request'}), 400
        req.status = 'approved'
        req.responded_at = jnow()
        existing = ClubMember.query.filter_by(club_id=club_id, user_id=req.user_id).first()
        if not existing:
            new_mem = ClubMember(club_id=club_id, user_id=req.user_id, role='member', joined_at=jnow())
            db.session.add(new_mem)
            club.member_count = (club.member_count or 0) + 1
        db.session.commit()
        return jsonify({'success': True, 'member_count': club.member_count})

    @app.route('/api/club/<int:club_id>/join-request/<int:req_id>/reject', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_reject_join_request(club_id, req_id):
        club = Club.query.get_or_404(club_id)
        mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
        if not mem or mem.role not in ('owner', 'admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        req = ClubJoinRequest.query.get_or_404(req_id)
        if req.club_id != club_id or req.status != 'pending':
            return jsonify({'error': 'Invalid request'}), 400
        req.status = 'rejected'
        req.responded_at = jnow()
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/club/<int:club_id>/avatar', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_club_upload_avatar(club_id):
        club = Club.query.get_or_404(club_id)
        if club.owner_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Only the owner can change the avatar'}), 403
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        f = request.files['file']
        if not f.filename:
            return jsonify({'error': 'No file selected'}), 400
        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        valid, err = validate_file_type(f, allowed_ext, ['image/'])
        if not valid:
            return jsonify({'error': err or 'Invalid file type'}), 400
        ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else 'png'
        path = f"club_avatars/{club.id}/{uuid.uuid4().hex}.{ext}"
        url = _save_to_supabase(f.read(), 'uploads', path)
        if not url:
            return jsonify({'error': 'Upload failed'}), 500
        club.avatar = url
        db.session.commit()
        return jsonify({'success': True, 'url': url})

    @app.route('/api/club/<int:club_id>/cover', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_club_upload_cover(club_id):
        club = Club.query.get_or_404(club_id)
        if club.owner_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Only the owner can change the cover'}), 403
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        f = request.files['file']
        if not f.filename:
            return jsonify({'error': 'No file selected'}), 400
        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        valid, err = validate_file_type(f, allowed_ext, ['image/'])
        if not valid:
            return jsonify({'error': err or 'Invalid file type'}), 400
        ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else 'jpg'
        path = f"club_covers/{club.id}/{uuid.uuid4().hex}.{ext}"
        url = _save_to_supabase(f.read(), 'uploads', path)
        if not url:
            return jsonify({'error': 'Upload failed'}), 500
        club.cover_url = url
        db.session.commit()
        return jsonify({'success': True, 'url': url})

    @app.route('/api/opportunity/<int:opp_id>/apply', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_apply_opportunity(opp_id):
        opp = Opportunity.query.get_or_404(opp_id)
        notif = Notification(user_id=current_user.id, title=f"Applied to {sanitize_text(opp.name, 100)}!", type='success', timestamp=short_ts(), unread=True)
        db.session.add(notif)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/posts')
    @login_required
    def api_admin_posts():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        posts = Post.query.order_by(Post.id.desc()).limit(50).all()
        uids = set(p.author_id for p in posts if p.author_id)
        users = {u.id: {'name': u.name, 'avatar': u.avatar} for u in User.query.filter(User.id.in_(uids)).all()} if uids else {}
        return jsonify({'posts': [{'id': p.id, 'title': p.title, 'content': p.content, 'likes_count': p.likes or 0, 'created_at': p.timestamp or '', 'author': users.get(p.author_id, {'name': 'Unknown', 'avatar': ''})} for p in posts]})

    @app.route('/api/admin/post/<int:post_id>/delete', methods=['DELETE'])
    @login_required
    def api_admin_delete_post(post_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        post = Post.query.get_or_404(post_id)
        Comment.query.filter_by(post_id=post_id).delete()
        UserLike.query.filter_by(post_id=post_id).delete()
        audit_log('delete_post_admin', 'post', post_id, f'title={post.title}')
        db.session.delete(post)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/ads')
    @login_required
    def api_admin_ads():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        ads = Ad.query.order_by(Ad.id.desc()).all()
        return jsonify({'ads': [{'id': a.id, 'title': a.title, 'company': a.company, 'content': a.content, 'image': a.image, 'placement': a.placement, 'cta_url': a.cta_url, 'cta_text': a.cta_text, 'active': a.active, 'target_role': a.target_role, 'clicks': a.clicks, 'impressions': a.impressions, 'created_at': a.created_at.isoformat() if a.created_at else ''} for a in ads]})

    @app.route('/api/admin/ad/create', methods=['POST'])
    @login_required
    def api_admin_create_ad():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        ad = Ad(
            title=sanitize_text(data.get('title', ''), 200),
            company=sanitize_text(data.get('company', ''), 200),
            content=sanitize_text(data.get('content', ''), 5000),
            image=sanitize_text(data.get('image', ''), 300),
            cta_url=sanitize_text(data.get('cta_url', ''), 500),
            cta_text=sanitize_text(data.get('cta_text', ''), 100),
            placement=sanitize_text(data.get('placement', 'sidebar'), 30),
            target_role=sanitize_text(data.get('target_role', ''), 30),
            active=data.get('active', True)
        )
        db.session.add(ad)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/ad/<int:ad_id>/toggle', methods=['POST'])
    @login_required
    def api_admin_ad_toggle(ad_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        ad = Ad.query.get_or_404(ad_id)
        ad.active = not ad.active
        db.session.commit()
        return jsonify({'success': True, 'active': ad.active})

    @app.route('/api/admin/ad/<int:ad_id>/delete', methods=['DELETE'])
    @login_required
    def api_admin_delete_ad(ad_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        ad = Ad.query.get_or_404(ad_id)
        audit_log('delete_ad', 'ad', ad_id, f'title={ad.title}')
        db.session.delete(ad)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/ad/<int:ad_id>/click', methods=['POST'])
    def api_ad_click(ad_id):
        ad = Ad.query.get_or_404(ad_id)
        ad.clicks = Ad.clicks + 1
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/ad/<int:ad_id>/impression', methods=['POST'])
    def api_ad_impression(ad_id):
        ad = Ad.query.get_or_404(ad_id)
        ad.impressions = Ad.impressions + 1
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/team/create', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_create_team():
        data = request.json or {}
        req = TeamRequest(creator_id=current_user.id,
                         title=sanitize_text(data.get('title', ''), 200),
                         creator_name=current_user.name,
                         creator_avatar=current_user.avatar,
                         school=sanitize_text(current_user.school, 200),
                         opportunity_name=sanitize_text(data.get('opportunityName', ''), 200),
                         looking_for=json.dumps([sanitize_text(str(s), 100) for s in (data.get('lookingFor', []) or [])][:20]),
                         description=sanitize_text(data.get('description', ''), 5000))
        db.session.add(req)
        db.session.commit()
        return jsonify({'success': True, 'team': {'id': req.id, 'title': req.title}})

    @app.route('/api/team/<int:team_id>/apply', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_apply_team(team_id):
        a = TeamApplicant(team_request_id=team_id, name=current_user.name, school=sanitize_text(current_user.school, 200), status='pending')
        db.session.add(a)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/team/<int:team_id>/applicants', methods=['GET'])
    @login_required
    def api_team_applicants(team_id):
        apps = TeamApplicant.query.filter_by(team_request_id=team_id).all()
        return jsonify({'applicants': [{'id': a.id, 'name': a.name, 'school': a.school, 'status': a.status} for a in apps]})

    @app.route('/api/mentorship/send', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_send_mentorship():
        data = request.json or {}
        mreq = MentorshipRequest(mentor_id=data.get('mentorId'),
                                student_id=current_user.id,
                                mentor_name=sanitize_text(data.get('mentorName', ''), 100),
                                student_name=current_user.name,
                                student_school=sanitize_text(current_user.school, 200),
                                subject=sanitize_text(data.get('subject', ''), 200),
                                message=sanitize_text(data.get('message', ''), 5000),
                                status='pending', requested_at=jnow())
        db.session.add(mreq)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/mentorship/<int:mreq_id>/interaction', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_mentorship_interaction(mreq_id):
        mreq = MentorshipRequest.query.get_or_404(mreq_id)
        if mreq.student_id != current_user.id and mreq.mentor_id != current_user.id:
            return jsonify({'error': 'Forbidden'}), 403
        data = request.json or {}
        interaction = MentorInteraction(mentorship_request_id=mreq_id,
                                       author=sanitize_text(data.get('author', current_user.name), 100),
                                       note=sanitize_text(data.get('note', ''), 5000),
                                       date=jnow())
        db.session.add(interaction)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/mentorship/<int:mreq_id>/complete', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_complete_mentorship(mreq_id):
        mreq = MentorshipRequest.query.get_or_404(mreq_id)
        if mreq.student_id != current_user.id and mreq.mentor_id != current_user.id:
            return jsonify({'error': 'Forbidden'}), 403
        mreq.status = 'completed'
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/mentorship/<int:mreq_id>/respond', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_respond_mentorship(mreq_id):
        data = request.json or {}
        mreq = MentorshipRequest.query.get_or_404(mreq_id)
        if mreq.mentor_id != current_user.id:
            return jsonify({'error': 'Forbidden'}), 403
        new_status = data.get('status', 'declined')
        if new_status not in ('accepted', 'declined'):
            return jsonify({'error': 'Invalid status'}), 400
        mreq.status = new_status
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/announcement/create', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_create_school_announcement_auto():
        if current_user.role not in ('admin', 'super_admin') or not current_user.verified_school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        ann = SchoolAnnouncement(
            school_id=current_user.verified_school_id,
            title=sanitize_text(data.get('title', ''), 300),
            content=sanitize_text(data.get('content', ''), 5000),
            badge_text=sanitize_text(data.get('badge', ''), 100),
            type=sanitize_text(data.get('type', 'announcement'), 30),
            timestamp=short_ts()
        )
        db.session.add(ann)
        db.session.commit()
        return jsonify({'success': True, 'announcement': {'id': ann.id, 'title': ann.title}})

    @app.route('/api/announcement/<int:ann_id>/delete', methods=['DELETE'])
    @login_required
    @limiter.limit("10 per minute")
    def api_delete_announcement_auto(ann_id):
        ann = SchoolAnnouncement.query.get_or_404(ann_id)
        school = School.query.get(ann.school_id)
        if current_user.role != 'super_admin' and (not school or current_user.verified_school_id != ann.school_id):
            return jsonify({'error': 'Unauthorized'}), 403
        audit_log('delete_announcement', 'announcement', ann_id, f'title={ann.title}')
        db.session.delete(ann)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/school/announcements')
    @login_required
    def api_school_announcements():
        if current_user.role not in ('admin', 'super_admin') or not current_user.verified_school_id:
            return jsonify({'announcements': []})
        anns = SchoolAnnouncement.query.filter_by(school_id=current_user.verified_school_id).order_by(SchoolAnnouncement.id.desc()).limit(50).all()
        return jsonify({'announcements': [{'id': a.id, 'title': a.title, 'content': a.content, 'badge': a.badge_text, 'type': a.type, 'created_at': a.timestamp} for a in anns]})

    @app.route('/api/school/<int:school_id>/announcement', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_create_school_announcement(school_id):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        ann = SchoolAnnouncement(
            school_id=school_id,
            title=sanitize_text(data.get('title', ''), 300),
            content=sanitize_text(data.get('content', ''), 5000),
            badge_text=sanitize_text(data.get('badge', ''), 100),
            type=sanitize_text(data.get('type', 'announcement'), 30),
            timestamp=short_ts(),
            deadline=sanitize_text(data.get('deadline', ''), 50),
            reward=sanitize_text(data.get('reward', ''), 200)
        )
        db.session.add(ann)
        db.session.commit()
        return jsonify({'success': True, 'announcement': {'id': ann.id, 'title': ann.title}})

    @app.route('/api/school/<int:school_id>/announcement/<int:ann_id>/delete', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_delete_announcement(school_id, ann_id):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        ann = SchoolAnnouncement.query.get_or_404(ann_id)
        audit_log('delete_announcement', 'announcement', ann_id, f'title={ann.title}')
        db.session.delete(ann)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/event/<announce_id>/register', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_event_register(announce_id):
        try:
            announce_id = int(announce_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid ID'}), 400
        existing = EventRegistration.query.filter_by(user_id=current_user.id, announce_id=announce_id).first()
        if existing:
            db.session.delete(existing)
            is_reg = False
        else:
            er = EventRegistration(user_id=current_user.id, announce_id=announce_id)
            db.session.add(er)
            is_reg = True
        db.session.commit()
        return jsonify({'success': True, 'isRegistered': is_reg})

    @app.route('/api/ad/create', methods=['POST'])
    @login_required
    def api_create_ad():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        ad = Ad(title=sanitize_text(data.get('title', 'Untitled'), 200),
               company=sanitize_text(data.get('company', 'Sponsor'), 200),
               image=sanitize_text(data.get('image', 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'), 500),
               content=sanitize_text(data.get('content', ''), 2000),
               cta_url=sanitize_text(data.get('ctaUrl', '#'), 500),
               cta_text=sanitize_text(data.get('ctaText', 'Learn More'), 100),
               placement=sanitize_text(data.get('placement', 'left_sidebar'), 50),
               clicks=0, impressions=random.randint(100, 500))
        db.session.add(ad)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/ad/<int:ad_id>/delete', methods=['POST'])
    @login_required
    def api_delete_ad(ad_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        ad = Ad.query.get_or_404(ad_id)
        db.session.delete(ad)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/posts')
    @login_required
    def api_posts():
        page = request.args.get('page', 1, type=int)
        if page < 1:
            page = 1
        if page > 1000:
            return jsonify({'posts': [], 'has_more': False})
        per_page = 10
        posts_q = Post.query.order_by(Post.id.desc()).offset((page-1)*per_page).limit(per_page+1).all()
        has_more = len(posts_q) > per_page
        posts = posts_q[:per_page]
        post_ids = [p.id for p in posts]
        liked_ids = set(ul.post_id for ul in UserLike.query.filter(UserLike.user_id == current_user.id, UserLike.post_id.in_(post_ids)).all()) if post_ids else set()
        author_ids = set(p.author_id for p in posts if p.author_id)
        authors = {u.id: u for u in User.query.filter(User.id.in_(author_ids)).all()} if author_ids else {}
        # Batch-load comments for all visible posts
        comments_by_post = {}
        if post_ids:
            all_comments = Comment.query.filter(Comment.post_id.in_(post_ids)).order_by(Comment.id.asc()).all()
            for c in all_comments:
                comments_by_post.setdefault(c.post_id, []).append({'id': c.id, 'author': c.author, 'text': c.text, 'timestamp': c.timestamp})
        return jsonify({
            'posts': [{
                'id': p.id, 'title': p.title, 'content': p.content, 'type': p.type,
                'badge': p.badge_text, 'image_url': p.image_url, 'video_url': p.video_url,
                'likes_count': p.likes or 0, 'is_liked': p.id in liked_ids,
                'tags': json.loads(p.tags) if p.tags else [],
                'comments': comments_by_post.get(p.id, []),
                'author': {'id': p.author_id, 'name': p.author_name, 'school': p.author_school, 'avatar': p.author_avatar,
                          'avatar_url': authors.get(p.author_id).avatar_url if p.author_id and p.author_id in authors else '',
                          'role': authors.get(p.author_id).role if p.author_id and p.author_id in authors else '',
                          'username': authors.get(p.author_id).username if p.author_id and p.author_id in authors else '',
                          'verified': _is_verified(authors.get(p.author_id)) if p.author_id else False}
            } for p in posts],
            'has_more': has_more
        })

    @app.route('/api/user/stats')
    @login_required
    def api_user_stats():
        v_count = Achievement.query.filter_by(user_id=current_user.id, verification_status='Verified').count()
        p_count = Project.query.filter_by(user_id=current_user.id).count()
        f_count = Connection.query.filter_by(connected_user_id=current_user.id, status='accepted').count() + Connection.query.filter_by(user_id=current_user.id, status='accepted').count()
        return jsonify({'verified_achievements': v_count, 'projects': p_count, 'collaborations': 0, 'friends': f_count})

    @app.route('/api/user/<int:user_id>/profile')
    @login_required
    def api_user_profile(user_id):
        puser = User.query.get(user_id)
        if not puser:
            return jsonify({'error': 'User not found'}), 404
        v_count = Achievement.query.filter_by(user_id=user_id, verification_status='Verified').count()
        p_count = Project.query.filter_by(user_id=user_id).count()
        f_count = Connection.query.filter_by(connected_user_id=user_id, status='accepted').count() + Connection.query.filter_by(user_id=user_id, status='accepted').count()
        friend_status = 'none'
        conn = Connection.query.filter(
            ((Connection.user_id == current_user.id) & (Connection.connected_user_id == user_id)) |
            ((Connection.user_id == user_id) & (Connection.connected_user_id == current_user.id))
        ).first()
        if conn:
            if conn.status == 'accepted':
                friend_status = 'friends'
            elif conn.user_id == current_user.id:
                friend_status = 'pending_sent'
            else:
                friend_status = 'pending_received'
        skills = []
        for pj in Project.query.filter_by(user_id=user_id).all():
            if pj.skills:
                for s in pj.skills.split(','):
                    s = s.strip()
                    if s and s not in skills:
                        skills.append(s)
        return jsonify({
            'id': puser.id, 'name': puser.name, 'school': puser.school,
            'bio': puser.bio or '', 'avatar': puser.avatar or '',
            'avatar_url': puser.avatar_url or '',
            'role': puser.role or 'student', 'grade': puser.grade or '',
            'verified_achievements': v_count, 'projects': p_count,
            'collaborations': 0, 'friends': f_count,
            'skills': skills, 'friend_status': friend_status
        })

    @app.route('/api/user/<int:user_id>/achievements')
    @login_required
    def api_user_achievements(user_id):
        achs = Achievement.query.filter_by(user_id=user_id).order_by(Achievement.id.desc()).all()
        return jsonify({'achievements': [{
            'id': a.id, 'title': a.title, 'description': a.description,
            'category': a.category, 'institution': a.institution,
            'year': a.year, 'verified': a.verification_status == 'Verified',
            'verification_status': a.verification_status,
            'verification_hash': a.verification_hash if current_user.id == user_id or current_user.role == 'super_admin' else ''
        } for a in achs]})

    @app.route('/api/user/<int:user_id>/projects')
    @login_required
    def api_user_projects(user_id):
        projs = Project.query.filter_by(user_id=user_id).order_by(Project.id.desc()).all()
        return jsonify({'projects': [{
            'id': p.id, 'title': p.title, 'description': p.description,
            'collaborators': p.collaborators, 'link': p.link,
            'skills': [s.strip() for s in (p.skills or '').split(',') if s.strip()]
        } for p in projs]})

    @app.route('/api/ads')
    def api_list_ads():
        ads_list = active_ads()
        return jsonify({'ads': [{'id': a.id, 'title': a.title, 'company': a.company, 'content': a.content, 'image': a.image, 'cta_text': a.cta_text, 'cta_url': a.cta_url, 'placement': a.placement, 'clicks': a.clicks, 'impressions': a.impressions} for a in ads_list]})

    @app.route('/api/switch-role', methods=['POST'])
    @login_required
    @limiter.limit("20 per minute")
    def api_switch_role():
        data = request.json or {}
        new_role = data.get('role', 'student')
        if new_role not in ('student', 'teacher', 'mentor', 'admin'):
            return jsonify({'error': 'Invalid role'}), 400
        session['view_role'] = new_role
        return jsonify({'success': True})

    @app.route('/api/search')
    @login_required
    def api_search():
        q = request.args.get('q', '').strip().lower()
        if not q:
            return jsonify({'users': [], 'schools': [], 'achievements': []})
        if len(q) > 200:
            return jsonify({'users': [], 'schools': [], 'achievements': []})
        users = User.query.filter(
            db.or_(User.name.ilike(f'%{q}%'), User.username.ilike(f'%{q}%'))
        ).limit(5).all()
        schools = School.query.filter(School.name.ilike(f'%{q}%')).limit(5).all()
        achs = Achievement.query.filter(Achievement.title.ilike(f'%{q}%')).limit(5).all()
        return jsonify({'users': [{'id': u.id, 'name': u.name, 'school': u.school, 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'role': u.role, 'username': u.username, 'verified': _is_verified(u)} for u in users], 'schools': [{'id': s.id, 'name': s.name, 'location': s.location or ''} for s in schools], 'achievements': [{'id': a.id, 'title': a.title, 'user_id': a.user_id} for a in achs]})

    @app.route('/api/messages')
    @login_required
    def api_messages():
        contact_id = request.args.get('contact_id', type=int)
        if contact_id:
            msgs = ChatMessage.query.filter(((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == contact_id)) | ((ChatMessage.sender_id == contact_id) & (ChatMessage.receiver_id == current_user.id))).order_by(ChatMessage.id.asc()).all()
            return jsonify({'messages': [{'id': m.id, 'sender_id': m.sender_id, 'text': m.text, 'timestamp': m.timestamp, 'is_read': m.is_read} for m in msgs]})
        msgs = ChatMessage.query.filter((ChatMessage.sender_id == current_user.id) | (ChatMessage.receiver_id == current_user.id)).order_by(ChatMessage.timestamp.desc()).limit(200).all()
        cids = set()
        for m in msgs:
            other = m.receiver_id if m.sender_id == current_user.id else m.sender_id
            cids.add(other)
        if cids:
            users = {u.id: u for u in User.query.filter(User.id.in_(cids)).all()}
            contacts = [{'id': u.id, 'name': u.name, 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'school': u.school, 'role': u.role, 'username': u.username, 'verified': _is_verified(u)} for u in users.values()]
        else:
            contacts = []
        return jsonify({'contacts': contacts})

    @app.route('/api/messages/send', methods=['POST'])
    @login_required
    @limiter.limit("60 per minute")
    def api_send_message():
        data = request.json or {}
        receiver_id = data.get('receiver_id')
        if not receiver_id or receiver_id == current_user.id:
            return jsonify({'error': 'Invalid recipient'}), 400
        msg = ChatMessage(sender_id=current_user.id, receiver_id=receiver_id,
                         text=sanitize_text(data.get('text', ''), 5000),
                         timestamp=short_ts())
        db.session.add(msg)
        # Notify receiver
        n = Notification(user_id=receiver_id,
            title=f"Message from {sanitize_text(current_user.name, 100)}",
            type="message", from_user=current_user.name)
        db.session.add(n)
        db.session.commit()
        return jsonify({'success': True, 'message': {'id': msg.id, 'sender_id': msg.sender_id, 'text': msg.text, 'timestamp': msg.timestamp}})

    @app.route('/api/messages/unread-count')
    @login_required
    def api_messages_unread_count():
        count = ChatMessage.query.filter_by(receiver_id=current_user.id, is_read=False).count()
        return jsonify({'unread_count': count})

    @app.route('/api/messages/mark-read', methods=['POST'])
    @login_required
    def api_messages_mark_read():
        data = request.json or {}
        contact_id = data.get('contact_id')
        if contact_id:
            ChatMessage.query.filter_by(sender_id=contact_id, receiver_id=current_user.id, is_read=False).update({'is_read': True})
            db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/profile/avatar', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_upload_avatar():
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        f = request.files['file']
        if not f.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400
        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        valid, err = validate_file_type(f, allowed_ext, ['image/'])
        if not valid:
            return jsonify({"success": False, "error": err}), 400
        ext = f.filename.rsplit('.', 1)[-1].lower()
        safe_name = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
        url = _save_to_supabase(f.read(), 'uploads', f"avatars/{safe_name}")
        if not url:
            return jsonify({"success": False, "error": "Failed to upload file"}), 500
        current_user.avatar_url = url
        db.session.commit()
        return jsonify({"success": True, "url": url})

    @app.route('/api/profile/groq-key', methods=['GET', 'POST'])
    @login_required
    def api_groq_key():
        if request.method == 'POST':
            data = request.json or {}
            key = sanitize_text(data.get('key', ''), 200)
            current_user.groq_api_key = key
            db.session.commit()
            return jsonify({"success": True})
        return jsonify({"key": current_user.groq_api_key or ''})

    @app.route('/api/notifications')
    @login_required
    def api_notifications():
        notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.id.desc()).limit(30).all()
        unread_count = Notification.query.filter_by(user_id=current_user.id, unread=True).count()
        return jsonify({
            'notifications': [{
                'id': n.id, 'title': n.title, 'type': n.type,
                'from_user': n.from_user, 'timestamp': n.timestamp,
                'unread': n.unread
            } for n in notifs],
            'unread_count': unread_count
        })

    @app.route('/api/notifications/read', methods=['POST'])
    @login_required
    def api_notifications_read():
        Notification.query.filter_by(user_id=current_user.id, unread=True).update({'unread': False})
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/friend/request', methods=['POST'])
    @login_required
    @limiter.limit("30 per minute")
    def api_friend_request():
        data = request.json or {}
        target_id = data.get('user_id')
        if not target_id or not isinstance(target_id, int) or target_id == current_user.id:
            return jsonify({'error': 'Invalid user'}), 400
        if not User.query.get(target_id):
            return jsonify({'error': 'User not found'}), 404
        existing = Connection.query.filter_by(user_id=current_user.id, connected_user_id=target_id).first()
        if existing:
            return jsonify({'error': 'Request already exists'}), 400
        conn = Connection(user_id=current_user.id, connected_user_id=target_id, status='pending')
        db.session.add(conn)
        n = Notification(user_id=target_id, title=f"{sanitize_text(current_user.name, 100)} sent you a friend request", type="friend_request", from_user=current_user.name)
        db.session.add(n)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/friend/respond', methods=['POST'])
    @login_required
    @limiter.limit("30 per minute")
    def api_friend_respond():
        data = request.json or {}
        req_id = data.get('request_id')
        action = data.get('action')
        if not req_id or action not in ('accept', 'reject'):
            return jsonify({'error': 'Invalid request'}), 400
        conn = Connection.query.get(req_id)
        if not conn or conn.connected_user_id != current_user.id:
            return jsonify({'error': 'Not found'}), 404
        if action == 'accept':
            conn.status = 'accepted'
            n = Notification(user_id=conn.user_id, title=f"{sanitize_text(current_user.name, 100)} accepted your friend request", type="friend_accept", from_user=current_user.name)
            db.session.add(n)
        else:
            db.session.delete(conn)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/friend/requests')
    @login_required
    def api_friend_requests():
        reqs = Connection.query.filter_by(connected_user_id=current_user.id, status='pending').all()
        user_ids = [r.user_id for r in reqs]
        users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}
        return jsonify({'requests': [{
            'id': r.id, 'user_id': r.user_id,
            'user': {'name': users[r.user_id].name, 'avatar': users[r.user_id].avatar, 'avatar_url': users[r.user_id].avatar_url}
        } for r in reqs if r.user_id in users]})

    @app.route('/api/friend/list')
    @login_required
    def api_friend_list():
        sent = Connection.query.filter_by(user_id=current_user.id, status='accepted').all()
        received = Connection.query.filter_by(connected_user_id=current_user.id, status='accepted').all()
        ids = set()
        for c in sent: ids.add(c.connected_user_id)
        for c in received: ids.add(c.user_id)
        users = User.query.filter(User.id.in_(ids)).all() if ids else []
        return jsonify({'friends': [{'id': u.id, 'name': u.name, 'avatar': u.avatar or u.name[:2].upper(), 'avatar_url': u.avatar_url, 'school': u.school} for u in users]})

    @app.route('/api/user/<int:user_id>/connections')
    @login_required
    def api_user_connections(user_id):
        sent = Connection.query.filter_by(user_id=user_id, status='accepted').all()
        received = Connection.query.filter_by(connected_user_id=user_id, status='accepted').all()
        ids = set()
        for c in sent: ids.add(c.connected_user_id)
        for c in received: ids.add(c.user_id)
        # Calculate mutual connections with current user
        my_sent = Connection.query.filter_by(user_id=current_user.id, status='accepted').all()
        my_received = Connection.query.filter_by(connected_user_id=current_user.id, status='accepted').all()
        my_ids = set()
        for c in my_sent: my_ids.add(c.connected_user_id)
        for c in my_received: my_ids.add(c.user_id)
        users = User.query.filter(User.id.in_(ids)).all() if ids else []
        return jsonify({'connections': [{
            'id': u.id, 'name': u.name, 'avatar': u.avatar or u.name[:2].upper(), 'avatar_url': u.avatar_url,
            'school': u.school, 'username': u.username,
            'mutual': len(my_ids & {u.id})
        } for u in users]})

    @app.route('/api/connection/toggle', methods=['POST'])
    @login_required
    @limiter.limit("30 per minute")
    def api_toggle_connection():
        data = request.json or {}
        other_id = data.get('user_id')
        if not other_id:
            return jsonify({'error': 'user_id required'}), 400
        existing = Connection.query.filter_by(user_id=current_user.id, connected_user_id=other_id).first()
        if existing:
            db.session.delete(existing)
            connected = False
        else:
            conn = Connection(user_id=current_user.id, connected_user_id=other_id, status='accepted')
            db.session.add(conn)
            connected = True
        db.session.commit()
        return jsonify({'success': True, 'connected': connected})

    @app.route('/api/profile/update', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_profile_update():
        data = request.json or {}
        if 'name' in data:
            current_user.name = sanitize_text(data['name'], 100)
        if 'bio' in data:
            current_user.bio = sanitize_text(data['bio'], 2000)
        if 'school' in data:
            current_user.school = sanitize_text(data['school'], 200)
        if 'grade' in data:
            current_user.grade = sanitize_text(data['grade'], 50)
        if 'theme_color' in data:
            allowed = {'navy','coral','blush','gold','slate','ice-blue'}
            if data['theme_color'] in allowed:
                current_user.theme_color = data['theme_color']
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/profile/change-password', methods=['POST'])
    @login_required
    @limiter.limit("5 per hour")
    def api_change_password():
        data = request.json or {}
        current_pw = data.get('current_password', '')
        new_pw = data.get('new_password', '')
        if not current_pw or not new_pw:
            return jsonify({'error': 'Current and new password required'}), 400
        if len(new_pw) < 8 or len(new_pw) > 128:
            return jsonify({'error': 'New password must be 8-128 characters'}), 400
        if current_user.password_hash == '*firebase*':
            return jsonify({'error': 'Cannot change password for Firebase accounts'}), 400
        if not bcrypt.check_password_hash(current_user.password_hash, current_pw):
            return jsonify({'error': 'Current password is incorrect'}), 403
        current_user.password_hash = bcrypt.generate_password_hash(new_pw).decode('utf-8')
        db.session.commit()
        session.regenerate()
        return jsonify({'success': True})

    @app.route('/api/profile/logout-all', methods=['POST'])
    @login_required
    @limiter.limit("5 per hour")
    def api_logout_all():
        session.regenerate()
        import secrets
        app.secret_key = secrets.token_hex(32)
        return jsonify({'success': True, 'message': 'All sessions invalidated. Please log in again.'})

    @app.route('/api/profile/delete-account', methods=['POST'])
    @login_required
    @limiter.limit("3 per hour")
    def api_delete_account():
        data = request.json or {}
        password = data.get('password', '')
        if not password:
            return jsonify({'success': False, 'error': 'Password is required'}), 400
        if current_user.password_hash == '*firebase*':
            return jsonify({'success': False, 'error': 'Please use your social login provider to manage your account'}), 400
        try:
            if not bcrypt.check_password_hash(current_user.password_hash, password):
                return jsonify({'success': False, 'error': 'Incorrect password'}), 403
        except Exception:
            return jsonify({'success': False, 'error': 'Incorrect password'}), 403
        uid = current_user.id
        User.query.filter_by(id=uid).delete()
        db.session.commit()
        logout_user()
        session.clear()
        return jsonify({'success': True, 'redirect': '/'})

    @app.route('/api/debug-email', methods=['GET'])
    @limiter.limit("3 per 10 minutes")
    def debug_email():
        key = os.environ.get('RESEND_API_KEY', '')
        prefix = key[:8] + '...' if len(key) > 8 else 'NOT SET'
        try:
            import http.client, ssl, json
            body = json.dumps({'from': 'ScholrNet <noreply@scholrnet.in>', 'to': ['abhiraj1291@gmail.com'], 'subject': 'Debug test', 'html': '<p>test</p>'})
            ctx = ssl.create_default_context()
            conn = http.client.HTTPSConnection('api.resend.com', context=ctx, timeout=15)
            conn.request('POST', '/emails', body, {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
            resp = conn.getresponse()
            data = resp.read().decode()
            conn.close()
            return jsonify({'key_prefix': prefix, 'status': resp.status, 'response': data[:500]})
        except Exception as e:
            return jsonify({'key_prefix': prefix, 'error': str(e)}), 500

    # ---- 2FA ROUTES ----

    @app.route('/verify-2fa')
    @login_required
    def verify_2fa():
        if not session.get('2fa_required'):
            return redirect(url_for('dashboard'))
        return render_template('2fa_login.html', user=current_user,
            notifications=get_user_notifications(current_user.id))

    @app.route('/api/2fa/setup', methods=['GET'])
    @login_required
    def api_2fa_setup():
        import pyotp, qrcode, io, base64
        if current_user.totp_enabled:
            return jsonify({'error': '2FA already enabled'}), 400
        secret = current_user.totp_secret or pyotp.random_base32()
        if not current_user.totp_secret:
            current_user.totp_secret = secret
            db.session.commit()
        issuer = 'ScholrNet'
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user.email, issuer_name=issuer)
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        import secrets, string
        backup_codes = [''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10)) for _ in range(5)]
        current_user.totp_backup_codes = json.dumps([bcrypt.generate_password_hash(c).decode('utf-8') for c in backup_codes])
        db.session.commit()
        return jsonify({'secret': secret, 'uri': uri, 'qr': f'data:image/png;base64,{qr_b64}',
            'backup_codes': backup_codes})

    @app.route('/api/2fa/enable', methods=['POST'])
    @login_required
    def api_2fa_enable():
        import pyotp
        data = request.json or {}
        code = data.get('code', '').strip()
        if not code:
            return jsonify({'error': 'Verification code required'}), 400
        if not current_user.totp_secret:
            return jsonify({'error': '2FA not initialized. Call GET /api/2fa/setup first.'}), 400
        totp = pyotp.TOTP(current_user.totp_secret)
        if not totp.verify(code, valid_window=1):
            return jsonify({'error': 'Invalid code. Try again.'}), 400
        current_user.totp_enabled = True
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/2fa/disable', methods=['POST'])
    @login_required
    @limiter.limit("5 per hour")
    def api_2fa_disable():
        data = request.json or {}
        password = data.get('password', '')
        if not password:
            return jsonify({'error': 'Password required to disable 2FA'}), 400
        if current_user.password_hash == '*firebase*':
            return jsonify({'error': 'Cannot disable 2FA for Firebase accounts via API'}), 400
        if not bcrypt.check_password_hash(current_user.password_hash, password):
            return jsonify({'error': 'Incorrect password'}), 403
        current_user.totp_enabled = False
        current_user.totp_secret = ''
        current_user.totp_backup_codes = ''
        db.session.commit()
        session.pop('2fa_required', None)
        return jsonify({'success': True})

    @app.route('/api/2fa/verify-login', methods=['POST'])
    @limiter.limit("10 per minute")
    def api_2fa_verify_login():
        if not current_user.is_authenticated or not session.get('2fa_required'):
            return jsonify({'error': 'No 2FA pending'}), 401
        import pyotp
        data = request.json or {}
        code = data.get('code', '').strip()
        if not code:
            return jsonify({'error': 'Verification code required'}), 400
        totp = pyotp.TOTP(current_user.totp_secret)
        if totp.verify(code, valid_window=1):
            session.pop('2fa_required', None)
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        if current_user.totp_backup_codes:
            import json as _json
            backup_list = _json.loads(current_user.totp_backup_codes)
            for i, h in enumerate(backup_list):
                if bcrypt.check_password_hash(h, code):
                    backup_list.pop(i)
                    current_user.totp_backup_codes = _json.dumps(backup_list)
                    db.session.commit()
                    session.pop('2fa_required', None)
                    return jsonify({'success': True, 'redirect': url_for('dashboard'), 'used_backup': True})
        return jsonify({'error': 'Invalid code'}), 400

    @app.route('/api/gemini/status')
    @login_required
    def api_gemini_status():
        client = get_gemini_client()
        return jsonify({"configured": client is not None})

    @app.route('/api/gemini/analyze-portfolio', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_gemini_analyze():
        client = get_gemini_client()
        if not client:
            return jsonify({"academicReview": f"Strong portfolio, {current_user.name}!", "strengths": ["Academic Dedication", "Project Building"], "opportunitiesRecommended": [], "portfolioEnhancements": ["Add more verified achievements"]})
        try:
            prompt = f"Analyze this student portfolio. Name: {current_user.name}, Grade: {current_user.grade}"
            response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt, config={"response_mime_type": "application/json", "max_output_tokens": 1000})
            result = json.loads(response.text.strip())
            return jsonify(result)
        except json.JSONDecodeError:
            return jsonify({"academicReview": "Analysis unavailable at this time.", "strengths": [], "opportunitiesRecommended": [], "portfolioEnhancements": []})
        except Exception as e:
            app.logger.error(f"Gemini analyze error: {e}")
            return jsonify({"academicReview": "Analysis unavailable at this time.", "strengths": [], "opportunitiesRecommended": [], "portfolioEnhancements": []})

    @app.route('/api/gemini/ask-advisor', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_gemini_ask():
        client = get_gemini_client()
        data = request.json or {}
        user_msg = sanitize_text(data.get('message') or data.get('question', ''), 2000)
        if not user_msg:
            return jsonify({"error": "Message is required"}), 400
        if not client:
            fallbacks = ["To apply for CBSE gold seals, upload your certificate and request verification.", "KVPY fellowships require verified academic evidence.", "For research projects, host code on GitHub and link to your profile."]
            return jsonify({"answer": random.choice(fallbacks)})
        try:
            response = client.models.generate_content(model="gemini-2.5-flash", contents=f"You are ScholrAI, a student counselor. Question: {user_msg}", config={"max_output_tokens": 1000})
            return jsonify({"answer": response.text})
        except Exception as e:
            app.logger.error(f"Gemini ask error: {e}")
            return jsonify({"answer": "Sorry, I'm having trouble right now. Please try again later."})

    @app.route('/api/groq/analyze-portfolio', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_groq_analyze():
        key = current_user.groq_api_key or app.config.get("GROQ_API_KEY", "")
        if not key:
            return jsonify({"response": "No Groq API key configured. Add yours in the key field above."})
        achs = Achievement.query.filter_by(user_id=current_user.id).all()
        projects_data = Project.query.filter_by(user_id=current_user.id).all()
        prompt = f"Analyze this academic portfolio for {current_user.name} ({current_user.school}, {current_user.grade}). Achievements: {[(a.title, a.category, a.description[:100]) for a in achs]}. Projects: {[(p.title, p.description[:100], p.skills) for p in projects_data]}. Give strengths, improvements, and career suggestions."
        try:
            import json, urllib.request
            body = json.dumps({"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}], "max_tokens": 1000}).encode()
            req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions",
                data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
            resp = json.loads(urllib.request.urlopen(req, timeout=30).read())
            return jsonify({"response": resp["choices"][0]["message"]["content"]})
        except Exception as e:
            app.logger.error(f"Groq analyze error: {e}")
            return jsonify({"response": "Error calling Groq API. Check your key and try again."})

    @app.route('/api/groq/ask-advisor', methods=['POST'])
    @login_required
    @limiter.limit("5 per minute")
    def api_groq_ask():
        key = current_user.groq_api_key or app.config.get("GROQ_API_KEY", "")
        data = request.json or {}
        user_msg = sanitize_text(data.get('question', ''), 2000)
        if not user_msg:
            return jsonify({"response": "Please enter a question."})
        if not key:
            return jsonify({"response": "No Groq API key configured. Add yours in the key field above."})
        try:
            import json, urllib.request
            body = json.dumps({"model": "llama-3.1-8b-instant", "messages": [{"role": "system", "content": "You are ScholrAI, a student counselor. Be concise and helpful."}, {"role": "user", "content": user_msg}], "max_tokens": 1000}).encode()
            req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions",
                data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
            resp = json.loads(urllib.request.urlopen(req, timeout=30).read())
            return jsonify({"response": resp["choices"][0]["message"]["content"]})
        except Exception as e:
            app.logger.error(f"Groq ask error: {e}")
            return jsonify({"response": "Error calling Groq API. Check your key and try again."})

    @app.route('/api/upload', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_upload():
        """Fallback: server-side upload."""
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        f = request.files['file']
        if not f.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400
        ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov'}
        if ext not in allowed_ext:
            return jsonify({"success": False, "error": f"File type .{ext} not allowed"}), 400
        if ext in ('png', 'jpg', 'jpeg', 'gif', 'webp'):
            valid, err = validate_file_type(f, allowed_ext, ['image/'])
            if not valid:
                return jsonify({"success": False, "error": err}), 400
            from PIL import Image
            try:
                img = Image.open(f)
                img.verify()
                f.seek(0)
            except Exception:
                return jsonify({"success": False, "error": "Invalid image file"}), 400
        else:
            valid, err = validate_file_type(f, {'mp4', 'mov'}, ['video/'])
            if not valid:
                return jsonify({"success": False, "error": err}), 400
        safe_name = f"{uuid.uuid4().hex[:16]}_{current_user.id}.{ext}"
        url = _save_to_supabase(f.read(), 'uploads', safe_name)
        if not url:
            return jsonify({"success": False, "error": "Failed to upload file"}), 500
        return jsonify({"success": True, "url": url})

    @app.route('/api/upload-token')
    @login_required
    @limiter.limit("30 per minute")
    def api_upload_token():
        """Generate a signed upload URL so the client uploads directly to Supabase."""
        import urllib.request, json as json_module
        ext = request.args.get('ext', 'png').lower()
        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov'}
        if ext not in allowed_ext:
            return jsonify({"error": f"Extension .{ext} not allowed"}), 400
        safe_name = f"{uuid.uuid4().hex[:16]}_{current_user.id}.{ext}"
        public_url = f"{supabase_url}/storage/v1/object/public/uploads/{safe_name}"
        # Try Supabase signed upload URL API
        try:
            sign_req = urllib.request.Request(
                f"{supabase_url}/storage/v1/object/upload/sign/uploads/{safe_name}",
                data=b'{"expiresIn":"3600"}',
                headers={
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(sign_req, timeout=10) as resp:
                sign_data = json_module.loads(resp.read().decode())
                signed_url = sign_data.get("url") or sign_data.get("signedURL") or ""
                if signed_url:
                    return jsonify({"uploadUrl": signed_url, "publicUrl": public_url})
        except Exception:
            pass
        # Fallback: return server-side URL for proxy upload
        return jsonify({"uploadUrl": "", "publicUrl": public_url})

    @app.route('/api/seed')
    @login_required
    def api_seed():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        if User.query.first():
            return jsonify({"message": "Already seeded"})
        from seed import _run_seed
        audit_log('seed_db', 'database', detail='Seeded database with test data')
        _run_seed(bcrypt)
        return jsonify({"message": "Database seeded!", "users": ["aarav@scholrnet.com/student123", "shreya@scholrnet.com/school123", "admin@scholrnet.com/admin123"]})

    @app.route('/api/reset-db')
    @login_required
    def api_reset_db():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        from seed import _run_seed
        audit_log('reset_db', 'database', detail='Database reset and re-seeded')
        _run_seed(bcrypt)
        return jsonify({"message": "Database reset and re-seeded!", "users": ["aarav@scholrnet.com/student123", "shreya@scholrnet.com/school123", "admin@scholrnet.com/admin123"]})

    @app.route('/api/clean-data')
    @login_required
    def api_clean_data():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        audit_log('clean_data', 'database', detail='Removed all seed data')
        EventRegistration.query.delete()
        UserLike.query.delete()
        Connection.query.delete()
        TeamApplicant.query.delete()
        MentorshipRequest.query.delete()
        MentorInteraction.query.delete()
        Notification.query.delete()
        ChatMessage.query.delete()
        Comment.query.delete()
        Post.query.delete()
        Achievement.query.delete()
        Project.query.delete()
        VerificationRequest.query.delete()
        SchoolAnnouncement.query.delete()
        TeamRequest.query.delete()
        Mentor.query.delete()
        Opportunity.query.delete()
        Ad.query.delete()
        School.query.delete()
        db.session.commit()
        return jsonify({"message": "All seed data removed. Test users preserved."})

    @app.route('/api/admin/schools')
    @login_required
    def api_admin_schools():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        schools = School.query.order_by(School.id.desc()).all()
        result = []
        for s in schools:
            admin = User.query.filter_by(school=s.name, role='admin').first()
            result.append({
                'id': s.id, 'name': s.name, 'location': s.location or '',
                'tagline': s.tagline or '', 'about': s.about or '',
                'established': s.established or '', 'verification_code': s.verification_code or '',
                'admin_email': admin.email if admin else ''
            })
        return jsonify({'schools': result})

    @app.route('/api/admin/school/create', methods=['POST'])
    @login_required
    def api_admin_create_school():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        name = sanitize_text(data.get('name', ''), 200)
        if not name:
            return jsonify({'success': False, 'error': 'School name required'}), 400
        school = School(name=name, location=sanitize_text(data.get('location', ''), 200), tagline=sanitize_text(data.get('tagline', ''), 200), about=sanitize_text(data.get('about', ''), 1000), established=sanitize_text(data.get('established', ''), 20))
        # Generate 8-char verification code
        import secrets, string
        school.verification_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        db.session.add(school)
        db.session.flush()
        email = name.lower().replace(' ', '').replace('.', '')[:30] + '@scholrnet.com'
        pwd = 'school' + str(school.id)
        existing = User.query.filter_by(email=email).first()
        if existing:
            email = 'school' + str(school.id) + '@scholrnet.com'
        username = sanitize_text(data.get('username', ''), 30).strip().lower()
        if username:
            if not re.match(r'^[a-z0-9_]{3,30}$', username):
                return jsonify({'success': False, 'error': 'Invalid username format'}), 400
            if User.query.filter_by(username=username).first():
                return jsonify({'success': False, 'error': 'Username already taken'}), 400
        user = User(name=name + ' Admin', email=email, password_hash=bcrypt.generate_password_hash(pwd).decode('utf-8'), school=name, role='admin', avatar='SC', username=username or None)
        db.session.add(user)
        db.session.commit()
        audit_log('create_school', 'school', school.id, f'name={name} email={email}')
        return jsonify({'success': True, 'email': email, 'password': pwd, 'verification_code': school.verification_code})

    @app.route('/api/admin/school/<int:school_id>/edit', methods=['POST'])
    @login_required
    def api_admin_edit_school(school_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        school = School.query.get_or_404(school_id)
        data = request.json or {}
        if 'name' in data:
            school.name = sanitize_text(data['name'], 200)
        if 'location' in data:
            school.location = sanitize_text(data['location'], 200)
        if 'tagline' in data:
            school.tagline = sanitize_text(data['tagline'], 200)
        if 'about' in data:
            school.about = sanitize_text(data['about'], 1000)
        if 'established' in data:
            school.established = sanitize_text(data['established'], 20)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/school/<int:school_id>/reset-password', methods=['POST'])
    @login_required
    def api_admin_school_reset_password(school_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        school = School.query.get_or_404(school_id)
        admin = User.query.filter_by(school=school.name, role='admin').first()
        if not admin:
            return jsonify({'error': 'School admin not found'}), 404
        import secrets, string
        new_pwd = 'school' + str(school.id) + secrets.choice(string.ascii_lowercase)
        admin.password_hash = bcrypt.generate_password_hash(new_pwd).decode('utf-8')
        db.session.commit()
        audit_log('reset_school_password', 'school', school_id, f'admin_email={admin.email}')
        return jsonify({'success': True, 'email': admin.email, 'password': new_pwd})

    @app.route('/api/admin/school/<int:school_id>/delete', methods=['DELETE'])
    @login_required
    def api_admin_delete_school(school_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        school = School.query.get_or_404(school_id)
        # Remove school reference from users
        User.query.filter_by(verified_school_id=school_id).update({'verified_school_id': None, 'school_verified': False})
        User.query.filter_by(school=school.name).update({'school': ''})
        SchoolAnnouncement.query.filter_by(school_id=school_id).delete()
        audit_log('delete_school', 'school', school_id, f'name={school.name}')
        db.session.delete(school)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/audit-logs')
    @login_required
    def api_admin_audit_logs():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        page = request.args.get('page', 1, type=int)
        if page < 1:
            page = 1
        days = request.args.get('days', 7, type=int)
        action_filter = request.args.get('action', '').strip()
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_str = cutoff.strftime('%Y-%m-%d')
        query = AuditLog.query.filter(AuditLog.timestamp >= cutoff_str)
        if action_filter:
            query = query.filter(AuditLog.action == action_filter)
        logs = query.order_by(AuditLog.id.desc()).paginate(page=page, per_page=50, error_out=False)
        actions = db.session.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
        return jsonify({
            'logs': [{
                'id': l.id, 'user_id': l.user_id, 'user_name': l.user_name,
                'action': l.action, 'target_type': l.target_type,
                'target_id': l.target_id, 'detail': l.detail,
                'ip_address': l.ip_address, 'timestamp': l.timestamp
            } for l in logs.items],
            'total': logs.total, 'pages': logs.pages, 'page': page,
            'actions': [a[0] for a in actions]
        })

    @app.route('/api/schools/list')
    @login_required
    def api_schools_list():
        schools = School.query.order_by(School.name.asc()).all()
        return jsonify({'schools': [{
            'id': s.id, 'name': s.name, 'location': s.location or '',
            'tagline': s.tagline or '', 'avatar': s.avatar or ''
        } for s in schools]})

    @app.route('/api/school/verify', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_school_verify():
        data = request.json or {}
        code = data.get('code', '').strip().upper()
        school_id = data.get('school_id', type=int)
        if not code or not school_id:
            return jsonify({'success': False, 'error': 'School and verification code required'}), 400
        if current_user.school_verified:
            return jsonify({'success': False, 'error': 'Already verified at a school'}), 400
        school = School.query.get(school_id)
        if not school:
            return jsonify({'success': False, 'error': 'School not found'}), 404
        if school.verification_code != code:
            return jsonify({'success': False, 'error': 'Invalid verification code'}), 400
        current_user.school_verified = True
        current_user.verified_school_id = school_id
        db.session.commit()
        return jsonify({'success': True, 'school_name': school.name})

    @app.route('/api/school/<int:school_id>')
    @login_required
    def api_school_profile(school_id):
        school = School.query.get_or_404(school_id)
        students = User.query.filter_by(verified_school_id=school_id, role='student').limit(50).all()
        teachers = User.query.filter_by(verified_school_id=school_id, role='teacher').limit(20).all()
        announcements = SchoolAnnouncement.query.filter_by(school_id=school_id).order_by(SchoolAnnouncement.id.desc()).limit(20).all()
        return jsonify({
            'school': {'id': school.id, 'name': school.name, 'location': school.location or '',
                       'tagline': school.tagline or '', 'about': school.about or '',
                       'established': school.established or '', 'avatar': school.avatar or ''},
            'students': [{'id': u.id, 'name': u.name, 'avatar': u.avatar_url or u.avatar or u.name[:2].upper(), 'grade': u.grade} for u in students],
            'teachers': [{'id': u.id, 'name': u.name, 'avatar': u.avatar_url or u.avatar or u.name[:2].upper()} for u in teachers],
            'announcements': [{'id': a.id, 'title': a.title, 'content': a.content, 'badge_text': a.badge_text,
                              'type': a.type, 'timestamp': a.timestamp, 'deadline': a.deadline, 'reward': a.reward} for a in announcements]
        })

    @app.route('/api/health')
    def api_health():
        return jsonify({"status": "healthy"})

    @app.route('/robots.txt')
    def robots_txt():
        return Response("User-agent: *\nAllow: /\nSitemap: https://scholrnet.in/sitemap.xml\n", mimetype='text/plain')

    @app.route('/sitemap.xml')
    def sitemap():
        from xml.sax.saxutils import escape as xml_escape
        pages = []
        base = 'https://scholrnet.in'
        # Static pages
        for url, priority, changefreq in [
            ('/', '1.0', 'weekly'),
            ('/login', '0.5', 'monthly'),
            ('/register', '0.6', 'monthly'),
            ('/public', '0.7', 'daily'),
        ]:
            pages.append({'loc': base + url, 'priority': priority, 'changefreq': changefreq})
        # Public profiles
        users = User.query.filter(User.username.isnot(None), User.username != '').order_by(User.id.desc()).limit(500).all()
        for u in users:
            pages.append({'loc': base + '/share/' + u.username, 'priority': '0.8', 'changefreq': 'weekly'})
        # Public posts
        posts = Post.query.order_by(Post.id.desc()).limit(500).all()
        for p in posts:
            pages.append({'loc': base + '/post/' + str(p.id), 'priority': '0.6', 'changefreq': 'monthly'})
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        for p in pages:
            xml += '  <url>\n'
            xml += '    <loc>' + xml_escape(p['loc']) + '</loc>\n'
            xml += '    <changefreq>' + p['changefreq'] + '</changefreq>\n'
            xml += '    <priority>' + p['priority'] + '</priority>\n'
            xml += '  </url>\n'
        xml += '</urlset>'
        return Response(xml, mimetype='application/xml')

    @app.route('/api/migrate')
    @login_required
    def api_migrate():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        """Add missing columns to existing tables."""
        from sqlalchemy import text, inspect
        mig = []
        try:
            inspector = inspect(db.engine)
            posts_cols = [c['name'] for c in inspector.get_columns('posts')]
            if 'image_url' not in posts_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE posts ADD COLUMN image_url VARCHAR(500) DEFAULT ''"))
                    conn.commit()
                mig.append("added posts.image_url")
            if 'video_url' not in posts_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE posts ADD COLUMN video_url VARCHAR(500) DEFAULT ''"))
                    conn.commit()
                mig.append("added posts.video_url")
            users_cols = [c['name'] for c in inspector.get_columns('users')]
            if 'avatar_url' not in users_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(300) DEFAULT ''"))
                    conn.commit()
                mig.append("added users.avatar_url")
            if 'username' not in users_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(30) UNIQUE DEFAULT NULL"))
                    conn.commit()
                mig.append("added users.username")
            exp_cols = [c['name'] for c in inspector.get_columns('experiences')] if 'experiences' in [t for (t,) in db.engine.execute("SELECT table_name FROM information_schema.tables WHERE table_name='experiences'").fetchall()] else []
            if not exp_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS experiences (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(id),
                            company VARCHAR(200) NOT NULL,
                            role VARCHAR(200) NOT NULL,
                            description TEXT DEFAULT '',
                            skills VARCHAR(500) DEFAULT '',
                            start_date VARCHAR(20) DEFAULT '',
                            end_date VARCHAR(20) DEFAULT '',
                            is_current BOOLEAN DEFAULT FALSE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    conn.commit()
                mig.append("created experiences table")
            schools_cols = [c['name'] for c in inspector.get_columns('schools')]
            if 'verification_code' not in schools_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE schools ADD COLUMN verification_code VARCHAR(8) DEFAULT ''"))
                    conn.commit()
                mig.append("added schools.verification_code")
            if 'verified_by_email' not in schools_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE schools ADD COLUMN verified_by_email VARCHAR(200) DEFAULT ''"))
                    conn.commit()
                mig.append("added schools.verified_by_email")
            if 'school_verified' not in users_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN school_verified BOOLEAN DEFAULT FALSE"))
                    conn.commit()
                mig.append("added users.school_verified")
            if 'verified_school_id' not in users_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN verified_school_id INTEGER REFERENCES schools(id)"))
                    conn.commit()
                mig.append("added users.verified_school_id")
        except Exception as e:
            return jsonify({"error": str(e), "ran": mig}), 500
        audit_log('migrate_db', 'database', detail=f'changes={len(mig)}')
        return jsonify({"message": "Migration complete", "changes": mig})

    @app.route('/api/test-image-post')
    @login_required
    def api_test_image_post():
        """Create a test post with a known working image URL to verify display."""
        import urllib.request, struct, zlib
        def make_png():
            def chunk(ctype, data):
                c = ctype + data
                return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
            sig = b'\x89PNG\r\n\x1a\n'
            ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            raw = zlib.compress(b'\x00\xff\x00\x00\xff')
            idat = chunk(b'IDAT', raw)
            iend = chunk(b'IEND', b'')
            return sig + ihdr + idat + iend
        png = make_png()
        path = f"test_post_{uuid.uuid4().hex[:8]}.png"
        req = urllib.request.Request(
            f"{supabase_url}/storage/v1/object/uploads/{path}",
            data=png,
            headers={"Authorization": f"Bearer {supabase_key}", "Content-Type": "image/png"},
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            return jsonify({"error": "Upload failed", "detail": str(e)}), 500
        url = f"{supabase_url}/storage/v1/object/public/uploads/{path}"
        post = Post(author_id=current_user.id, author_name=current_user.name, author_avatar=current_user.avatar, author_school=current_user.school, type='achievement', title='Test Post with Image', content='This is a test post to verify images display correctly.', image_url=url, likes=0, tags='[]', timestamp=short_ts())
        db.session.add(post)
        db.session.commit()
        return jsonify({"success": True, "post_id": post.id, "image_url": url, "public_readable": True})

    @app.route('/api/diag-storage')
    @login_required
    def api_diag_storage():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        import urllib.request, urllib.error
        import io, struct, zlib
        # Create a real 1x1 red PNG pixel
        def make_png():
            def chunk(ctype, data):
                c = ctype + data
                return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
            sig = b'\x89PNG\r\n\x1a\n'
            ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            raw = zlib.compress(b'\x00\xff\x00\x00\xff')
            idat = chunk(b'IDAT', raw)
            iend = chunk(b'IEND', b'')
            return sig + ihdr + idat + iend
        png_data = make_png()
        test_path = f"test_img_{uuid.uuid4().hex[:8]}.png"
        req = urllib.request.Request(
            f"{supabase_url}/storage/v1/object/uploads/{test_path}",
            data=png_data,
            headers={"Authorization": f"Bearer {supabase_key}", "Content-Type": "image/png"},
            method="POST",
        )
        try:
            resp = urllib.request.urlopen(req, timeout=10)
            public_url = f"{supabase_url}/storage/v1/object/public/uploads/{test_path}"
            # Verify public read access
            read_ok = False
            try:
                read_req = urllib.request.Request(public_url, method="GET")
                read_resp = urllib.request.urlopen(read_req, timeout=10)
                read_ok = read_resp.status == 200
            except Exception:
                pass
            return jsonify({
                "success": True,
                "upload_status": resp.status,
                "public_url": public_url,
                "public_readable": read_ok,
                "html": f'<img src="{public_url}" alt="test image" style="width:200px;height:200px;border:2px solid red;">',
            })
        except urllib.error.HTTPError as e:
            return jsonify({"success": False, "error": f"HTTP {e.code}: {e.reason}", "body": e.read().decode() if e.fp else ""}), 500
