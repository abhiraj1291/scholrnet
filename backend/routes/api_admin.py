import re
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, Post, Comment, UserLike, Ad, Club, School, SchoolAnnouncement, VerificationRequest, AuditLog, PolicyVersion
from utils.sanitizers import sanitize_text
from utils.decorators import super_admin_required
from services.helpers import is_verified, short_ts, audit_log, active_ads

api_bp = Blueprint('api', __name__, url_prefix='')


@api_bp.route('/api/admin/posts')
@login_required
def api_admin_posts():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    posts = Post.query.with_entities(Post.id, Post.author_id, Post.title, Post.content, Post.likes, Post.timestamp).order_by(Post.id.desc()).limit(50).all()
    uids = set(p.author_id for p in posts if p.author_id)
    user_rows = db.session.query(User.id, User.name, User.avatar).filter(User.id.in_(uids)).all() if uids else []
    users = {u.id: {'name': u.name, 'avatar': u.avatar} for u in user_rows}
    return jsonify({'posts': [{'id': p.id, 'title': p.title, 'content': p.content, 'likes_count': p.likes or 0, 'created_at': p.timestamp or '', 'author': users.get(p.author_id, {'name': 'Unknown', 'avatar': ''})} for p in posts]})


@api_bp.route('/api/admin/post/<int:post_id>/delete', methods=['DELETE'])
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


@api_bp.route('/api/admin/ads')
@login_required
def api_admin_ads():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    page = request.args.get('page', 1, type=int)
    per_page = 50
    pagination = Ad.query.order_by(Ad.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    ads = pagination.items
    return jsonify({'ads': [{'id': a.id, 'title': a.title, 'company': a.company, 'content': a.content, 'image': a.image, 'placement': a.placement, 'cta_url': a.cta_url, 'cta_text': a.cta_text, 'active': a.active, 'target_role': a.target_role, 'clicks': a.clicks, 'impressions': a.impressions, 'created_at': a.created_at.isoformat() if a.created_at else ''} for a in ads],
    'total': pagination.total, 'pages': pagination.pages, 'page': page})


@api_bp.route('/api/admin/ad/create', methods=['POST'])
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


@api_bp.route('/api/admin/ad/<int:ad_id>/toggle', methods=['POST'])
@login_required
def api_admin_ad_toggle(ad_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    ad = Ad.query.get_or_404(ad_id)
    ad.active = not ad.active
    db.session.commit()
    return jsonify({'success': True, 'active': ad.active})


@api_bp.route('/api/admin/ad/<int:ad_id>/delete', methods=['DELETE'])
@login_required
def api_admin_delete_ad(ad_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    ad = Ad.query.get_or_404(ad_id)
    audit_log('delete_ad', 'ad', ad_id, f'title={ad.title}')
    db.session.delete(ad)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.route('/api/admin/schools')
@login_required
def api_admin_schools():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    schools = School.query.order_by(School.id.desc()).all()
    result = []
    for s in schools:
        admin = User.query.filter_by(school=s.name, role='admin').first()
        student_count = User.query.filter_by(school=s.name, role='student').count()
        verified_count = User.query.filter_by(verified_school_id=s.id, school_verified=True).count()
        club_count = Club.query.filter(Club.name.ilike(f'%{s.name}%')).count()
        result.append({
            'id': s.id, 'name': s.name, 'location': s.location or '',
            'tagline': s.tagline or '', 'about': s.about or '',
            'established': s.established or '', 'verification_code': s.verification_code or '',
            'admin_email': admin.email if admin else '',
            'student_count': student_count,
            'verified_count': verified_count,
            'club_count': club_count
        })
    return jsonify({'schools': result})


@api_bp.route('/api/admin/school/create', methods=['POST'])
@login_required
def api_admin_create_school():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json or {}
    name = sanitize_text(data.get('name', ''), 200)
    if not name:
        return jsonify({'success': False, 'error': 'School name required'}), 400
    school = School(name=name, location=sanitize_text(data.get('location', ''), 200), tagline=sanitize_text(data.get('tagline', ''), 200), about=sanitize_text(data.get('about', ''), 1000), established=sanitize_text(data.get('established', ''), 20))
    import secrets, string
    school.verification_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    db.session.add(school)
    db.session.flush()
    email = name.lower().replace(' ', '').replace('.', '')[:30] + '@scholrnet.com'
    pwd = 'School' + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10)) + '!'
    existing = User.query.filter_by(email=email).first()
    if existing:
        email = 'school' + str(school.id) + '@scholrnet.com'
    username = sanitize_text(data.get('username', ''), 30).strip().lower()
    if username:
        if not re.match(r'^[a-z0-9_]{3,30}$', username):
            return jsonify({'success': False, 'error': 'Invalid username format'}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'error': 'Username already taken'}), 400
    from extensions import bcrypt
    user = User(name=name + ' Admin', email=email, password_hash=bcrypt.generate_password_hash(pwd).decode('utf-8'), school=name, role='admin', avatar='SC', username=username or None)
    db.session.add(user)
    db.session.commit()
    audit_log('create_school', 'school', school.id, f'name={name} email={email}')
    return jsonify({'success': True, 'email': email, 'password': pwd, 'verification_code': school.verification_code})


