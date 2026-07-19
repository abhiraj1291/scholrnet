from flask import Blueprint, render_template, request, jsonify, redirect, url_for, Response, session, abort, current_app, send_file
from flask_login import login_required, current_user, logout_user, login_user
from models import db, User, Achievement, Project, Post, Comment, Ad, Opportunity, School, Club, ClubMember, BlogPost, Lead
from utils.sanitizers import sanitize_text
from utils.email import send_email, email_otp_body
from utils.decorators import super_admin_required
from services.helpers import is_verified, short_ts, audit_log, active_ads
from datetime import datetime, timezone
import os

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    try:
        schools_count = School.query.count()
        users_count = User.query.count()
        clubs_count = Club.query.count()
        opportunities_count = Opportunity.query.count()
        recent_opportunities = Opportunity.query.order_by(Opportunity.id.desc()).limit(3).all()
        recent_clubs = Club.query.order_by(Club.id.desc()).limit(3).all()
    except Exception:
        schools_count = 0; users_count = 0; clubs_count = 0; opportunities_count = 0
        recent_opportunities = []; recent_clubs = []
    return render_template('landing.html',
        schools_count=schools_count, users_count=users_count, clubs_count=clubs_count,
        opportunities_count=opportunities_count, recent_opportunities=recent_opportunities, recent_clubs=recent_clubs
    )


@main_bp.route('/about')
def about_page():
    return render_template('about.html')


@main_bp.route('/contact')
def contact_page():
    return render_template('contact.html')


@main_bp.route('/schools')
def schools_page():
    return render_template('schools.html')


@main_bp.route('/terms')
def terms_page():
    return render_template('terms.html')


@main_bp.route('/privacy')
def privacy_page():
    return render_template('privacy.html')


@main_bp.route('/public')
def public_timeline():
    try:
        posts = Post.query.order_by(Post.id.desc()).limit(50).all()
        author_ids = {p.author_id for p in posts if p.author_id}
        authors = {u.id: u for u in User.query.filter(User.id.in_(author_ids)).all()} if author_ids else {}
        enriched = []
        for p in posts:
            author = authors.get(p.author_id) if p.author_id else None
            enriched.append({
                'id': p.id, 'title': p.title, 'content': p.content, 'image_url': p.image_url,
                'timestamp': p.timestamp, 'author_name': p.author_name, 'author_school': p.author_school,
                'author_username': author.username if author else None,
                'author_avatar_url': author.avatar_url if author else '',
                'author_verified': is_verified(author) if author else False
            })
    except Exception:
        enriched = []
    return render_template('public.html', posts=enriched)


@main_bp.route('/explore')
@login_required
def explore_page():
    try:
        suggested_clubs = Club.query.order_by(Club.id.desc()).limit(12).all()
        member_club_ids = {m.club_id for m in ClubMember.query.filter_by(user_id=current_user.id).all()}
        upcoming_opps = Opportunity.query.order_by(Opportunity.id.desc()).limit(10).all()
        return render_template('explore.html', user=current_user,
            suggested_clubs=[c for c in suggested_clubs if c.id not in member_club_ids][:6],
            opportunities=upcoming_opps)
    except Exception:
        import traceback; traceback.print_exc()
        return render_template('error.html', code=500, title='Something Went Wrong', message='Could not load explore page.', emoji='🔍'), 500


@main_bp.route('/dashboard')
@login_required
def dashboard():
    return redirect(url_for('main.explore_page'))


@main_bp.route('/opportunities')
@login_required
def opportunities_page():
    return render_template('opportunities.html', user=current_user)


@main_bp.route('/teams')
@login_required
def teams_page():
    return render_template('teams.html', user=current_user)


@main_bp.route('/mentors')
@login_required
def mentors_page():
    from models import MentorshipRequest
    mentorship_p = MentorshipRequest.query.filter_by(student_id=current_user.id).order_by(MentorshipRequest.id.desc()).paginate(page=1, per_page=50, error_out=False)
    return render_template('mentors.html', user=current_user, mentorship_requests=mentorship_p.items)


@main_bp.route('/analytics')
@login_required
def analytics_page():
    achs_p = Achievement.query.filter_by(user_id=current_user.id).order_by(Achievement.id.desc()).paginate(page=1, per_page=100, error_out=False)
    return render_template('analytics.html', user=current_user, achievements=achs_p.items)


