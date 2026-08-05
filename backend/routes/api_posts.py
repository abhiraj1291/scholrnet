import os, json, uuid, secrets, random
from datetime import datetime, timezone
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, Post, Comment, UserLike, Achievement, Project, Experience, Connection, Notification, ClubMember, Opportunity, TeamRequest, TeamApplicant, VerificationRequest, MentorshipRequest, MentorInteraction, AuditLog
from utils.sanitizers import sanitize_text, validate_file_type, MAX_CONTENT_LEN
from services.helpers import is_verified, short_ts, audit_log, get_gemini_client
from services.upload import save_to_supabase
from extensions import limiter

posts_bp = Blueprint('posts', __name__, url_prefix='')


def jnow():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


@posts_bp.route('/api/post/create', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
def api_create_post():
    supabase_url = current_app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = current_app.config.get("SUPABASE_STORAGE_KEY", "")
    errors = []
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        uploaded = request.files.getlist('files')
        MAX_FILES = 10
        MAX_FILE_SIZE = 5 * 1024 * 1024
        if len(uploaded) > MAX_FILES:
            return jsonify({'error': f'Max {MAX_FILES} files per post'}), 400
        image_urls = []
        for f in uploaded[:MAX_FILES]:
            if f and f.filename:
                ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
                allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov'}
                if ext not in allowed_ext:
                    errors.append(f'{f.filename}: type .{ext} not allowed')
                    continue
                f.seek(0, os.SEEK_END)
                size = f.tell()
                f.seek(0)
                if size > MAX_FILE_SIZE:
                    errors.append(f'{f.filename}: exceeds 5MB limit')
                    continue
                valid, msg = validate_file_type(f, allowed_ext, ['image/', 'video/'])
                if not valid:
                    errors.append(f'{f.filename}: {msg}')
                    continue
                safe_name = f"{uuid.uuid4().hex[:16]}_{current_user.id}.{ext}"
                url = save_to_supabase(f.read(), 'uploads', safe_name, supabase_url=supabase_url, supabase_key=supabase_key)
                if url:
                    image_urls.append(url)
                else:
                    errors.append(f'{f.filename}: upload failed')
        image_url = '|||'.join(image_urls)
    else:
        data = request.json or {}
        image_url = sanitize_text(data.get('imageUrl', ''), 500)
    tags_raw = data.get('tags', [])
    if isinstance(tags_raw, str):
        tags_raw = [sanitize_text(t, 50) for t in tags_raw.split(',') if t.strip()]
    elif isinstance(tags_raw, list):
        tags_raw = [sanitize_text(str(t), 50) for t in tags_raw if t]
    try:
        club_id = int(data.get('club_id'))
    except (TypeError, ValueError):
        club_id = None
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
    try:
        friend_conns = Connection.query.filter(
            ((Connection.user_id == current_user.id) | (Connection.connected_user_id == current_user.id)),
            Connection.status == 'accepted'
        ).all()
        friend_ids = set(c.connected_user_id if c.user_id == current_user.id else c.user_id for c in friend_conns)
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
        'badge_text': post.badge_text, 'timestamp': post.timestamp,
        'author_id': post.author_id
    }})


@posts_bp.route('/api/post/<int:post_id>/like', methods=['POST'])
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


@posts_bp.route('/api/post/<int:post_id>/comment', methods=['POST'])
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


@posts_bp.route('/api/post/<int:post_id>/comments', methods=['GET'])
@login_required
def api_get_comments(post_id):
    comment_rows = Comment.query.with_entities(Comment.id, Comment.author, Comment.avatar, Comment.text, Comment.timestamp).filter_by(post_id=post_id).order_by(Comment.id.asc()).all()
    return jsonify({'comments': [{'id': c.id, 'author': {'name': c.author, 'avatar': c.avatar}, 'text': c.text, 'timestamp': c.timestamp} for c in comment_rows]})


