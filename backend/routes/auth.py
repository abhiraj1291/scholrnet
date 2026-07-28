import os, re, json, random, uuid, secrets, hmac
from datetime import datetime, timezone, timedelta
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, login_user, logout_user, current_user
from models import db, User, Achievement, Project, Post
from extensions import bcrypt, limiter
from utils.sanitizers import sanitize_text, validate_file_type
from utils.email import send_email, email_otp_body
from services.upload import save_to_supabase

auth_bp = Blueprint('auth', __name__, url_prefix='')

@auth_bp.errorhandler(429)
def auth_429(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Too many requests. Please try again later.'}), 429
    return render_template('auth/register.html', error='Too many attempts. Please try again in a few minutes.', turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))

@auth_bp.errorhandler(500)
def auth_500(e):
    return jsonify({'error': 'Server error'}), 500

@auth_bp.route('/login', methods=['GET', 'POST'])
@limiter.limit("30 per 15 minutes", methods=['POST'])
def login():
    try:
        if current_user.is_authenticated:
            return redirect(url_for('main.dashboard'))
        if request.method == 'POST':
            email = request.form.get('email', '').strip().lower()
            password = request.form.get('password', '')
            if len(email) > 254 or len(password) > 128:
                return render_template('auth/login.html', error="Invalid credentials", firebase_config=current_app.config.get("FIREBASE_CONFIG", {}))
            user = User.query.filter_by(email=email).first()
            if user and user.password_hash != '*firebase*':
                if user.locked_until and user.locked_until > datetime.utcnow():
                    return render_template('auth/login.html', error="Account temporarily locked. Try again later.", firebase_config=current_app.config.get("FIREBASE_CONFIG", {}))
                if bcrypt.check_password_hash(user.password_hash, password):
                    user.login_attempts = 0
                    user.locked_until = None
                    db.session.commit()
                    login_user(user)
                    session.permanent = True
                    if user.totp_enabled:
                        session['2fa_required'] = True
                        return redirect(url_for('auth.verify_2fa'))
                    return redirect(url_for('main.dashboard'))
                user.login_attempts = (user.login_attempts or 0) + 1
                if user.login_attempts >= 5:
                    user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                db.session.commit()
            return render_template('auth/login.html', error="Invalid email or password", firebase_config=current_app.config.get("FIREBASE_CONFIG", {}))
        return render_template('auth/login.html',
            firebase_config=current_app.config.get("FIREBASE_CONFIG", {}))
    except Exception:
        current_app.logger.exception('auth error')
        return render_template('auth/login.html', error="Login error. Please try again.", firebase_config=current_app.config.get("FIREBASE_CONFIG", {}))