@main_bp.route('/advisor')
@login_required
def advisor_page():
    return render_template('advisor.html', user=current_user)


@main_bp.route('/clubs')
@login_required
def clubs_page():
    return render_template('clubs.html', user=current_user)


@main_bp.route('/search')
@login_required
def search_page():
    return render_template('search.html', user=current_user)


@main_bp.route('/chat')
@login_required
def chat_page():
    return render_template('chat.html', user=current_user, firebase_config=current_app.config.get("FIREBASE_CONFIG", {}))


@main_bp.route('/school-desk')
@login_required
def school_desk():
    if current_user.role not in ('admin', 'super_admin'):
        return redirect(url_for('main.dashboard'))
    from models import VerificationRequest
    return render_template('school.html', user=current_user,
        verification_requests=VerificationRequest.query.order_by(VerificationRequest.id.desc()).limit(200).all())


@main_bp.route('/admin-panel')
@login_required
def admin_panel():
    if current_user.role != 'super_admin':
        return redirect(url_for('main.dashboard'))
    return render_template('admin_panel.html', user=current_user)


@main_bp.route('/choose-role')
@login_required
def choose_role():
    if current_user.role != 'pending':
        return redirect(url_for('main.dashboard'))
    return render_template('choose_role.html', user=current_user)


@main_bp.route('/choose-username')
@login_required
def choose_username():
    if current_user.username:
        return redirect(url_for('main.dashboard'))
    return render_template('choose_username.html', user=current_user)


@main_bp.route('/robots.txt')
def robots_txt():
    lines = [
        'User-agent: *', 'Allow: /',
        'Disallow: /login', 'Disallow: /register', 'Disallow: /dashboard', 'Disallow: /api/',
        f'Sitemap: {request.url_root}sitemap.xml', '', '# Crawl delay for serverless cold start', 'Crawl-Delay: 10'
    ]
    return Response('\n'.join(lines), mimetype='text/plain')


@main_bp.route('/llms.txt')
def llms_txt():
    path = os.path.join(current_app.root_path, '..', 'llms.txt')
    return send_file(path, mimetype='text/plain')

@main_bp.route('/llmsfull.txt')
def llmsfull_txt():
    path = os.path.join(current_app.root_path, '..', 'llmsfull.txt')
    return send_file(path, mimetype='text/plain')

@main_bp.route('/sitemap.xml')
def sitemap_xml():
    from xml.sax.saxutils import escape as xml_escape
    today = str(datetime.now(timezone.utc).date())
    base = request.url_root.rstrip('/')
    schools = School.query.with_entities(School.id, School.name).order_by(School.id.desc()).limit(100).all()
    blog_posts = BlogPost.query.with_entities(BlogPost.id, BlogPost.slug, BlogPost.updated_at).filter_by(published=True).order_by(BlogPost.id.desc()).limit(100).all()
    opportunities = Opportunity.query.with_entities(Opportunity.id, Opportunity.name).order_by(Opportunity.id.desc()).limit(100).all()
    clubs = Club.query.with_entities(Club.id, Club.name).order_by(Club.id.desc()).limit(100).all()
    users = User.query.with_entities(User.id, User.username).filter(User.username.isnot(None), User.username != '').order_by(User.id.desc()).limit(500).all()
    posts = Post.query.with_entities(Post.id).order_by(Post.id.desc()).limit(500).all()
    urls = [
        f'<url><loc>{base}/</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>',
        f'<url><loc>{base}/about</loc><priority>0.8</priority><changefreq>monthly</changefreq></url>',
        f'<url><loc>{base}/contact</loc><priority>0.6</priority><changefreq>monthly</changefreq></url>',
        f'<url><loc>{base}/schools</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>',
        f'<url><loc>{base}/terms</loc><priority>0.5</priority><changefreq>monthly</changefreq></url>',
        f'<url><loc>{base}/privacy</loc><priority>0.5</priority><changefreq>monthly</changefreq></url>',
        f'<url><loc>{base}/public</loc><priority>0.7</priority><changefreq>daily</changefreq></url>',
        f'<url><loc>{base}/login</loc><priority>0.3</priority><changefreq>monthly</changefreq></url>',
        f'<url><loc>{base}/register</loc><priority>0.8</priority><changefreq>monthly</changefreq></url>',
        f'<url><loc>{base}/blog</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>',
    ]
    for post in blog_posts:
        urls.append(f'<url><loc>{base}/blog/{xml_escape(post.slug)}</loc><priority>0.6</priority><lastmod>{post.updated_at or today}</lastmod></url>')
    for opp in opportunities:
        slug = opp.name.lower().replace(' ', '-').replace('/', '-')[:80]
        urls.append(f'<url><loc>{base}/opportunity/{opp.id}/{slug}</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>')
    for school in schools:
        slug = school.name.lower().replace(' ', '-').replace('/', '-')[:80]
        urls.append(f'<url><loc>{base}/school/{school.id}/{slug}</loc><priority>0.6</priority><changefreq>weekly</changefreq></url>')
    for club in clubs:
        urls.append(f'<url><loc>{base}/club/{club.id}</loc><priority>0.5</priority><changefreq>weekly</changefreq></url>')
    for u in users:
        urls.append(f'<url><loc>{base}/share/{xml_escape(u.username)}</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>')
    for p in posts:
        urls.append(f'<url><loc>{base}/post/{p.id}</loc><priority>0.6</priority><changefreq>monthly</changefreq></url>')
    xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(urls) + '</urlset>'
    return Response(xml, mimetype='application/xml')


