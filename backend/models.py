from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timezone

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    school = db.Column(db.String(200), default="")
    grade = db.Column(db.String(50), default="")
    bio = db.Column(db.Text, default="")
    avatar = db.Column(db.String(10), default="")
    avatar_url = db.Column(db.String(300), default="")
    role = db.Column(db.String(20), default="student")
    theme_color = db.Column(db.String(30), default="navy")
    groq_api_key = db.Column(db.String(200), default="")
    username = db.Column(db.String(30), unique=True, nullable=True)
    school_verified = db.Column(db.Boolean, default=False, nullable=True)
    verified_school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    achievements = db.relationship('Achievement', backref='user', lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)

class Achievement(db.Model):
    __tablename__ = 'achievements'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, default="")
    category = db.Column(db.String(50), default="Excellence")
    institution = db.Column(db.String(200), default="")
    year = db.Column(db.String(10), default="")
    certificate_file = db.Column(db.String(200), default="")
    verification_status = db.Column(db.String(20), default="NotVerified", index=True)
    verified_by = db.Column(db.String(200), default="")
    verified_at = db.Column(db.String(20), default="")
    verification_hash = db.Column(db.String(100), default="")

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, default="")
    collaborators = db.Column(db.String(300), default="")
    link = db.Column(db.String(300), default="")
    skills = db.Column(db.String(500), default="")
    verification_status = db.Column(db.String(20), default="NotVerified")
    verified_by = db.Column(db.String(200), default="")
    verified_at = db.Column(db.String(20), default="")

class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    author_name = db.Column(db.String(100), nullable=False)
    author_avatar = db.Column(db.String(10), default="")
    author_school = db.Column(db.String(200), default="")
    type = db.Column(db.String(30), default="achievement")
    title = db.Column(db.String(300), default="")
    content = db.Column(db.Text, default="")
    badge_text = db.Column(db.String(100), default="")
    likes = db.Column(db.Integer, default=0)
    tags = db.Column(db.String(500), default="")
    timestamp = db.Column(db.String(30), default="")
    video_url = db.Column(db.String(500), default="")
    image_url = db.Column(db.String(500), default="")

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)
    author = db.Column(db.String(100), nullable=False)
    avatar = db.Column(db.String(10), default="")
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.String(30), default="")

class Ad(db.Model):
    __tablename__ = 'ads'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200), default="")
    image = db.Column(db.String(300), default="")
    content = db.Column(db.Text, default="")
    cta_url = db.Column(db.String(500), default="#")
    cta_text = db.Column(db.String(100), default="Learn More")
    placement = db.Column(db.String(30), default="left_sidebar")
    clicks = db.Column(db.Integer, default=0)
    impressions = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    target_role = db.Column(db.String(30), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Opportunity(db.Model):
    __tablename__ = 'opportunities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    type = db.Column(db.String(50), default="Scholarship")
    provider = db.Column(db.String(200), default="")
    prize_pool = db.Column(db.String(200), default="")
    description = db.Column(db.Text, default="")
    eligibility = db.Column(db.Text, default="")
    deadline = db.Column(db.String(50), default="")

class TeamRequest(db.Model):
    __tablename__ = 'team_requests'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    creator_name = db.Column(db.String(100), default="")
    creator_avatar = db.Column(db.String(10), default="")
    school = db.Column(db.String(200), default="")
    opportunity_name = db.Column(db.String(300), default="")
    looking_for = db.Column(db.String(500), default="")
    description = db.Column(db.Text, default="")

class TeamApplicant(db.Model):
    __tablename__ = 'team_applicants'
    id = db.Column(db.Integer, primary_key=True)
    team_request_id = db.Column(db.Integer, db.ForeignKey('team_requests.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    school = db.Column(db.String(200), default="")
    status = db.Column(db.String(20), default="pending")

class VerificationRequest(db.Model):
    __tablename__ = 'verification_requests'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    student_name = db.Column(db.String(100), nullable=False)
    student_school = db.Column(db.String(200), default="")
    achievement_title = db.Column(db.String(300), nullable=False)
    category = db.Column(db.String(50), default="")
    institution = db.Column(db.String(200), default="")
    year = db.Column(db.String(10), default="")
    certificate_name = db.Column(db.String(200), default="")
    details = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="pending", index=True)
    requested_at = db.Column(db.String(30), default="")

class Mentor(db.Model):
    __tablename__ = 'mentors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(30), default="Teacher")
    avatar = db.Column(db.String(10), default="")
    institution = db.Column(db.String(200), default="")
    subjects = db.Column(db.String(500), default="")
    career_goals = db.Column(db.String(500), default="")
    projects = db.Column(db.String(500), default="")
    bio = db.Column(db.Text, default="")
    rating = db.Column(db.Float, default=0.0)
    is_verified = db.Column(db.Boolean, default=False)

class MentorshipRequest(db.Model):
    __tablename__ = 'mentorship_requests'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=True, index=True)
    student_id = db.Column(db.Integer, nullable=True, index=True)
    mentor_name = db.Column(db.String(100), default="")
    student_name = db.Column(db.String(100), nullable=False)
    student_school = db.Column(db.String(200), default="")
    subject = db.Column(db.String(200), default="")
    message = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="pending", index=True)
    requested_at = db.Column(db.String(30), default="")