@auth_bp.route('/register', methods=['GET', 'POST'])
@limiter.limit("5 per 15 minutes", methods=['POST'])
def register():
    try:
        if current_user.is_authenticated:
            return redirect(url_for('main.dashboard'))
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
            terms_accepted = request.form.get('terms_accepted')
            if not terms_accepted:
                return render_template('auth/register.html', error="You must accept the Terms of Service and Privacy Policy", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
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
                return render_template('auth/register.html', error="An account with this email already exists but is not verified. Please log in or check your email for the verification code.", turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
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
            now_utc = datetime.utcnow()
            user = User(name=name, email=email, password_hash=hashed, school=school, role=role,
                        avatar=avatar, grade="Class XII", bio="Active ScholrNet Member",
                        username=username or None,
                        email_otp=otp, email_otp_expires=otp_expires,
                        terms_accepted=True, terms_accepted_at=now_utc, terms_version="1.0",
                        privacy_accepted_at=now_utc)
            db.session.add(user)
            db.session.commit()
            sent = send_email(email, 'Verify your ScholrNet email',
                email_otp_body(name, otp, 'Verify Your Email'))
            if not sent:
                user.email_otp = ''
                user.email_otp_expires = None
                db.session.commit()
                return render_template('auth/register.html', error='Account created but email service unavailable. Please try logging in to request a new verification code.', turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
            login_user(user)
            session.permanent = True
            session['verify_email'] = True
            return redirect(url_for('auth.verify_email_otp'))
        return render_template('auth/register.html', turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return render_template('auth/register.html', error='Registration error. Please try again.', turnstile_site_key=current_app.config.get('TURNSTILE_SITE_KEY', ''))


@auth_bp.route('/api/auth/firebase', methods=['POST'])
@limiter.limit("20 per 15 minutes")
def api_firebase_auth():
    try:
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
                pass
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
    except Exception as e:
        current_app.logger.exception('auth error')
        return jsonify({'success': False, 'error': f'Server error: {type(e).__name__}'}), 500


@auth_bp.route('/verify-email-otp', methods=['GET', 'POST'])
@login_required
def verify_email_otp():
    if current_user.email_verified:
        return redirect(url_for('main.dashboard'))
    if request.method == 'POST':
        try:
            otp = request.form.get('otp', '').strip()
            if not otp or not otp.isdigit() or len(otp) != 6:
                return render_template('auth/verify_otp.html', error='Enter a valid 6-digit code', email=current_user.email)
            from datetime import datetime
            expires = current_user.email_otp_expires
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
            if not hmac.compare_digest(current_user.email_otp or '', otp) or not expires or datetime.utcnow() > expires:
                return render_template('auth/verify_otp.html', error='Invalid or expired code', email=current_user.email)
            current_user.email_verified = True
            current_user.email_otp = ''
            current_user.email_otp_expires = None
            db.session.commit()
            session.pop('verify_email', None)
            if not current_user.username:
                return redirect(url_for('main.choose_username'))
            return redirect(url_for('main.dashboard'))
        except Exception as e:
            current_app.logger.exception('auth error')
            return render_template('auth/verify_otp.html', error='Verification error', email=current_user.email)
    return render_template('auth/verify_otp.html', email=current_user.email)


@auth_bp.route('/api/verify-email/resend-otp', methods=['POST'])
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
    sent = send_email(current_user.email, 'Verify your ScholrNet email',
        email_otp_body(current_user.name, otp, 'Verify Your Email'))
    if not sent:
        current_user.email_otp = ''
        current_user.email_otp_expires = None
        db.session.commit()
        return jsonify({'success': False, 'error': 'Email service unavailable. Please try again later.'}), 502
    return jsonify({'success': True})


@auth_bp.route('/api/verify-email/change-email', methods=['POST'])
@login_required
@limiter.limit("3 per 15 minutes")
def api_change_verify_email():
    if current_user.email_verified:
        return jsonify({'success': False, 'error': 'Already verified'}), 400
    new_email = request.form.get('email', '').strip().lower()
    if not new_email or len(new_email) > 254 or '@' not in new_email:
        return jsonify({'success': False, 'error': 'Enter a valid email address'}), 400
    existing = User.query.filter_by(email=new_email).first()
    if existing and existing.id != current_user.id:
        return jsonify({'success': False, 'error': 'Email already in use'}), 409
    current_user.email = new_email
    import random
    from datetime import datetime, timedelta
    otp = str(random.randint(100000, 999999))
    current_user.email_otp = otp
    current_user.email_otp_expires = datetime.utcnow() + timedelta(minutes=10)
    db.session.commit()
    session.pop('resend_otp_at', None)
    sent = send_email(new_email, 'Verify your ScholrNet email',
        email_otp_body(current_user.name, otp, 'Verify Your Email'))
    if not sent:
        return jsonify({'success': False, 'error': 'Email service unavailable. Please try again later.'}), 502
    return jsonify({'success': True, 'email': new_email})


@auth_bp.route('/verify-email/<token>')
def verify_email(token):
    user = User.query.filter_by(email_verify_token=token, email_verified=False).first()
    if not user:
        return render_template('error.html', code=400, title='Invalid Link', message='This verification link is invalid or expired.', emoji='🔗')
    user.email_verified = True
    user.email_verify_token = ''
    db.session.commit()
    login_user(user)
    return render_template('auth/verify_success.html')


@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
@limiter.limit("5 per 15 minutes", methods=['POST'])
def forgot_password():
    try:
        if current_user.is_authenticated:
            return redirect(url_for('main.dashboard'))
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
                return redirect(url_for('auth.reset_password_otp'))
            return render_template('auth/forgot_sent.html')
        return render_template('auth/forgot.html')
    except Exception:
        current_app.logger.exception('auth error')
        return render_template('auth/forgot.html', error='Something went wrong. Please try again.')


@auth_bp.route('/reset-password-otp', methods=['GET', 'POST'])
@limiter.limit("10 per 15 minutes", methods=['POST'])
def reset_password_otp():
    email = session.get('reset_email', '')
    if not email:
        return redirect(url_for('auth.forgot_password'))
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
                return redirect(url_for('auth.forgot_password'))
            from datetime import datetime
            expires = user.reset_otp_expires
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
            if not hmac.compare_digest(user.reset_otp or '', otp) or not expires or datetime.utcnow() > expires:
                return render_template('auth/reset_otp.html', error='Invalid or expired code', email=email)
            user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
            user.reset_otp = ''
            user.reset_otp_expires = None
            db.session.commit()
            session.pop('reset_email', None)
            return render_template('auth/reset_success.html')
        except Exception as e:
            current_app.logger.exception('auth error')
            return render_template('auth/reset_otp.html', error=f'Error: {e}', email=email)
    return render_template('auth/reset_otp.html', email=email)


@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
@limiter.limit("5 per 15 minutes", methods=['POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    if request.method == 'POST':
        password = request.form.get('password', '')
        if len(password) < 8 or len(password) > 128:
            return render_template('auth/reset.html', error='Password must be 8-128 characters', token=token)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        u = User.query.filter(User.reset_password_token != '').all()
        u = next((x for x in u if hmac.compare_digest(x.reset_password_token or '', token)), None)
        if u and u.reset_password_token_expires and u.reset_password_token_expires > now:
            u.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
            u.reset_password_token = ''
            u.reset_password_token_expires = ''
            db.session.commit()
            return render_template('auth/reset_success.html')
        return render_template('auth/reset.html', error='Invalid or expired reset link', token=token)
    return render_template('auth/reset.html', token=token)


@auth_bp.route('/api/profile/role', methods=['POST'])
@login_required
def api_set_role():
    data = request.json or {}
    role = data.get('role', '')
    if role not in ('student', 'teacher', 'mentor', 'counselor'):
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    current_user.role = role
    db.session.commit()
    return jsonify({'success': True, 'redirect': '/dashboard'})


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))


@auth_bp.route('/verify-2fa')
@login_required
def verify_2fa():
    if not session.get('2fa_required'):
        return redirect(url_for('main.dashboard'))
    return render_template('2fa_login.html', user=current_user)


@auth_bp.route('/api/2fa/setup', methods=['GET'])
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
    import secrets, string, hashlib
    backup_codes = [''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10)) for _ in range(5)]
    current_user.totp_backup_codes = json.dumps([hashlib.sha256(c.encode()).hexdigest() for c in backup_codes])
    db.session.commit()
    return jsonify({'secret': secret, 'uri': uri, 'qr': f'data:image/png;base64,{qr_b64}',
        'backup_codes': backup_codes})


@auth_bp.route('/api/2fa/enable', methods=['POST'])
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


@auth_bp.route('/api/2fa/disable', methods=['POST'])
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


@auth_bp.route('/api/2fa/verify-login', methods=['POST'])
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
        return jsonify({'success': True, 'redirect': url_for('main.dashboard')})
    if current_user.totp_backup_codes:
        import json as _json, hashlib as _hashlib
        backup_list = _json.loads(current_user.totp_backup_codes)
        for i, h in enumerate(backup_list):
            matched = False
            try:
                if bcrypt.check_password_hash(h, code):
                    matched = True
            except Exception:
                if _hashlib.sha256(code.encode()).hexdigest() == h:
                    matched = True
            if matched:
                backup_list.pop(i)
                current_user.totp_backup_codes = _json.dumps(backup_list)
                db.session.commit()
                session.pop('2fa_required', None)
                return jsonify({'success': True, 'redirect': url_for('main.dashboard'), 'used_backup': True})
    return jsonify({'error': 'Invalid code'}), 400


@auth_bp.route('/api/username/check', methods=['GET'])
@limiter.limit("30 per minute")
def api_username_check():
    u = request.args.get('u', '').strip().lower()
    if not u:
        return jsonify({'available': False, 'error': 'Empty username'})
    if not re.match(r'^[a-z0-9_]{3,30}$', u):
        return jsonify({'available': False, 'error': '3-30 chars, letters, numbers, underscores only'})
    taken = User.query.filter_by(username=u).first() is not None
    return jsonify({'available': not taken})


@auth_bp.route('/api/username/set', methods=['POST'])
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


@auth_bp.route('/api/profile/update', methods=['POST'])
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


@auth_bp.route('/api/profile/change-password', methods=['POST'])
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
    current_user.session_version += 1
    db.session.commit()
    login_user(current_user)
    return jsonify({'success': True})


@auth_bp.route('/api/profile/logout-all', methods=['POST'])
@login_required
@limiter.limit("5 per hour")
def api_logout_all():
    current_user.session_version += 1
    db.session.commit()
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out of all devices.'})


@auth_bp.route('/api/profile/delete-account', methods=['POST'])
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
    from services.helpers import cascade_delete_user
    cascade_delete_user(uid)
    logout_user()
    session.clear()
    return jsonify({'success': True, 'redirect': '/'})


@auth_bp.route('/api/profile/avatar', methods=['POST'])
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
    url = save_to_supabase(f.read(), 'uploads', f"avatars/{safe_name}", supabase_url=current_app.config.get("SUPABASE_URL","").rstrip("/"), supabase_key=current_app.config.get("SUPABASE_STORAGE_KEY",""))
    if not url:
        return jsonify({"success": False, "error": "Failed to upload file"}), 500
    current_user.avatar_url = url
    db.session.commit()
    return jsonify({"success": True, "url": url})


@auth_bp.route('/api/profile/cover', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def api_upload_cover():
    try:
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
        safe_name = f"cover_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
        url = save_to_supabase(f.read(), 'uploads', f"covers/{safe_name}", supabase_url=current_app.config.get("SUPABASE_URL","").rstrip("/"), supabase_key=current_app.config.get("SUPABASE_STORAGE_KEY",""))
        if not url:
            return jsonify({"success": False, "error": "Failed to upload file"}), 500
        current_user.cover_banner = url
        db.session.commit()
        return jsonify({"success": True, "url": url})
    except Exception:
        current_app.logger.exception('auth error')
        return jsonify({"success": False, "error": "Upload failed"}), 500


@auth_bp.route('/api/profile/groq-key', methods=['GET', 'POST'])
@login_required
def api_groq_key():
    if request.method == 'POST':
        data = request.json or {}
        key = sanitize_text(data.get('key', ''), 200)
        current_user.groq_api_key = key
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"key": current_user.groq_api_key or ''})