@main_bp.route('/opportunity/<int:opp_id>/<path:slug>')
def opportunity_page(opp_id, slug):
    opp = Opportunity.query.get(opp_id)
    if not opp:
        abort(404)
    return render_template('opportunity_detail.html', opp=opp,
        meta_title=f"{opp.name} — ScholrNet Opportunities",
        meta_desc=(opp.description or '')[:200])


@main_bp.route('/school/<int:school_id>/<path:slug>')
def school_page(school_id, slug):
    school = School.query.get(school_id)
    if not school:
        abort(404)
    students = User.query.filter_by(verified_school_id=school_id).limit(20).all()
    clubs = Club.query.filter(Club.name.ilike(f'%{school.name[:20]}%')).limit(5).all()
    return render_template('school_landing.html', school=school, students=students, clubs=clubs,
        meta_title=f"{school.name} — ScholrNet School Profile",
        meta_desc=(school.tagline or school.name or '')[:200])


@main_bp.route('/blog')
def blog_index():
    try:
        posts = BlogPost.query.filter_by(published=True).order_by(BlogPost.id.desc()).limit(50).all()
    except Exception:
        posts = []
    return render_template('blog_index.html', posts=posts)


@main_bp.route('/blog/<path:slug>')
def blog_post(slug):
    post = BlogPost.query.filter_by(slug=slug, published=True).first()
    if not post:
        abort(404)
    return render_template('blog_post.html', post=post)


@main_bp.route('/post/<int:post_id>')
def single_post(post_id):
    post = Post.query.get_or_404(post_id)
    author = User.query.with_entities(User.id, User.name, User.avatar, User.avatar_url, User.username, User.role, User.school).filter(User.id == post.author_id).first() if post.author_id else None
    return render_template('post.html', post=post, author=author, is_verified=is_verified(author) if author else False)


