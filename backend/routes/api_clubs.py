from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, Club, ClubMember, ClubJoinRequest, Post, ChatMessage, Notification
from utils.sanitizers import sanitize_text, validate_file_type
from services.helpers import is_verified, short_ts, audit_log
from services.upload import save_to_supabase
from extensions import limiter
import uuid

bp = Blueprint('clubs', __name__, url_prefix='')

@bp.route('/clubs')
@login_required
def clubs_page():
    return render_template('clubs.html', user=current_user)

@bp.route('/club/<int:club_id>')
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
    return render_template('club_detail.html', club=club, owner=owner, is_member=is_member, user_role=user_role,
        join_request_pending=join_request_pending, members=members, user_map=user_map, user=current_user)

@bp.route('/api/club/create', methods=['POST'])
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
                owner_id=current_user.id, tags=tags, created_at=short_ts(), member_count=1)
    db.session.add(club)
    db.session.flush()
    membership = ClubMember(club_id=club.id, user_id=current_user.id, role='owner', joined_at=short_ts())
    db.session.add(membership)
    db.session.commit()
    return jsonify({'success': True, 'club': {'id': club.id, 'name': club.name, 'member_count': club.member_count, 'is_private': club.is_private}})

@bp.route('/api/clubs')
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

@bp.route('/api/club/<int:club_id>')
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

@bp.route('/api/club/<int:club_id>/join', methods=['POST'])
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
        req = ClubJoinRequest(club_id=club_id, user_id=current_user.id, status='pending', requested_at=short_ts())
        db.session.add(req)
        db.session.commit()
        return jsonify({'success': True, 'pending': True, 'message': 'Join request sent. Waiting for approval.'})
    try:
        mem = ClubMember(club_id=club_id, user_id=current_user.id, role='member', joined_at=short_ts())
        db.session.add(mem)
        db.session.flush()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Already a member'}), 400
    club.member_count = ClubMember.query.filter_by(club_id=club_id).count()
    db.session.commit()
    return jsonify({'success': True, 'member_count': club.member_count})

@bp.route('/api/club/<int:club_id>/leave', methods=['POST'])
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
    club.member_count = ClubMember.query.filter_by(club_id=club_id).count()
    db.session.commit()
    return jsonify({'success': True, 'member_count': club.member_count})

@bp.route('/api/club/<int:club_id>/posts')
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

@bp.route('/api/club/<int:club_id>/messages')
@login_required
def api_club_messages(club_id):
    club = Club.query.get_or_404(club_id)
    mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
    if not mem and current_user.role != 'super_admin':
        return jsonify({'error': 'Not a member'}), 403
    msgs = ChatMessage.query.filter_by(group_id=club_id).order_by(ChatMessage.id.desc()).limit(100).all()
    msgs.reverse()
    return jsonify({'messages': [{'id': m.id, 'sender_id': m.sender_id, 'text': m.text, 'timestamp': m.timestamp, 'sender_name': m.sender_name, 'sender_avatar': m.sender_avatar} for m in msgs]})

@bp.route('/api/club/<int:club_id>/messages/send', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def api_club_send_message(club_id):
    club = Club.query.get_or_404(club_id)
    mem = ClubMember.query.filter_by(club_id=club_id, user_id=current_user.id).first()
    if not mem:
        return jsonify({'error': 'Not a member'}), 403
    data = request.json or {}
    text = sanitize_text(data.get('text', ''), 5000)
    if not text:
        return jsonify({'error': 'Message cannot be empty'}), 400
    msg = ChatMessage(sender_id=current_user.id, receiver_id=0, text=text, group_id=club_id,
                     timestamp=short_ts(), sender_name=current_user.name,
                     sender_avatar=current_user.avatar or "".join(p[0] for p in current_user.name.split() if p)[:2].upper())
    db.session.add(msg)
    db.session.commit()
    return jsonify({'success': True, 'message': {'id': msg.id, 'sender_id': msg.sender_id, 'text': msg.text, 'timestamp': msg.timestamp, 'sender_name': msg.sender_name, 'sender_avatar': msg.sender_avatar}})

@bp.route('/api/club/<int:club_id>/update', methods=['POST'])
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

@bp.route('/api/club/<int:club_id>/delete', methods=['POST'])
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

@bp.route('/api/user/<int:user_id>/clubs')
@login_required
def api_user_clubs(user_id):
    try:
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
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'clubs': []})

@bp.route('/api/club/<int:club_id>/join-requests')
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

@bp.route('/api/club/<int:club_id>/join-request/<int:req_id>/approve', methods=['POST'])
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
    req.responded_at = short_ts()
    existing = ClubMember.query.filter_by(club_id=club_id, user_id=req.user_id).first()
    if not existing:
        try:
            new_mem = ClubMember(club_id=club_id, user_id=req.user_id, role='member', joined_at=short_ts())
            db.session.add(new_mem)
            db.session.flush()
        except Exception:
            db.session.rollback()
            pass
    club.member_count = ClubMember.query.filter_by(club_id=club_id).count()
    db.session.commit()
    return jsonify({'success': True, 'member_count': club.member_count})

@bp.route('/api/club/<int:club_id>/join-request/<int:req_id>/reject', methods=['POST'])
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
    req.responded_at = short_ts()
    db.session.commit()
    return jsonify({'success': True})

@bp.route('/api/club/<int:club_id>/avatar', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def api_club_upload_avatar(club_id):
    supabase_url = current_app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = current_app.config.get("SUPABASE_STORAGE_KEY", "")
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
    url = save_to_supabase(f.read(), 'uploads', path, supabase_url=supabase_url, supabase_key=supabase_key)
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    club.avatar = url
    db.session.commit()
    return jsonify({'success': True, 'url': url})

@bp.route('/api/club/<int:club_id>/cover', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def api_club_upload_cover(club_id):
    supabase_url = current_app.config.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = current_app.config.get("SUPABASE_STORAGE_KEY", "")
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
    url = save_to_supabase(f.read(), 'uploads', path, supabase_url=supabase_url, supabase_key=supabase_key)
    if not url:
        return jsonify({'error': 'Upload failed'}), 500
    club.cover_url = url
    db.session.commit()
    return jsonify({'success': True, 'url': url})