@posts_bp.route('/api/post/<int:post_id>/delete', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    if current_user.role != 'super_admin' and post.author_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    try:
        Comment.query.filter_by(post_id=post_id).delete()
        UserLike.query.filter_by(post_id=post_id).delete()
        db.session.delete(post)
        db.session.commit()
        audit_log('delete_post', 'post', post_id)
        return jsonify({'success': True})
    except Exception:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return jsonify({'error': 'Could not delete post'}), 500


@posts_bp.route('/api/post/<int:post_id>/edit', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def api_edit_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.author_id != current_user.id and current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json or {}
    if 'title' in data:
        post.title = sanitize_text(data['title'], 200)
    if 'content' in data:
        post.content = sanitize_text(data['content'], 10000)
    if 'tags' in data:
        tags_raw = data['tags']
        if isinstance(tags_raw, str):
            tags_raw = [sanitize_text(t, 50) for t in tags_raw.split(',') if t.strip()]
        elif isinstance(tags_raw, list):
            tags_raw = [sanitize_text(str(t), 50) for t in tags_raw if t]
        post.tags = json.dumps(tags_raw[:20])
    if 'badge_text' in data:
        post.badge_text = sanitize_text(data['badge_text'], 100)
    post.timestamp = short_ts()
    db.session.commit()
    audit_log('edit_post', 'post', post_id)
    return jsonify({'success': True})


@posts_bp.route('/api/posts')
@login_required
def api_posts():
    page = request.args.get('page', 1, type=int)
    if page < 1:
        page = 1
    if page > 1000:
        return jsonify({'posts': [], 'has_more': False})
    per_page = 10
    from sqlalchemy import case as _case, literal as _literal
    friend_ids = set()
    friend_conns = Connection.query.filter(
        ((Connection.user_id == current_user.id) | (Connection.connected_user_id == current_user.id)),
        Connection.status == 'accepted'
    ).all()
    for c in friend_conns:
        friend_ids.add(c.connected_user_id if c.user_id == current_user.id else c.user_id)
    mode = request.args.get('mode', 'feed')
    if mode == 'explore':
        conn_boost = _case((Post.author_id.in_(friend_ids), 50), else_=0) if friend_ids else _literal(0)
        posts_q = Post.query.filter(Post.club_id.is_(None)).order_by(
            (conn_boost + Post.likes * 10).desc(), Post.id.desc()
        ).offset((page-1)*per_page).limit(per_page+1).all()
    else:
        conn_boost = _case((Post.author_id.in_(friend_ids), 100), else_=0) if friend_ids else _literal(0)
        posts_q = Post.query.filter(Post.club_id.is_(None)).order_by(
            (conn_boost + Post.likes * 2).desc(), Post.id.desc()
        ).offset((page-1)*per_page).limit(per_page+1).all()
    has_more = len(posts_q) > per_page
    posts = posts_q[:per_page]
    post_ids = [p.id for p in posts]
    liked_ids = set(ul.post_id for ul in UserLike.query.filter(UserLike.user_id == current_user.id, UserLike.post_id.in_(post_ids)).all()) if post_ids else set()
    author_ids = set(p.author_id for p in posts if p.author_id)
    authors = {u.id: u for u in User.query.filter(User.id.in_(author_ids)).all()} if author_ids else {}
    comments_by_post = {}
    if post_ids:
        all_comments = Comment.query.filter(Comment.post_id.in_(post_ids)).order_by(Comment.id.asc()).all()
        for c in all_comments:
            comments_by_post.setdefault(c.post_id, []).append({'id': c.id, 'author': c.author, 'text': c.text, 'timestamp': c.timestamp})
    def fmt_ts(p):
        ts = p.timestamp
        if not ts or ts == 'Just now':
            return None
        return ts
    return jsonify({
        'posts': [{
            'id': p.id, 'title': p.title, 'content': p.content, 'type': p.type,
            'badge': p.badge_text, 'image_url': p.image_url, 'video_url': p.video_url,
            'likes_count': p.likes or 0, 'is_liked': p.id in liked_ids,
            'tags': json.loads(p.tags) if p.tags else [],
            'comments': comments_by_post.get(p.id, []),
            'timestamp': fmt_ts(p),
            'author': {'id': p.author_id, 'name': p.author_name, 'school': p.author_school, 'avatar': p.author_avatar,
                      'avatar_url': authors.get(p.author_id).avatar_url if p.author_id and p.author_id in authors else '',
                      'role': authors.get(p.author_id).role if p.author_id and p.author_id in authors else '',
                      'username': authors.get(p.author_id).username if p.author_id and p.author_id in authors else '',
                      'verified': is_verified(authors.get(p.author_id)) if p.author_id else False}
        } for p in posts],
        'has_more': has_more
    })


@posts_bp.route('/api/achievement/create', methods=['POST'])
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


@posts_bp.route('/api/achievement/<int:ach_id>/delete', methods=['POST'])
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


@posts_bp.route('/api/achievement/<int:ach_id>/verify-request', methods=['POST'])
@login_required
# limiter: 10 per minute
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


@posts_bp.route('/api/achievements')
@login_required
def api_achievements():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 50
        pagination = Achievement.query.filter_by(user_id=current_user.id).order_by(Achievement.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
        achs = pagination.items
        return jsonify({'achievements': [{
            'id': a.id, 'title': a.title, 'description': a.description,
            'category': a.category, 'institution': a.institution,
            'year': a.year, 'verified': a.verification_status == 'Verified',
            'verification_status': a.verification_status,
            'verification_hash': a.verification_hash if current_user.role == 'super_admin' else ''
        } for a in achs],
        'total': pagination.total, 'pages': pagination.pages, 'page': page})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'achievements': []})


@posts_bp.route('/api/project/create', methods=['POST'])
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


@posts_bp.route('/api/project/<int:proj_id>/delete', methods=['POST'])
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


@posts_bp.route('/api/projects')
@login_required
def api_projects():
    try:
        user_id = request.args.get('user_id', type=int) or current_user.id
        page = request.args.get('page', 1, type=int)
        per_page = 50
        pagination = Project.query.filter_by(user_id=user_id).order_by(Project.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
        projs = pagination.items
        return jsonify({'projects': [{'id': p.id, 'title': p.title, 'description': p.description, 'collaborators': p.collaborators, 'link': p.link, 'skills': p.skills, 'verification_status': p.verification_status} for p in projs],
        'total': pagination.total, 'pages': pagination.pages, 'page': page})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'projects': []})


