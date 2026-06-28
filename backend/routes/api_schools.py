from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, School, SchoolAnnouncement, VerificationRequest, EventRegistration
from utils.sanitizers import sanitize_text
from extensions import limiter
from services.helpers import is_verified, short_ts, audit_log

bp = Blueprint('schools_api', __name__, url_prefix='')

@bp.route('/api/schools/list')
@login_required
def api_schools_list():
    schools = School.query.order_by(School.name.asc()).all()
    return jsonify({'schools': [{'id': s.id, 'name': s.name, 'location': s.location or '', 'tagline': s.tagline or '', 'avatar': s.avatar or ''} for s in schools]})

@bp.route('/api/school/verify', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_school_verify():
    try:
        data = request.json or {}
        code = data.get('code', '').strip().upper() if data.get('code') else ''
        try:
            school_id = int(data.get('school_id', 0))
        except (TypeError, ValueError):
            school_id = 0
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
    except Exception as e:
        print(f"SCHOOL VERIFY ERROR: {e}")
        return jsonify({'success': False, 'error': 'Server error, please try again'}), 500

@bp.route('/api/school/<int:school_id>')
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

@bp.route('/api/announcement/create', methods=['POST'])
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

@bp.route('/api/announcement/<int:ann_id>/delete', methods=['DELETE'])
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

@bp.route('/api/school/announcements')
@login_required
def api_school_announcements():
    if current_user.role not in ('admin', 'super_admin') or not current_user.verified_school_id:
        return jsonify({'announcements': []})
    anns = SchoolAnnouncement.query.filter_by(school_id=current_user.verified_school_id).order_by(SchoolAnnouncement.id.desc()).limit(50).all()
    return jsonify({'announcements': [{'id': a.id, 'title': a.title, 'content': a.content, 'badge': a.badge_text, 'type': a.type, 'created_at': a.timestamp} for a in anns]})

@bp.route('/api/school/<int:school_id>/announcement', methods=['POST'])
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

@bp.route('/api/school/<int:school_id>/announcement/<int:ann_id>/delete', methods=['POST'])
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

@bp.route('/api/event/<announce_id>/register', methods=['POST'])
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
