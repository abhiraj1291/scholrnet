import json, uuid
from datetime import datetime, timezone
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, Achievement, Project, Ad, Notification, Connection, ClubMember, Referral
from utils.sanitizers import sanitize_text
from services.helpers import is_verified, short_ts, audit_log, friend_count
from extensions import limiter

bp = Blueprint('other', __name__, url_prefix='')


@bp.route('/api/ads')
def api_list_ads():
    from services.helpers import active_ads
    ads_list = active_ads()
    return jsonify({'ads': [{'id': a.id, 'title': a.title, 'company': a.company, 'content': a.content, 'image': a.image, 'cta_text': a.cta_text, 'cta_url': a.cta_url, 'placement': a.placement, 'clicks': a.clicks, 'impressions': a.impressions} for a in ads_list]})


@bp.route('/api/ad/create', methods=['POST'])
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
           clicks=0, impressions=100)
    db.session.add(ad)
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/ad/<int:ad_id>/delete', methods=['POST'])
@login_required
def api_delete_ad(ad_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    ad = Ad.query.get_or_404(ad_id)
    db.session.delete(ad)
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/ad/<int:ad_id>/click', methods=['POST'])
@limiter.limit("10 per minute")
def api_ad_click(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    ad.clicks = Ad.clicks + 1
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/ad/<int:ad_id>/impression', methods=['POST'])
@limiter.limit("30 per minute")
def api_ad_impression(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    ad.impressions = Ad.impressions + 1
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/notifications')
@login_required
def api_notifications():
    notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.id.desc()).limit(30).all()
    unread_count = Notification.query.filter_by(user_id=current_user.id, unread=True).count()
    return jsonify({
        'notifications': [{'id': n.id, 'title': n.title, 'type': n.type, 'from_user': n.from_user, 'timestamp': n.timestamp, 'unread': n.unread} for n in notifs],
        'unread_count': unread_count
    })


@bp.route('/api/notifications/read', methods=['POST'])
@login_required
def api_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, unread=True).delete()
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/user/stats')
@login_required
def api_user_stats():
    try:
        v_count = Achievement.query.filter_by(user_id=current_user.id, verification_status='Verified').count()
        p_count = Project.query.filter_by(user_id=current_user.id).count()
        f_count = friend_count(current_user.id)
        c_count = ClubMember.query.filter_by(user_id=current_user.id).count()
        a_count = Achievement.query.filter_by(user_id=current_user.id).count()
        return jsonify({'verified_achievements': v_count, 'projects': p_count, 'clubs': c_count, 'friends': f_count, 'achievements': a_count, 'collaborations': 0})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'verified_achievements': 0, 'projects': 0, 'clubs': 0, 'friends': 0, 'achievements': 0, 'collaborations': 0})


@bp.route('/api/user/<int:user_id>/profile')
@login_required
def api_user_profile(user_id):
    try:
        from models import Connection
        puser = User.query.get(user_id)
        if not puser:
            return jsonify({'error': 'User not found'}), 404
        v_count = Achievement.query.filter_by(user_id=user_id, verification_status='Verified').count()
        p_count = Project.query.filter_by(user_id=user_id).count()
        f_count = friend_count(user_id)
        c_count = ClubMember.query.filter_by(user_id=user_id).count()
        a_count = Achievement.query.filter_by(user_id=user_id).count()
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
        from models import Project
        all_skills_rows = db.session.query(Project.skills).filter(Project.user_id == user_id, Project.skills != '', Project.skills.isnot(None)).all()
        for (skill_str,) in all_skills_rows:
            if skill_str:
                for s in skill_str.split(','):
                    s = s.strip()
                    if s and s not in skills:
                        skills.append(s)
        return jsonify({
            'id': puser.id, 'name': puser.name, 'school': puser.school,
            'bio': puser.bio or '', 'avatar': puser.avatar or '',
            'avatar_url': puser.avatar_url or '',
            'role': puser.role or 'student', 'grade': puser.grade or '',
            'verified_achievements': v_count, 'projects': p_count,
            'clubs': c_count, 'friends': f_count,
            'achievements': a_count, 'collaborations': 0,
            'skills': skills, 'friend_status': friend_status
        })
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({
            'id': user_id, 'name': '', 'school': '', 'bio': '', 'avatar': '', 'avatar_url': '',
            'role': 'student', 'grade': '', 'verified_achievements': 0, 'projects': 0,
            'clubs': 0, 'friends': 0, 'achievements': 0, 'collaborations': 0,
            'skills': [], 'friend_status': 'none'
        })


@bp.route('/api/search')
@login_required
@limiter.limit("60 per minute")
def api_search():
    q = request.args.get('q', '').strip().lower()
    if not q or len(q) < 2:
        return jsonify({'users': [], 'schools': [], 'achievements': []})
    if len(q) > 200:
        return jsonify({'users': [], 'schools': [], 'achievements': []})
    from models import School
    users = User.query.filter(
        db.or_(User.name.ilike(f'%{q}%'), User.username.ilike(f'%{q}%'))
    ).limit(5).all()
    schools = School.query.filter(School.name.ilike(f'%{q}%')).limit(5).all()
    achs = Achievement.query.filter(Achievement.title.ilike(f'%{q}%')).limit(5).all()
    return jsonify({'users': [{'id': u.id, 'name': u.name, 'school': u.school, 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'role': u.role, 'username': u.username, 'verified': is_verified(u)} for u in users], 'schools': [{'id': s.id, 'name': s.name, 'location': s.location or ''} for s in schools], 'achievements': [{'id': a.id, 'title': a.title, 'user_id': a.user_id} for a in achs]})


@bp.route('/api/referral/generate', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_generate_referral():
    if not current_user.referral_code:
        import uuid
        current_user.referral_code = uuid.uuid4().hex[:10]
        db.session.commit()
    return jsonify({'code': current_user.referral_code})


@bp.route('/api/referral/invite', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_referral_invite():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    name = (data.get('name') or '').strip()
    if not email or '@' not in email:
        return jsonify({'success': False, 'error': 'Valid email required'}), 400
    ref = Referral(referrer_id=current_user.id, referred_email=email, referred_name=name, status='pending', created_at=str(datetime.now(timezone.utc)))
    db.session.add(ref)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Invitation sent'})


@bp.route('/api/referral/claim', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_referral_claim():
    code = (request.json or {}).get('code', '')
    referrer = User.query.filter_by(referral_code=code).first()
    if not referrer:
        return jsonify({'success': False, 'error': 'Invalid code'}), 400
    ref = Referral.query.filter_by(referrer_id=referrer.id, referred_email=current_user.email).first()
    if not ref:
        ref = Referral(referrer_id=referrer.id, referred_email=current_user.email, referred_name=current_user.name, status='joined', badge_awarded=False, created_at=str(datetime.now(timezone.utc)))
        db.session.add(ref)
    if not ref.badge_awarded:
        count = Referral.query.filter_by(referrer_id=referrer.id, status='joined').count()
        if count >= 1:
            referrer.referral_badge = True
            ref.badge_awarded = True
        ref.status = 'joined'
        db.session.commit()
    return jsonify({'success': True})


@bp.route('/api/share/achievement/<int:achievement_id>')
@login_required
def api_share_achievement(achievement_id):
    achievement = Achievement.query.get(achievement_id)
    if not achievement or achievement.user_id != current_user.id:
        return jsonify({'error': 'Not found'}), 404
    share_url = f"{request.url_root}profile/{current_user.id}"
    text = f"I earned '{achievement.title}' — verified on ScholrNet! Check out my profile: {share_url}"
    return jsonify({'text': text, 'url': share_url})
