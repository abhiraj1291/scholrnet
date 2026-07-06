import os, sys, traceback, secrets
from urllib.parse import urlparse
from datetime import datetime, timezone, timedelta
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, g
from flask_login import login_required, current_user, logout_user
from config import Config
from extensions import db, bcrypt, login_manager, compress, limiter
from services.migration import run_startup_migrations, enable_rls

def create_app():
    import os
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
    app = Flask(
        __name__,
        template_folder=os.path.join(FRONTEND_DIR, 'templates'),
        static_folder=os.path.join(FRONTEND_DIR, 'static'),
        static_url_path='/static'
    )
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    compress.init_app(app)
    limiter.init_app(app)

    with app.app_context():
        register_routes(app)
        run_startup_migrations(app)

    return app


def register_routes(app, _bcrypt=None, _login_manager=None, _limiter=None):
    """Register all blueprints, error handlers, before_request hooks, and context processors."""
    from routes.main import main_bp
    from routes.auth import auth_bp
    from routes.api_admin import api_bp as admin_bp
    from routes.api_posts import posts_bp
    from routes.api_clubs import bp as clubs_bp
    from routes.api_chat import bp as chat_bp
    from routes.api_friends import bp as friends_bp
    from routes.api_schools import bp as schools_bp
    from routes.api_other import bp as other_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(posts_bp)
    app.register_blueprint(clubs_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(friends_bp)
    app.register_blueprint(schools_bp)
    app.register_blueprint(other_bp)

    @app.before_request
    def csrf_protect():
        if request.is_json and request.content_length and request.content_length > 1024 * 1024:
            return jsonify({'error': 'Request too large'}), 413
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE') and not request.path.startswith('/static/'):
            origin = request.headers.get('Origin', '')
            referer = request.headers.get('Referer', '')
            allowed_hosts = ['scholrnet.in', 'www.scholrnet.in', 'localhost', '127.0.0.1']
            valid = False
            if origin:
                parsed = urlparse(origin)
                hn = parsed.hostname or ''
                if hn in allowed_hosts or hn.endswith('.vercel.app'):
                    valid = True
            if referer:
                parsed = urlparse(referer)
                hn = parsed.hostname or ''
                if hn in allowed_hosts or hn.endswith('.vercel.app'):
                    valid = True
            if not valid:
                return jsonify({'error': 'Forbidden'}), 403

    @app.before_request
    def set_csp_nonce():
        g.csp_nonce = secrets.token_hex(16)

    @app.before_request
    def check_idle_timeout():
        if current_user.is_authenticated and not request.path.startswith('/static/'):
            last_active = session.get('last_active')
            now_ts = datetime.now(timezone.utc).timestamp()
            if last_active and now_ts - last_active > 1800:
                logout_user()
                session.clear()
                return redirect(url_for('auth.login'))
            session['last_active'] = now_ts

    @app.before_request
    def check_2fa():
        if current_user.is_authenticated and session.get('2fa_required'):
            endpoint = request.endpoint or ''
            allowed = ('verify_2fa', 'api_2fa_verify_login', 'logout', 'static')
            if not any(endpoint == a or endpoint.endswith('.' + a) for a in allowed):
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({'error': '2FA verification required'}), 401
                return redirect(url_for('auth.verify_2fa'))

    @app.before_request
    def check_pending_role():
        if current_user.is_authenticated and current_user.role == 'pending':
            allowed = ['choose_role', 'api_set_role', 'logout', 'static', 'verify_email_otp', 'api_resend_verify_otp', 'api_change_verify_email']
            ep = request.endpoint or ''
            if not any(ep == a or ep.endswith('.' + a) for a in allowed) and not request.path.startswith('/static/'):
                return redirect(url_for('main.choose_role'))
        if current_user.is_authenticated and current_user.email_verified is False:
            allowed = ['verify_email_otp', 'api_resend_verify_otp', 'api_change_verify_email', 'logout', 'static']
            ep = request.endpoint or ''
            if not any(ep == a or ep.endswith('.' + a) for a in allowed) and not request.path.startswith('/static/'):
                return redirect(url_for('auth.verify_email_otp'))
        if current_user.is_authenticated and not current_user.username and current_user.role != 'pending' and current_user.email_verified:
            allowed = ['choose_username', 'api_username_check', 'api_username_set', 'verify_email_otp', 'api_resend_verify_otp', 'api_change_verify_email', 'logout', 'static']
            ep = request.endpoint or ''
            if not any(ep == a or ep.endswith('.' + a) for a in allowed) and not request.path.startswith('/static/'):
                return redirect(url_for('main.choose_username'))

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        nonce = getattr(g, 'csp_nonce', '')
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            f"script-src 'self' 'nonce-{nonce}' https://unpkg.com https://www.gstatic.com https://apis.google.com https://challenges.cloudflare.com; "
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

    @app.context_processor
    def inject_globals():
        return {'schools': [], 'csp_nonce': getattr(g, 'csp_nonce', '')}

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not found'}), 404
        return render_template('error.html', code=404, title='Page Not Found', message='The page you are looking for does not exist.', emoji='🔍'), 404

    @app.errorhandler(403)
    def forbidden(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Forbidden'}), 403
        return render_template('error.html', code=403, title='Access Denied', message='You do not have permission to access this page.', emoji='🚫'), 403

    @app.errorhandler(500)
    def server_error(e):
        err = traceback.format_exc()
        print("SERVER ERROR:", err)
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Server error'}), 500
        return render_template('error.html', code=500, title='Something Went Wrong', message=f'{err[:500]}', emoji='⚠️'), 500

    from models import User
    @login_manager.user_loader
    def load_user(user_id):
        try:
            parts = user_id.split(':')
            uid = int(parts[0])
            user = User.query.get(uid)
            if user is None:
                return None
            if len(parts) > 1:
                expected_version = int(parts[1])
                if user.session_version != expected_version:
                    return None
            return user
        except (ValueError, TypeError, IndexError):
            return None


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
