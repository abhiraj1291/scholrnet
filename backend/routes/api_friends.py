from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, Connection, Notification
from utils.sanitizers import sanitize_text
from extensions import limiter
from services.helpers import is_verified, short_ts, audit_log, friend_count

bp = Blueprint('friends', __name__, url_prefix='')

@bp.route('/api/friend/request', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
def api_friend_request():
    try:
        data = request.json or {}
        target_id = data.get('user_id')
        if not target_id or not isinstance(target_id, int) or target_id == current_user.id:
            return jsonify({'error': 'Invalid user'}), 400
        if not User.query.get(target_id):
            return jsonify({'error': 'User not found'}), 404
        existing = Connection.query.filter(
            ((Connection.user_id == current_user.id) & (Connection.connected_user_id == target_id)) |
            ((Connection.user_id == target_id) & (Connection.connected_user_id == current_user.id))
        ).first()
        if existing:
            if existing.status == 'accepted':
                return jsonify({'error': 'Already friends'}), 400
            if existing.user_id == target_id and existing.connected_user_id == current_user.id:
                existing.status = 'accepted'
                rev = Connection.query.filter_by(user_id=current_user.id, connected_user_id=target_id, status='pending').first()
                if rev:
                    rev.status = 'accepted'
                n = Notification(user_id=target_id, title=f"{sanitize_text(current_user.name, 100)} accepted your friend request", type="friend_accept", from_user=current_user.name)
                db.session.add(n)
                db.session.commit()
                return jsonify({'success': True, 'accepted': True})
            if existing.user_id == current_user.id and existing.connected_user_id == target_id and existing.status == 'pending':
                return jsonify({'error': 'Request already exists'}), 400
            return jsonify({'error': 'Already friends'}), 400
        conn = Connection(user_id=current_user.id, connected_user_id=target_id, status='pending')
        db.session.add(conn)
        n = Notification(user_id=target_id, title=f"{sanitize_text(current_user.name, 100)} sent you a friend request", type="friend_request", from_user=current_user.name)
        db.session.add(n)
        db.session.commit()
        return jsonify({'success': True})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'error': 'Server error'}), 500

@bp.route('/api/friend/respond', methods=['POST'])
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
        rev = Connection.query.filter_by(user_id=conn.connected_user_id, connected_user_id=conn.user_id, status='pending').first()
        if rev:
            rev.status = 'accepted'
        n = Notification(user_id=conn.user_id, title=f"{sanitize_text(current_user.name, 100)} accepted your friend request", type="friend_accept", from_user=current_user.name)
        db.session.add(n)
    else:
        db.session.delete(conn)
    db.session.commit()
    return jsonify({'success': True})

@bp.route('/api/friend/requests')
@login_required
def api_friend_requests():
    try:
        reqs = Connection.query.filter_by(connected_user_id=current_user.id, status='pending').all()
        user_ids = [r.user_id for r in reqs]
        users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}
        return jsonify({'requests': [{'id': r.id, 'user_id': r.user_id, 'user': {'name': users[r.user_id].name, 'avatar': users[r.user_id].avatar, 'avatar_url': users[r.user_id].avatar_url}} for r in reqs if r.user_id in users]})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'requests': []})

@bp.route('/api/friend/list')
@login_required
def api_friend_list():
    try:
        friend_conns = Connection.query.filter(
            ((Connection.user_id == current_user.id) | (Connection.connected_user_id == current_user.id)),
            Connection.status == 'accepted'
        ).all()
        ids = set(c.connected_user_id if c.user_id == current_user.id else c.user_id for c in friend_conns)
        user_rows = db.session.query(User.id, User.name, User.avatar, User.avatar_url, User.school, User.username).filter(User.id.in_(ids)).all() if ids else []
        return jsonify({'friends': [{'id': u.id, 'name': u.name, 'avatar': u.avatar or u.name[:2].upper(), 'avatar_url': u.avatar_url, 'school': u.school, 'username': u.username} for u in user_rows]})
    except Exception as e:
        import traceback; traceback.print_exc()
        current_app.logger.error(f"api_friend_list error for user {current_user.id}: {e}")
        return jsonify({'friends': [], 'error': str(e)[:200]})