class MentorInteraction(db.Model):
    __tablename__ = 'mentor_interactions'
    id = db.Column(db.Integer, primary_key=True)
    mentorship_request_id = db.Column(db.Integer, db.ForeignKey('mentorship_requests.id'), nullable=False, index=True)
    author = db.Column(db.String(100), default="")
    note = db.Column(db.Text, default="")
    date = db.Column(db.String(20), default="")

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    title = db.Column(db.String(300), nullable=False)
    type = db.Column(db.String(30), default="info")
    timestamp = db.Column(db.String(30), default="")
    unread = db.Column(db.Boolean, default=True, index=True)
    from_user = db.Column(db.String(100), default="")

    __table_args__ = (db.Index('idx_notif_user_unread', 'user_id', 'unread'),)

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, nullable=False, index=True)
    receiver_id = db.Column(db.Integer, nullable=False, index=True)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.String(30), default="")

    __table_args__ = (db.Index('idx_chat_sender_receiver', 'sender_id', 'receiver_id'),)

class School(db.Model):
    __tablename__ = 'schools'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    avatar = db.Column(db.String(10), default="")
    location = db.Column(db.String(200), default="")
    tagline = db.Column(db.String(300), default="")
    about = db.Column(db.Text, default="")
    established = db.Column(db.String(10), default="")
    website = db.Column(db.String(300), default="")
    verification_code = db.Column(db.String(8), unique=True, nullable=True)
    verified_by_email = db.Column(db.String(200), default="", nullable=True)

class SchoolAnnouncement(db.Model):
    __tablename__ = 'school_announcements'
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False, index=True)
    title = db.Column(db.String(300), nullable=False)
    content = db.Column(db.Text, default="")
    badge_text = db.Column(db.String(100), default="")
    type = db.Column(db.String(30), default="announcement")
    timestamp = db.Column(db.String(30), default="")
    deadline = db.Column(db.String(50), default="")
    reward = db.Column(db.String(200), default="")

class Connection(db.Model):
    __tablename__ = 'connections'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    connected_user_id = db.Column(db.Integer, nullable=False, index=True)
    status = db.Column(db.String(20), default='pending', index=True)

    __table_args__ = (db.Index('idx_conn_user_status', 'user_id', 'connected_user_id', 'status'),)

class UserLike(db.Model):
    __tablename__ = 'user_likes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)

    __table_args__ = (db.Index('idx_like_user_post', 'user_id', 'post_id', unique=True),)

class EventRegistration(db.Model):
    __tablename__ = 'event_registrations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    announce_id = db.Column(db.String(100), nullable=False, index=True)

class Experience(db.Model):
    __tablename__ = 'experiences'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    company = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    skills = db.Column(db.String(500), default="")
    start_date = db.Column(db.String(20), default="")
    end_date = db.Column(db.String(20), default="")
    is_current = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