@main_bp.route('/share/<username>')
def share_profile(username):
    puser = User.query.filter_by(username=username).first()
    if not puser:
        abort(404)
    page = request.args.get('page', 1, type=int)
    per_page = 20
    achs_p = Achievement.query.filter_by(user_id=puser.id).order_by(Achievement.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    projs_p = Project.query.filter_by(user_id=puser.id).order_by(Project.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    from models import Experience
    exps_p = Experience.query.filter_by(user_id=puser.id).order_by(Experience.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return render_template('share.html', puser=puser, achievements=achs_p.items, projects=projs_p.items, experiences=exps_p.items, is_verified=is_verified(puser))


@main_bp.route('/profile')
@login_required
def profile_page():
    return redirect(f'/profile/{current_user.id}')


@main_bp.route('/profile/<int:user_id>')
@login_required
def profile_by_id(user_id):
    from models import Connection
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
    page = request.args.get('page', 1, type=int)
    posts_p = Post.query.filter_by(author_id=user_id).order_by(Post.id.desc()).paginate(page=page, per_page=20, error_out=False)
    return render_template('profile.html', user=current_user, puser=puser, is_own=is_own,
        friend_status=friend_status, is_verified=is_verified(puser), posts=posts_p.items)


@main_bp.route('/u/<username>')
@login_required
def profile_by_username(username):
    puser = User.query.filter_by(username=username).first()
    if not puser:
        abort(404)
    return redirect(url_for('main.profile_by_id', user_id=puser.id))


@main_bp.route('/api/contact', methods=['POST'])
def api_contact():
    try:
        data = request.json or {}
        name = sanitize_text(data.get('name', ''), 200)
        email = sanitize_text(data.get('email', ''), 200).strip().lower()
        subject = sanitize_text(data.get('subject', ''), 200)
        message = sanitize_text(data.get('message', ''), 2000)
        if not all([name, email, subject, message]):
            return jsonify({'success': False, 'error': 'All fields required'}), 400
        if '@' not in email:
            return jsonify({'success': False, 'error': 'Valid email required'}), 400
        print(f"[Contact] {name} <{email}> | {subject}: {message[:200]}")
        return jsonify({'success': True, 'message': 'Message received. We\'ll get back to you soon.'})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'error': 'Server error'}), 500


@main_bp.route('/api/leads', methods=['POST'])
def api_lead_capture():
    try:
        data = request.json or {}
        email = sanitize_text(data.get('email', ''), 200).strip().lower()
        name = sanitize_text(data.get('name', ''), 100)
        if not email or '@' not in email:
            return jsonify({'success': False, 'error': 'Valid email required'}), 400
        exists = Lead.query.filter_by(email=email).first()
        if not exists:
            lead = Lead(name=name, email=email, source='landing', created_at=str(datetime.now(timezone.utc)))
            db.session.add(lead)
            db.session.commit()
        return jsonify({'success': True})
    except Exception:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'error': 'Server error'}), 500


@main_bp.route('/api/health')
def api_health():
    return jsonify({"status": "healthy"})


@main_bp.route('/api/seed', methods=['POST'])
@login_required
def api_seed():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    if User.query.first():
        return jsonify({"message": "Already seeded"})
    from seed import _run_seed
    from extensions import bcrypt
    audit_log('seed_db', 'database', detail='Seeded database with test data')
    _run_seed(bcrypt)
    return jsonify({"message": "Database seeded!"})


@main_bp.route('/api/reset-db', methods=['POST'])
@login_required
def api_reset_db():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    if os.environ.get('ENABLE_ADMIN_TOOLS', '').lower() != 'true':
        return jsonify({'error': 'Admin tools disabled'}), 403
    from seed import _run_seed
    from extensions import bcrypt
    audit_log('reset_db', 'database', detail='Database reset and re-seeded')
    _run_seed(bcrypt)
    return jsonify({"message": "Database reset and re-seeded!"})


@main_bp.route('/api/clean-data', methods=['POST'])
@login_required
def api_clean_data():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    if os.environ.get('ENABLE_ADMIN_TOOLS', '').lower() != 'true':
        return jsonify({'error': 'Admin tools disabled'}), 403
    from models import EventRegistration, UserLike, Connection, TeamApplicant, MentorshipRequest, MentorInteraction, Notification, ChatMessage, Comment, Post, Achievement, Project, VerificationRequest, SchoolAnnouncement, TeamRequest, Mentor, Opportunity, Ad, School
    audit_log('clean_data', 'database', detail='Removed all seed data')
    EventRegistration.query.delete(); UserLike.query.delete(); Connection.query.delete()
    TeamApplicant.query.delete(); MentorshipRequest.query.delete(); MentorInteraction.query.delete()
    Notification.query.delete(); ChatMessage.query.delete(); Comment.query.delete()
    Post.query.delete(); Achievement.query.delete(); Project.query.delete()
    VerificationRequest.query.delete(); SchoolAnnouncement.query.delete(); TeamRequest.query.delete()
    Mentor.query.delete(); Opportunity.query.delete(); Ad.query.delete(); School.query.delete()
    db.session.commit()
    return jsonify({"message": "All seed data removed. Test users preserved."})


@main_bp.route('/api/migrate', methods=['POST'])
@login_required
def api_migrate():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    if os.environ.get('ENABLE_ADMIN_TOOLS', '').lower() != 'true':
        return jsonify({'error': 'Admin tools disabled'}), 403
    run_startup_migrations(current_app)
    return jsonify({"message": "Migrations re-ran"})
