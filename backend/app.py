import os
import json
import random
import re
import uuid
from datetime import datetime, timezone

from flask import render_template, request, jsonify, redirect, url_for, session as flask_session, abort
from flask_login import login_user, logout_user, login_required, current_user
from markupsafe import escape as escape_html

from config import Config
from models import db, User, Achievement, Project, Post, Comment, Ad, Opportunity, TeamRequest
from models import TeamApplicant, VerificationRequest, Mentor, MentorshipRequest, MentorInteraction
from models import Notification, ChatMessage, School, SchoolAnnouncement, Connection, UserLike, EventRegistration, Experience

MAX_STRING_LEN = 5000
MAX_CONTENT_LEN = 50000

def sanitize_text(text, max_len=MAX_STRING_LEN):
    if not text:
        return ''
    text = str(text).strip()
    # Strip control characters except newlines
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Strip HTML tags to prevent XSS
    text = re.sub(r'<[^>]*>', '', text)
    return text[:max_len]

def sanitize_html_escape(text, max_len=MAX_STRING_LEN):
    return escape_html(sanitize_text(text, max_len))

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
    supabase_url = app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = app.config.get("SUPABASE_STORAGE_KEY", "")
    supabase_bucket = "uploads"

    import traceback, sys

    @app.errorhandler(404)
    def not_found(e):
        return render_template('error.html', code=404, title='Page Not Found', message='The page you are looking for does not exist.', emoji='🔍'), 404

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('error.html', code=403, title='Access Denied', message='You do not have permission to access this page.', emoji='🚫'), 403

    @app.errorhandler(500)
    def server_error(e):
        print("SERVER ERROR:", traceback.format_exc())
        return render_template('error.html', code=500, title='Something Went Wrong', message='An unexpected error occurred. Our team has been notified.', emoji='⚠️'), 500

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
            urllib.request.urlopen(req, timeout=15)
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
            allowed = ['choose_role', 'api_set_role', 'logout', 'static']
            if request.endpoint not in allowed and not request.path.startswith('/static/'):
                return redirect(url_for('choose_role'))
        # Redirect users without a username to choose-username (skip for certain endpoints)
        if current_user.is_authenticated and not current_user.username and current_user.role != 'pending':
            allowed = ['choose_username', 'api_username_check', 'api_username_set', 'logout', 'static']
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

    # ---- AUTH ROUTES ----
    @app.route('/')
    def index():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        return redirect(url_for('login'))

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
                        flask_session.permanent = True
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
                avatar_url=photo
            )
            db.session.add(user)
            db.session.commit()
            login_user(user)
            flask_session.permanent = True
            return jsonify({'success': True, 'redirect': '/choose-role', 'new_user': True})
        else:
            if photo and not user.avatar_url:
                user.avatar_url = photo
                db.session.commit()
        login_user(user)
        flask_session.permanent = True
        return jsonify({'success': True, 'redirect': '/dashboard'})

    @app.route('/register', methods=['GET', 'POST'])
    @limiter.limit("5 per 15 minutes")
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        if request.method == 'POST':
            name = sanitize_text(request.form.get('name', ''), 100)
            email = request.form.get('email', '').strip().lower()
            password = request.form.get('password', '')
            school = sanitize_text(request.form.get('school', ''), 200)
            role = request.form.get('role', 'student')
            username = request.form.get('username', '').strip().lower()

            if not name or not email or not password:
                return render_template('auth/register.html', error="All fields are required")
            if len(email) > 254:
                return render_template('auth/register.html', error="Email too long")
            if len(password) < 8:
                return render_template('auth/register.html', error="Password must be at least 8 characters")
            if len(password) > 128:
                return render_template('auth/register.html', error="Password too long")
            if role not in ('student', 'teacher', 'mentor', 'counselor'):
                role = 'student'
            if User.query.filter_by(email=email).first():
                return render_template('auth/register.html', error="Email already registered")
            if username:
                if not re.match(r'^[a-z0-9_]{3,30}$', username):
                    return render_template('auth/register.html', error="Username: 3-30 chars, letters, numbers, underscores only")
                if User.query.filter_by(username=username).first():
                    return render_template('auth/register.html', error="Username already taken")
            hashed = bcrypt.generate_password_hash(password).decode('utf-8')
            avatar = "".join(p[0] for p in name.strip().split() if p)[:2].upper() or "ST"
            user = User(name=name, email=email, password_hash=hashed, school=school, role=role,
                        avatar=avatar, grade="Class XII", bio="Active ScholrNet Member",
                        username=username or None)
            db.session.add(user)
            db.session.commit()
            login_user(user)
            flask_session.permanent = True
            if not user.username:
                return redirect(url_for('choose_username'))
            return redirect(url_for('dashboard'))
        return render_template('auth/register.html')

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
            video_url=sanitize_text(data.get('video_url', data.get('videoUrl', '')), 500),
            image_url=image_url
        )
        db.session.add(post)
        db.session.commit()
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
        db.session.commit()
        return jsonify({'success': True, 'comment': {
            'id': comment.id, 'author': {'name': comment.author, 'avatar': comment.avatar},
            'text': comment.text, 'timestamp': comment.timestamp
        }})

    @app.route('/api/post/<int:post_id>/comments', methods=['GET'])
    def api_get_comments(post_id):
        comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.id.asc()).all()
        return jsonify({'comments': [{'id': c.id, 'author': {'name': c.author, 'avatar': c.avatar}, 'text': c.text, 'timestamp': c.timestamp} for c in comments]})

    @app.route('/api/post/<int:post_id>/delete', methods=['POST'])
    @login_required
    def api_delete_post(post_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        post = Post.query.get_or_404(post_id)
        Comment.query.filter_by(post_id=post_id).delete()
        UserLike.query.filter_by(post_id=post_id).delete()
        db.session.delete(post)
        db.session.commit()
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
    def api_delete_achievement(ach_id):
        ach = Achievement.query.get_or_404(ach_id)
        if ach.user_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        db.session.delete(ach)
        db.session.commit()
        return jsonify({'success': True})

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
    def api_delete_project(proj_id):
        proj = Project.query.get_or_404(proj_id)
        if proj.user_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        db.session.delete(proj)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/user/<int:user_id>/experiences', methods=['GET'])
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
    def api_delete_experience(exp_id):
        exp = Experience.query.get_or_404(exp_id)
        if exp.user_id != current_user.id and current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        db.session.delete(exp)
        db.session.commit()
        return jsonify({'success': True})

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

    @app.route('/api/verification/<int:req_id>/action', methods=['POST'])
    @login_required
    def api_verification_action(req_id):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        action = data.get('action', '')
        if action not in ('approve', 'reject'):
            return jsonify({'error': 'Invalid action'}), 400
        vreq = VerificationRequest.query.get_or_404(req_id)
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
        return jsonify({'success': True, 'status': vreq.status})

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
        db.session.delete(post)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/ads')
    @login_required
    def api_admin_ads():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        ads = Ad.query.order_by(Ad.id.desc()).all()
        return jsonify({'ads': [{'id': a.id, 'title': a.title, 'company': a.company, 'content': a.content, 'placement': a.placement} for a in ads]})

    @app.route('/api/admin/ad/create', methods=['POST'])
    @login_required
    def api_admin_create_ad():
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        ad = Ad(title=sanitize_text(data.get('title', ''), 200), company=sanitize_text(data.get('company', ''), 200), content=sanitize_text(data.get('content', ''), 5000), cta_url=sanitize_text(data.get('cta_url', ''), 500), cta_text=sanitize_text(data.get('cta_text', ''), 100), placement=sanitize_text(data.get('placement', 'sidebar'), 30))
        db.session.add(ad)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/ad/<int:ad_id>/delete', methods=['DELETE'])
    @login_required
    def api_admin_delete_ad(ad_id):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        ad = Ad.query.get_or_404(ad_id)
        db.session.delete(ad)
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
    def api_complete_mentorship(mreq_id):
        mreq = MentorshipRequest.query.get_or_404(mreq_id)
        if mreq.student_id != current_user.id and mreq.mentor_id != current_user.id:
            return jsonify({'error': 'Forbidden'}), 403
        mreq.status = 'completed'
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/mentorship/<int:mreq_id>/respond', methods=['POST'])
    @login_required
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

    @app.route('/api/school/<int:school_id>/announcement', methods=['POST'])
    @login_required
    @limiter.limit("10 per minute")
    def api_school_announcement(school_id):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json or {}
        ann = SchoolAnnouncement(school_id=school_id,
                                title=sanitize_text(data.get('title', ''), 200),
                                content=sanitize_text(data.get('content', ''), MAX_CONTENT_LEN),
                                badge_text=sanitize_text(data.get('badgeText', 'Bulletin'), 100),
                                type=sanitize_text(data.get('type', 'announcement'), 50),
                                timestamp=short_ts(),
                                deadline=sanitize_text(data.get('eventDeadline', ''), 100),
                                reward=sanitize_text(data.get('eventReward', ''), 200))
        db.session.add(ann)
        db.session.commit()
        return jsonify({'success': True, 'announcement': {'id': ann.id, 'title': ann.title}})

    @app.route('/api/school/<int:school_id>/announcement/<int:ann_id>/delete', methods=['POST'])
    @login_required
    def api_delete_announcement(school_id, ann_id):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        ann = SchoolAnnouncement.query.get_or_404(ann_id)
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

    @app.route('/api/ad/<int:ad_id>/click', methods=['POST'])
    def api_ad_click(ad_id):
        ad = Ad.query.get_or_404(ad_id)
        ad.clicks = (ad.clicks or 0) + 1
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
        return jsonify({'verified_achievements': v_count, 'projects': p_count, 'collaborations': 0})

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
        ads_list = Ad.query.limit(20).all()
        return jsonify({'ads': [{'id': a.id, 'title': a.title, 'company': a.company, 'content': a.content, 'cta_text': a.cta_text, 'cta_url': a.cta_url, 'placement': a.placement, 'clicks': a.clicks, 'impressions': a.impressions} for a in ads_list]})

    @app.route('/api/switch-role', methods=['POST'])
    @login_required
    def api_switch_role():
        data = request.json or {}
        new_role = data.get('role', 'student')
        if new_role not in ('student', 'teacher', 'mentor', 'admin'):
            return jsonify({'error': 'Invalid role'}), 400
        flask_session['view_role'] = new_role
        return jsonify({'success': True})

    @app.route('/api/search')
    @login_required
    def api_search():
        q = request.args.get('q', '').strip().lower()
        if not q:
            return jsonify({'users': [], 'schools': [], 'achievements': []})
        if len(q) > 200:
            return jsonify({'users': [], 'schools': [], 'achievements': []})
        users = User.query.filter(User.name.ilike(f'%{q}%')).limit(5).all()
        schools = School.query.filter(School.name.ilike(f'%{q}%')).limit(5).all()
        achs = Achievement.query.filter(Achievement.title.ilike(f'%{q}%')).limit(5).all()
        return jsonify({'users': [{'id': u.id, 'name': u.name, 'school': u.school, 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'role': u.role, 'username': u.username, 'verified': _is_verified(u)} for u in users], 'schools': [{'id': s.id, 'name': s.name, 'location': s.location or ''} for s in schools], 'achievements': [{'id': a.id, 'title': a.title, 'user_id': a.user_id} for a in achs]})

    @app.route('/api/notifications')
    @login_required
    def api_notifications():
        notifs = get_user_notifications(current_user.id)
        return jsonify({'notifications': [{'id': n.id, 'title': n.title, 'type': n.type, 'timestamp': n.timestamp, 'unread': n.unread} for n in notifs]})

    @app.route('/api/notifications/read', methods=['POST'])
    @login_required
    def api_notifications_read():
        Notification.query.filter_by(user_id=current_user.id).update({'unread': False})
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/messages')
    @login_required
    def api_messages():
        contact_id = request.args.get('contact_id', type=int)
        if contact_id:
            msgs = ChatMessage.query.filter(((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == contact_id)) | ((ChatMessage.sender_id == contact_id) & (ChatMessage.receiver_id == current_user.id))).order_by(ChatMessage.id.asc()).all()
            return jsonify({'messages': [{'id': m.id, 'sender_id': m.sender_id, 'text': m.text, 'timestamp': m.timestamp} for m in msgs]})
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
        db.session.commit()
        return jsonify({'success': True, 'message': {'id': msg.id, 'sender_id': msg.sender_id, 'text': msg.text, 'timestamp': msg.timestamp}})

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
            'user': {'name': users[r.user_id].name, 'avatar': users[r.user_id].avatar_url or users[r.user_id].avatar or users[r.user_id].name[:2].upper()}
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
        return jsonify({'friends': [{'id': u.id, 'name': u.name, 'avatar': u.avatar_url or u.avatar or u.name[:2].upper(), 'school': u.school} for u in users]})

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
            'id': u.id, 'name': u.name, 'avatar': u.avatar_url or u.avatar or u.name[:2].upper(),
            'school': u.school, 'username': u.username,
            'mutual': len(my_ids & {u.id})
        } for u in users]})

    @app.route('/api/connection/toggle', methods=['POST'])
    @login_required
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
            try:
                from PIL import Image
                img = Image.open(f)
                img.verify()
                f.seek(0)
            except Exception:
                return jsonify({"success": False, "error": "Invalid image file"}), 400
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
    def api_seed():
        if User.query.first():
            return jsonify({"message": "Already seeded"})
        from seed import _run_seed
        _run_seed(bcrypt)
        return jsonify({"message": "Database seeded!", "users": ["aarav@scholrnet.com/student123", "shreya@scholrnet.com/school123", "admin@scholrnet.com/admin123"]})

    @app.route('/api/reset-db')
    def api_reset_db():
        from seed import _run_seed
        _run_seed(bcrypt)
        return jsonify({"message": "Database reset and re-seeded!", "users": ["aarav@scholrnet.com/student123", "shreya@scholrnet.com/school123", "admin@scholrnet.com/admin123"]})

    @app.route('/api/clean-data')
    def api_clean_data():
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
        return jsonify({'schools': [{'id': s.id, 'name': s.name, 'location': s.location or '', 'tagline': s.tagline or ''} for s in schools]})

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
        return jsonify({'success': True, 'email': email, 'password': pwd})

    @app.route('/api/health')
    def api_health():
        return jsonify({
            "status": "healthy",
            "supabase_url_set": bool(supabase_url),
            "supabase_key_set": bool(supabase_key)
        })

    @app.route('/api/migrate')
    def api_migrate():
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
            exp_cols = [c['name'] for c in inspector.get_columns('experiences')] if 'experiences' in [t for t, in db.engine.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='experiences'").fetchall()] else []
            if not exp_cols:
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS experiences (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            company VARCHAR(200) NOT NULL,
                            role VARCHAR(200) NOT NULL,
                            description TEXT DEFAULT '',
                            skills VARCHAR(500) DEFAULT '',
                            start_date VARCHAR(20) DEFAULT '',
                            end_date VARCHAR(20) DEFAULT '',
                            is_current BOOLEAN DEFAULT 0,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    conn.commit()
                mig.append("created experiences table")
        except Exception as e:
            return jsonify({"error": str(e), "ran": mig}), 500
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
    def api_diag_storage():
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