@api_bp.route('/api/admin/school/<int:school_id>/edit', methods=['POST'])
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


@api_bp.route('/api/admin/school/<int:school_id>/reset-password', methods=['POST'])
@login_required
def api_admin_school_reset_password(school_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    school = School.query.get_or_404(school_id)
    admin = User.query.filter_by(school=school.name, role='admin').first()
    if not admin:
        return jsonify({'error': 'School admin not found'}), 404
    import secrets, string
    from extensions import bcrypt
    new_pwd = 'School' + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12)) + '!'
    admin.password_hash = bcrypt.generate_password_hash(new_pwd).decode('utf-8')
    db.session.commit()
    audit_log('reset_school_password', 'school', school_id, f'admin_email={admin.email}')
    return jsonify({'success': True, 'email': admin.email, 'password': new_pwd})


@api_bp.route('/api/admin/school/<int:school_id>/delete', methods=['DELETE'])
@login_required
def api_admin_delete_school(school_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    school = School.query.get_or_404(school_id)
    User.query.filter_by(verified_school_id=school_id).update({'verified_school_id': None, 'school_verified': False})
    User.query.filter_by(school=school.name).update({'school': ''})
    SchoolAnnouncement.query.filter_by(school_id=school_id).delete()
    VerificationRequest.query.filter_by(school_id=school_id).delete()
    audit_log('delete_school', 'school', school_id, f'name={school.name}')
    db.session.delete(school)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.route('/api/admin/audit-logs')
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


@api_bp.route('/api/admin/policy/stats')
@login_required
def api_admin_policy_stats():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    total_users = User.query.count()
    accepted = User.query.filter(User.terms_accepted == True).count()
    current_version = '1.0'
    versions = PolicyVersion.query.filter_by(published=True).order_by(PolicyVersion.id.desc()).all()
    return jsonify({
        'total_users': total_users,
        'accepted_count': accepted,
        'acceptance_rate': round(accepted / total_users * 100, 1) if total_users else 0,
        'current_version': current_version,
        'versions': [{'id': v.id, 'type': v.policy_type, 'version': v.version, 'created_at': str(v.created_at)[:10] if v.created_at else ''} for v in versions]
    })


@api_bp.route('/api/admin/policy/update', methods=['POST'])
@login_required
def api_admin_policy_update():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json or {}
    policy_type = data.get('policy_type', '').strip()
    version = data.get('version', '').strip()
    content = data.get('content', '').strip()
    if not policy_type or not version:
        return jsonify({'error': 'Policy type and version required'}), 400
    pv = PolicyVersion(policy_type=policy_type, version=version, content=content, published=True)
    db.session.add(pv)
    db.session.commit()
    return jsonify({'success': True, 'id': pv.id})