@posts_bp.route('/api/user/<int:user_id>/achievements')
@login_required
def api_user_achievements(user_id):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 50
        pagination = Achievement.query.filter_by(user_id=user_id).order_by(Achievement.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
        achs = pagination.items
        return jsonify({'achievements': [{
            'id': a.id, 'title': a.title, 'description': a.description,
            'category': a.category, 'institution': a.institution,
            'year': a.year, 'verified': a.verification_status == 'Verified',
            'verification_status': a.verification_status,
            'verification_hash': a.verification_hash if current_user.id == user_id or current_user.role == 'super_admin' else ''
        } for a in achs],
        'total': pagination.total, 'pages': pagination.pages, 'page': page})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'achievements': []})


@posts_bp.route('/api/user/<int:user_id>/projects')
@login_required
def api_user_projects(user_id):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 50
        pagination = Project.query.filter_by(user_id=user_id).order_by(Project.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
        projs = pagination.items
        return jsonify({'projects': [{
            'id': p.id, 'title': p.title, 'description': p.description,
            'collaborators': p.collaborators, 'link': p.link,
            'skills': [s.strip() for s in (p.skills or '').split(',') if s.strip()]
        } for p in projs],
        'total': pagination.total, 'pages': pagination.pages, 'page': page})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'projects': []})


@posts_bp.route('/api/user/<int:user_id>/experiences', methods=['GET'])
@login_required
def api_get_experiences(user_id):
    try:
        exps = Experience.query.filter_by(user_id=user_id).order_by(Experience.is_current.desc(), Experience.id.desc()).all()
        return jsonify({'experiences': [{
            'id': e.id, 'company': e.company, 'role': e.role, 'description': e.description,
            'skills': e.skills, 'start_date': e.start_date, 'end_date': e.end_date,
            'is_current': e.is_current, 'created_at': e.created_at.isoformat() if e.created_at else ''
        } for e in exps]})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'experiences': []})


@posts_bp.route('/api/experience/create', methods=['POST'])
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


@posts_bp.route('/api/experience/<int:exp_id>/edit', methods=['POST'])
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