@bp.route('/api/friend/suggestions')
@login_required
def api_friend_suggestions():
    try:
        existing_ids = set()
        for c in Connection.query.filter(
            (Connection.user_id == current_user.id) | (Connection.connected_user_id == current_user.id)
        ).all():
            existing_ids.add(c.user_id)
            existing_ids.add(c.connected_user_id)
        existing_ids.add(current_user.id)
        same_school = []
        if current_user.school:
            same_school_q = User.query.filter(
                User.school == current_user.school,
                ~User.id.in_(existing_ids)
            ).limit(10).all()
            same_school = [{'id': u.id, 'name': u.name, 'school': u.school, 'avatar': u.avatar or u.name[:2].upper(), 'reason': 'Same school'} for u in same_school_q]
        mutual_ids = set()
        friend_ids = existing_ids - {current_user.id}
        if friend_ids:
            mutual_conns = Connection.query.filter(
                Connection.status == 'accepted',
                ((Connection.user_id.in_(list(friend_ids))) | (Connection.connected_user_id.in_(list(friend_ids))))
            ).all()
            for c in mutual_conns:
                other = c.connected_user_id if c.user_id in friend_ids else c.user_id
                if other not in existing_ids and (c.user_id in friend_ids or c.connected_user_id in friend_ids):
                    mutual_ids.add(other)
        mutual_users = User.query.filter(User.id.in_(mutual_ids)).limit(10).all() if mutual_ids else []
        mutual = [{'id': u.id, 'name': u.name, 'school': u.school, 'avatar': u.avatar or u.name[:2].upper(), 'reason': 'Mutual connection'} for u in mutual_users]
        suggested = (same_school + mutual)[:10]
        return jsonify({'suggestions': suggested})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'suggestions': []})

@bp.route('/api/user/<int:user_id>/connections')
@login_required
def api_user_connections(user_id):
    try:
        user_conns = Connection.query.filter(
            ((Connection.user_id == user_id) | (Connection.connected_user_id == user_id)),
            Connection.status == 'accepted'
        ).all()
        ids = set(c.connected_user_id if c.user_id == user_id else c.user_id for c in user_conns)
        my_conns = Connection.query.filter(
            ((Connection.user_id == current_user.id) | (Connection.connected_user_id == current_user.id)),
            Connection.status == 'accepted'
        ).all()
        my_ids = set(c.connected_user_id if c.user_id == current_user.id else c.user_id for c in my_conns)
        users = User.query.filter(User.id.in_(ids)).all() if ids else []
        return jsonify({'connections': [{
            'id': u.id, 'name': u.name, 'avatar': u.avatar or u.name[:2].upper(), 'avatar_url': u.avatar_url,
            'school': u.school, 'username': u.username,
            'mutual': len(my_ids & {u.id})
        } for u in users]})
    except Exception as e:
        import traceback; traceback.print_exc()
        current_app.logger.error(f"api_user_connections error for user {user_id}: {e}")
        return jsonify({'connections': [], 'error': str(e)[:200]})

@bp.route('/api/connection/toggle', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
def api_toggle_connection():
    try:
        data = request.json or {}
        other_id = data.get('user_id')
        if not other_id or other_id == current_user.id:
            return jsonify({'error': 'Invalid user'}), 400
        existing = Connection.query.filter(
            ((Connection.user_id == current_user.id) & (Connection.connected_user_id == other_id)) |
            ((Connection.user_id == other_id) & (Connection.connected_user_id == current_user.id))
        ).all()
        for c in existing:
            db.session.delete(c)
        db.session.commit()
        return jsonify({'success': True, 'connected': False})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'error': 'Server error'}), 500
