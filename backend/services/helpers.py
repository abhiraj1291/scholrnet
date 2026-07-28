import os, sys, traceback
from datetime import datetime, timezone
from flask import current_app, request
from flask_login import current_user
from sqlalchemy import func, or_
from models import db, User, Notification, Ad, AuditLog, Achievement, Project, Post, Comment, UserLike, Connection, ChatMessage, ChatTyping, EventRegistration, ClubMember, ClubJoinRequest, Club, VerificationRequest, MentorshipRequest, Referral, TeamRequest, Experience


def is_verified(u):
    return u and (u.role in ('admin', 'super_admin') or u.email == 'abhiraj29in@gmail.com')


def short_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def audit_log(action, target_type=None, target_id=None, detail=''):
    log = AuditLog(
        user_id=current_user.id if current_user.is_authenticated else None,
        user_name=current_user.name if current_user.is_authenticated else 'anonymous',
        action=action, target_type=target_type, target_id=target_id,
        detail=detail, ip_address=request.remote_addr or '',
        timestamp=short_ts()
    )
    db.session.add(log)
    db.session.flush()


def friend_count(user_id):
    return db.session.query(func.count(Connection.id)).filter(
        or_(
            Connection.user_id == user_id,
            Connection.connected_user_id == user_id
        ),
        Connection.status == 'accepted'
    ).scalar() or 0


def active_ads():
    try:
        q = Ad.query.filter_by(active=True)
        if current_user.is_authenticated and current_user.role:
            q = q.filter((Ad.target_role == '') | (Ad.target_role == current_user.role))
        return q.order_by(Ad.id.desc()).limit(20).all()
    except Exception:
        traceback.print_exc()
        return []


def get_gemini_client():
    api_key = current_app.config.get("GEMINI_API_KEY", "")
    if not api_key or api_key == "MY_GEMINI_API_KEY":
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception:
        return None


def cascade_delete_user(uid):
    Post.query.filter_by(author_id=uid).update(
        {Post.author_id: None, Post.author_name: 'Deleted User', Post.author_avatar: ''},
        synchronize_session=False
    )
    owned_club_ids = [r[0] for r in db.session.query(Club.id).filter_by(owner_id=uid).all()]
    for cid in owned_club_ids:
        ClubMember.query.filter_by(club_id=cid).delete()
        ClubJoinRequest.query.filter_by(club_id=cid).delete()
        Post.query.filter_by(club_id=cid).update({Post.club_id: None}, synchronize_session=False)
        Club.query.filter_by(id=cid).delete()
    Achievement.query.filter_by(user_id=uid).delete()
    Project.query.filter_by(user_id=uid).delete()
    Experience.query.filter_by(user_id=uid).delete()
    Connection.query.filter(
        (Connection.user_id == uid) | (Connection.connected_user_id == uid)
    ).delete(synchronize_session=False)
    ChatMessage.query.filter(
        (ChatMessage.sender_id == uid) | (ChatMessage.receiver_id == uid)
    ).delete(synchronize_session=False)
    ChatTyping.query.filter(
        (ChatTyping.user_id == uid) | (ChatTyping.contact_id == uid)
    ).delete(synchronize_session=False)
    Notification.query.filter_by(user_id=uid).delete()
    UserLike.query.filter_by(user_id=uid).delete()
    EventRegistration.query.filter_by(user_id=uid).delete()
    ClubMember.query.filter_by(user_id=uid).delete()
    ClubJoinRequest.query.filter_by(user_id=uid).delete()
    VerificationRequest.query.filter_by(user_id=uid).delete()
    MentorshipRequest.query.filter_by(student_id=uid).delete()
    Referral.query.filter_by(referrer_id=uid).delete()
    TeamRequest.query.filter_by(creator_id=uid).delete()
    AuditLog.query.filter_by(user_id=uid).delete()
    User.query.filter_by(id=uid).delete()
    db.session.commit()