@posts_bp.route('/api/experience/<int:exp_id>/delete', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def api_delete_experience(exp_id):
    exp = Experience.query.get_or_404(exp_id)
    if exp.user_id != current_user.id and current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(exp)
    db.session.commit()
    return jsonify({'success': True})


@posts_bp.route('/api/verification-requests')
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
    return jsonify({'requests': [{
        'id': r.id, 'user_id': r.user_id, 'student_name': r.student_name,
        'student_school': r.student_school, 'achievement_title': r.achievement_title,
        'category': r.category, 'institution': r.institution, 'year': r.year,
        'details': r.details, 'status': r.status, 'requested_at': r.requested_at
    } for r in reqs]})


@posts_bp.route('/api/verification-request', methods=['POST'])
@login_required
# limiter: 10 per minute
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


@posts_bp.route('/api/verification/<int:req_id>/action', methods=['POST'])
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


@posts_bp.route('/api/opportunities/recommended')
@login_required
def api_opportunities_recommended():
    try:
        grade = (current_user.grade or '').lower()
        school = (current_user.school or '').lower()
        user_tags = set()
        for a in Achievement.query.filter_by(user_id=current_user.id).limit(20).all():
            if a.category:
                user_tags.add(a.category.lower())
        for p in Project.query.filter_by(user_id=current_user.id).limit(20).all():
            if p.skills:
                for s in p.skills.split(','):
                    s = s.strip().lower()
                    if s:
                        user_tags.add(s)
        ops = Opportunity.query.order_by(Opportunity.id.desc()).limit(50).all()
        scored = []
        for op in ops:
            score = 0
            desc = (op.description or '').lower()
            name = (op.name or '').lower()
            elg = (op.eligibility or '').lower()
            if grade and grade in elg:
                score += 30
            if school and school in desc:
                score += 20
            for tag in user_tags:
                if tag in name or tag in desc:
                    score += 10
            if op.deadline:
                try:
                    from datetime import datetime as _dt
                    dl = _dt.strptime(op.deadline, '%Y-%m-%d') if '-' in op.deadline else None
                    if dl and dl > _dt.now():
                        days_left = (dl - _dt.now()).days
                        score += max(0, 30 - days_left)
                except Exception:
                    pass
            scored.append((score, op))
        scored.sort(key=lambda x: -x[0])
        top = [{'id': o.id, 'name': o.name, 'type': o.type, 'provider': o.provider,
                'deadline': o.deadline, 'description': (o.description or '')[:200],
                'prize_pool': o.prize_pool, 'score': s} for s, o in scored[:10]]
        return jsonify({'opportunities': top})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'opportunities': []})


@posts_bp.route('/api/opportunity/<int:opp_id>/apply', methods=['POST'])
@login_required
# limiter: 10 per minute
def api_apply_opportunity(opp_id):
    opp = Opportunity.query.get_or_404(opp_id)
    notif = Notification(user_id=current_user.id, title=f"Applied to {sanitize_text(opp.name, 100)}!", type='success', timestamp=short_ts(), unread=True)
    db.session.add(notif)
    db.session.commit()
    return jsonify({'success': True})


@posts_bp.route('/api/team/create', methods=['POST'])
@login_required
# limiter: 10 per minute
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


@posts_bp.route('/api/team/<int:team_id>/apply', methods=['POST'])
@login_required
# limiter: 10 per minute
def api_apply_team(team_id):
    a = TeamApplicant(team_request_id=team_id, name=current_user.name, school=sanitize_text(current_user.school, 200), status='pending')
    db.session.add(a)
    db.session.commit()
    return jsonify({'success': True})


@posts_bp.route('/api/team/<int:team_id>/applicants', methods=['GET'])
@login_required
def api_team_applicants(team_id):
    apps = TeamApplicant.query.filter_by(team_request_id=team_id).all()
    return jsonify({'applicants': [{'id': a.id, 'name': a.name, 'school': a.school, 'status': a.status} for a in apps]})


@posts_bp.route('/api/team/<int:team_id>/applicant/<string:action>', methods=['POST'])
@login_required
# limiter: 20 per minute
def api_team_applicant_action(team_id, action):
    if action not in ('approve', 'reject'):
        return jsonify({'error': 'Invalid action'}), 400
    data = request.json or {}
    applicant_id = data.get('applicant_id')
    if not applicant_id:
        return jsonify({'error': 'Missing applicant_id'}), 400
    team = TeamRequest.query.get_or_404(team_id)
    if team.creator_id != current_user.id and current_user.role != 'super_admin':
        return jsonify({'error': 'Only the team creator can manage applicants'}), 403
    app = TeamApplicant.query.get_or_404(applicant_id)
    if app.team_request_id != team_id:
        return jsonify({'error': 'Applicant not found for this team'}), 400
    app.status = 'approved' if action == 'approve' else 'rejected'
    db.session.commit()
    return jsonify({'success': True, 'status': app.status})


