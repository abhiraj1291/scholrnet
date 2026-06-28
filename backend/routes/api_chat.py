from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, abort, current_app
from flask_login import login_required, current_user
from models import db, User, ChatMessage, ChatTyping, Notification, Club, ClubMember
from utils.sanitizers import sanitize_text
from services.helpers import is_verified, short_ts

bp = Blueprint('chat', __name__, url_prefix='')

@bp.route('/api/messages')
@login_required
def api_messages():
    contact_id = request.args.get('contact_id', type=int)
    if contact_id:
        msgs = ChatMessage.query.filter(((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == contact_id)) | ((ChatMessage.sender_id == contact_id) & (ChatMessage.receiver_id == current_user.id))).order_by(ChatMessage.id.desc()).limit(100).all()
        msgs.reverse()
        typing_ts = db.session.query(ChatTyping.updated_at).filter(ChatTyping.user_id == contact_id, ChatTyping.contact_id == current_user.id).scalar()
        is_typing = False
        if typing_ts:
            diff = (datetime.utcnow() - typing_ts).total_seconds()
            is_typing = diff < 4
        return jsonify({'messages': [{'id': m.id, 'sender_id': m.sender_id, 'text': m.text, 'timestamp': m.timestamp, 'is_read': m.is_read} for m in msgs], 'is_typing': is_typing})
    msgs = ChatMessage.query.filter((ChatMessage.sender_id == current_user.id) | (ChatMessage.receiver_id == current_user.id)).order_by(ChatMessage.id.desc()).limit(200).all()
    ordered_ids = []
    seen = set()
    for m in msgs:
        other = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        if other not in seen:
            seen.add(other)
            ordered_ids.append(other)
    contacts = []
    if ordered_ids:
        users = {u.id: u for u in User.query.filter(User.id.in_(ordered_ids)).all()}
        for uid in ordered_ids:
            u = users.get(uid)
            if u:
                contacts.append({'id': u.id, 'name': u.name, 'type': 'user', 'avatar': u.avatar or "".join(p[0] for p in u.name.split() if p)[:2].upper(), 'avatar_url': u.avatar_url or '', 'school': u.school, 'role': u.role, 'username': u.username, 'verified': is_verified(u)})
    my_clubs = ClubMember.query.filter_by(user_id=current_user.id).all()
    if my_clubs:
        club_ids = [cm.club_id for cm in my_clubs]
        clubs = {c.id: c for c in Club.query.filter(Club.id.in_(club_ids)).all()}
        for cm in my_clubs:
            c = clubs.get(cm.club_id)
            if c:
                contacts.append({'id': c.id, 'name': c.name, 'type': 'club', 'avatar': (c.avatar or '')[:2].upper() if c.avatar else c.name[:2].upper(), 'avatar_url': '', 'school': '', 'role': 'club', 'username': '', 'verified': False, 'member_count': c.member_count or 0})
    return jsonify({'contacts': contacts})

@bp.route('/api/messages/send', methods=['POST'])
@login_required
def api_send_message():
    data = request.json or {}
    receiver_id = data.get('receiver_id')
    if not receiver_id or receiver_id == current_user.id:
        return jsonify({'error': 'Invalid recipient'}), 400
    msg = ChatMessage(sender_id=current_user.id, receiver_id=receiver_id,
                     text=sanitize_text(data.get('text', ''), 5000),
                     timestamp=short_ts())
    db.session.add(msg)
    n = Notification(user_id=receiver_id,
        title=f"Message from {sanitize_text(current_user.name, 100)}",
        type="message", from_user=current_user.name)
    db.session.add(n)
    db.session.commit()
    return jsonify({'success': True, 'message': {'id': msg.id, 'sender_id': msg.sender_id, 'text': msg.text, 'timestamp': msg.timestamp}})

@bp.route('/api/messages/typing', methods=['POST'])
@login_required
def api_typing():
    data = request.json or {}
    contact_id = data.get('contact_id')
    if contact_id:
        existing = ChatTyping.query.filter_by(user_id=current_user.id, contact_id=contact_id).first()
        if existing:
            existing.updated_at = datetime.utcnow()
        else:
            db.session.add(ChatTyping(user_id=current_user.id, contact_id=contact_id, updated_at=datetime.utcnow()))
        db.session.commit()
    return jsonify({'success': True})

@bp.route('/api/messages/unread-count')
@login_required
def api_messages_unread_count():
    count = ChatMessage.query.filter_by(receiver_id=current_user.id, is_read=False).count()
    return jsonify({'unread_count': count})

@bp.route('/api/messages/mark-read', methods=['POST'])
@login_required
def api_messages_mark_read():
    data = request.json or {}
    contact_id = data.get('contact_id')
    if contact_id:
        ChatMessage.query.filter_by(sender_id=contact_id, receiver_id=current_user.id, is_read=False).update({'is_read': True})
        db.session.commit()
    return jsonify({'success': True})