@posts_bp.route('/api/mentorship/send', methods=['POST'])
@login_required
# limiter: 10 per minute
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


@posts_bp.route('/api/mentorship/<int:mreq_id>/interaction', methods=['POST'])
@login_required
# limiter: 20 per minute
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


@posts_bp.route('/api/mentorship/<int:mreq_id>/complete', methods=['POST'])
@login_required
# limiter: 20 per minute
def api_complete_mentorship(mreq_id):
    mreq = MentorshipRequest.query.get_or_404(mreq_id)
    if mreq.student_id != current_user.id and mreq.mentor_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    mreq.status = 'completed'
    db.session.commit()
    return jsonify({'success': True})


@posts_bp.route('/api/mentorship/<int:mreq_id>/respond', methods=['POST'])
@login_required
# limiter: 20 per minute
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


@posts_bp.route('/api/trending/topics')
@login_required
# limiter: 30 per minute
def api_trending_topics():
    try:
        recent_tag_rows = db.session.query(Post.tags).filter(Post.tags.isnot(None), Post.tags != '').order_by(Post.id.desc()).limit(200).all()
        tag_count = {}
        for (tags_str,) in recent_tag_rows:
            try:
                tags = json.loads(tags_str) if isinstance(tags_str, str) else (tags_str or [])
            except (json.JSONDecodeError, TypeError):
                tags = tags_str.split(',') if isinstance(tags_str, str) and tags_str else []
            for t in tags:
                t = t.strip().lower()
                if t and len(t) < 50:
                    tag_count[t] = tag_count.get(t, 0) + 1
        sorted_tags = sorted(tag_count.items(), key=lambda x: -x[1])[:15]
        return jsonify({'topics': [{'tag': t, 'count': c} for t, c in sorted_tags]})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'topics': []})


@posts_bp.route('/api/upload', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_upload():
    supabase_url = current_app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = current_app.config.get("SUPABASE_STORAGE_KEY", "")
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
    url = save_to_supabase(f.read(), 'uploads', safe_name, supabase_url=supabase_url, supabase_key=supabase_key)
    if not url:
        return jsonify({"success": False, "error": "Failed to upload file"}), 500
    return jsonify({"success": True, "url": url})


@posts_bp.route('/api/upload-token')
@login_required
@limiter.limit("30 per minute")
def api_upload_token():
    supabase_url = current_app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = current_app.config.get("SUPABASE_STORAGE_KEY", "")
    import urllib.request, json as json_module
    ext = request.args.get('ext', 'png').lower()
    allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov'}
    if ext not in allowed_ext:
        return jsonify({"error": f"Extension .{ext} not allowed"}), 400
    safe_name = f"{uuid.uuid4().hex[:16]}_{current_user.id}.{ext}"
    public_url = f"{supabase_url}/storage/v1/object/public/uploads/{safe_name}"
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
    return jsonify({"uploadUrl": "", "publicUrl": public_url})


@posts_bp.route('/api/gemini/status')
@login_required
def api_gemini_status():
    groq_key = current_user.get_decrypted_groq_key() or current_app.config.get("GROQ_API_KEY", "")
    return jsonify({"configured": bool(groq_key) or get_gemini_client() is not None})


def _portfolio_context(u):
    """Build a compact academic portfolio summary for AI prompts."""
    parts = [f"Name: {u.name or 'Student'}, Grade: {u.grade or 'Not set'}, School: {u.school or 'Not set'}"]
    if getattr(u, 'bio', ''):
        parts.append(f"Bio: {sanitize_text(u.bio, 300)}")
    achs = Achievement.query.filter_by(user_id=u.id).order_by(Achievement.id.desc()).limit(15).all()
    if achs:
        lines = []
        for a in achs:
            status = 'Verified' if a.verification_status == 'Verified' else 'Unverified'
            extra = a.year or ''
            if a.institution:
                extra = (extra + ', ' if extra else '') + a.institution
            desc = sanitize_text(a.description, 90)
            if desc:
                extra = (extra + ' — ' if extra else '') + desc
            lines.append(f"- {a.title} ({a.category or 'Achievement'}) [{status}]" + (f" {extra}" if extra else ""))
        parts.append("Achievements:\n" + "\n".join(lines))
    projs = Project.query.filter_by(user_id=u.id).order_by(Project.id.desc()).limit(10).all()
    if projs:
        lines = []
        for p in projs:
            status = 'Verified' if p.verification_status == 'Verified' else 'Unverified'
            desc = sanitize_text(p.description, 90)
            line = f"- {p.title} [{status}]"
            if p.skills:
                line += f", skills: {sanitize_text(p.skills, 120)}"
            if desc:
                line += f" — {desc}"
            lines.append(line)
        parts.append("Projects:\n" + "\n".join(lines))
    exps = Experience.query.filter_by(user_id=u.id).order_by(Experience.id.desc()).limit(6).all()
    if exps:
        lines = []
        for e in exps:
            line = f"- {e.role} at {e.company}"
            if e.description:
                line += f" — {sanitize_text(e.description, 90)}"
            lines.append(line)
        parts.append("Experience:\n" + "\n".join(lines))
    return "\n".join(parts)


def _gemini_reply(client, system, user_msg):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{system}\n\n{user_msg}",
        config={"max_output_tokens": 1200}
    )
    return (response.text or "").strip()


def _groq_chat(system, user_msg, key):
    import json, urllib.request
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg}
    ]
    last = None
    for model in ("llama-3.3-70b-versatile", "llama-3.1-8b-instant"):
        try:
            body = json.dumps({"model": model, "messages": messages, "max_tokens": 1200}).encode()
            req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions",
                data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
            resp = json.loads(urllib.request.urlopen(req, timeout=25).read())
            return resp["choices"][0]["message"]["content"].strip()
        except Exception as e:
            last = e
    raise last


def _mentor_reply(system, user_msg):
    """Reply via Groq (primary, free tier) with Gemini as automatic fallback."""
    groq_key = current_user.get_decrypted_groq_key() or current_app.config.get("GROQ_API_KEY", "")
    if groq_key:
        try:
            return _groq_chat(system, user_msg, groq_key)
        except Exception as e:
            current_app.logger.error(f"Groq mentor error: {e}")
    client = get_gemini_client()
    if client:
        try:
            return _gemini_reply(client, system, user_msg)
        except Exception as e:
            current_app.logger.error(f"Gemini mentor error: {e}")
    return None


_ADVISOR_SYSTEM = (
    "You are ScholrAI, a friendly AI career and academic mentor for high school and early-college "
    "students in India. Give specific, actionable advice with concrete examples (real competitions, "
    "scholarships, internships, projects, platforms). Be encouraging but honest. Use markdown: short "
    "headings, bold, and bullet lists. Keep answers under 350 words. Never invent fake student success "
    "stories, fake user counts, or fake partnerships."
)


@posts_bp.route('/api/gemini/analyze-portfolio', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def api_gemini_analyze():
    try:
        prompt = (
            "Analyze this student's academic portfolio and give a detailed review:\n\n"
            + _portfolio_context(current_user) +
            "\n\nProvide: 1) Overall assessment (2-3 sentences). 2) Top 3 strengths with reasons. "
            "3) Gaps or weaknesses. 4) Five specific suggestions with concrete examples — e.g. "
            "scholarships, competitions, internships, or projects to build — matched to their grade, "
            "school, and achievements. Format as markdown with short headings and bullets."
        )
        answer = _mentor_reply(_ADVISOR_SYSTEM, prompt)
        if not answer:
            return jsonify({"answer": "**Portfolio summary**\n\n- **Academic Dedication** — you're building a portfolio, which already puts you ahead.\n- **Next step:** add and verify more achievements so colleges and employers can trust your profile.\n\nTry adding your top 3 achievements with certificates and getting them verified by your school counselor.", "suggestions": ["Give me a 30-day improvement plan", "Which scholarships fit my profile?", "What projects should I build?"]})
        return jsonify({"answer": answer, "suggestions": ["Give me a 30-day improvement plan", "Which scholarships fit my profile?", "What projects should I build next?"]})
    except Exception as e:
        current_app.logger.error(f"Mentor analyze error: {e}")
        return jsonify({"answer": "Sorry, I couldn't analyze your portfolio right now. Please try again in a moment.", "suggestions": ["Retry portfolio analysis"]})


@posts_bp.route('/api/gemini/analyze-profile', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def api_gemini_analyze_profile():
    data = request.json or {}
    ref = sanitize_text(data.get('profile') or data.get('username') or data.get('url') or data.get('profile_id', ''), 200).strip()
    if not ref:
        return jsonify({"error": "Profile link or username is required"}), 400
    target = None
    if ref.isdigit():
        target = User.query.get(int(ref))
    else:
        username = ref.rstrip('/').split('/')[-1].lower()
        target = User.query.filter_by(username=username).first()
    if not target:
        return jsonify({"error": "Profile not found. Check the link or username and try again."}), 404
    try:
        prompt = (
            "Analyze this student's profile and give constructive feedback they could use to grow:\n\n"
            + _portfolio_context(target) +
            "\n\nProvide: 1) A 2-3 sentence assessment of their profile. 2) What they're doing well "
            "with examples from their own achievements/projects. 3) 5 specific suggestions with "
            "concrete examples (scholarships, competitions, internships, projects, skills) tailored "
            "to their grade and interests. 4) If most achievements are unverified, explain why "
            "verification matters. Format as markdown with short headings and bullets."
        )
        answer = _mentor_reply(_ADVISOR_SYSTEM, prompt)
        if not answer:
            return jsonify({"answer": f"**Quick look at {target.name}'s profile**\n\n- **What stands out:** their school, grade, and portfolio structure.\n- **Next step:** ask them to verify their achievements so the profile is fully credible.\n\nFor a deeper AI review, configure a Groq or Gemini API key in the project settings.", "suggestions": ["How is my profile compared to theirs?", "What can I learn from their path?"]})
        return jsonify({"answer": answer, "suggestions": ["How is my profile compared to theirs?", "What can I learn from their path?", "Suggest opportunities similar to theirs"]})
    except Exception as e:
        current_app.logger.error(f"Mentor analyze-profile error: {e}")
        return jsonify({"answer": "Sorry, I couldn't analyze that profile right now. Please try again in a moment.", "suggestions": ["Retry profile analysis"]})


@posts_bp.route('/api/gemini/ask-advisor', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_gemini_ask():
    data = request.json or {}
    user_msg = sanitize_text(data.get('message') or data.get('question', ''), 2000)
    if not user_msg:
        return jsonify({"error": "Message is required"}), 400
    try:
        history = data.get('history') or []
        turns = []
        for m in history[-6:]:
            if isinstance(m, dict):
                role = 'user' if m.get('role') == 'user' else 'assistant'
                txt = sanitize_text(str(m.get('content', ''))[:800], 800)
                if txt:
                    turns.append(f"{role}: {txt}")
        context = _portfolio_context(current_user)
        system = _ADVISOR_SYSTEM + "\n\nThe student's own portfolio (use it to personalize your answer):\n" + context
        user_msg_full = "Previous conversation:\n" + "\n".join(turns) + "\n\nLatest question: " + user_msg
        answer = _mentor_reply(system, user_msg_full)
        if not answer:
            fallbacks = [
                "To apply for CBSE gold seals, upload your certificate and request verification.",
                "KVPY fellowships require verified academic evidence.",
                "For research projects, host code on GitHub and link to your profile.",
                "Start with the opportunities in the feed — filter by your grade and interests.",
            ]
            return jsonify({"answer": random.choice(fallbacks), "suggestions": ["Find internships for me", "Scholarships I should apply to", "Review my portfolio"]})
        return jsonify({"answer": answer, "suggestions": ["Give me a step-by-step plan", "More details, please", "What about scholarships?"]})
    except Exception as e:
        current_app.logger.error(f"Mentor ask error: {e}")
        return jsonify({"answer": "Sorry, I'm having trouble right now. Please try again later.", "suggestions": ["Retry"]})


@posts_bp.route('/api/switch-role', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def api_switch_role():
    data = request.json or {}
    new_role = data.get('role', 'student')
    if new_role not in ('student', 'teacher', 'mentor', 'admin'):
        return jsonify({'error': 'Invalid role'}), 400
    session['view_role'] = new_role
    return jsonify({'success': True})
