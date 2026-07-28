import os
from sqlalchemy import text, inspect
from models import db, BlogPost, User, Connection, ClubMember
from utils.email import send_email, email_otp_body


def run_startup_migrations(app):
    """
    Run all startup migrations and seed data.
    Called once after db.create_all().
    """
    from datetime import datetime, timezone

    if app.config.get('MIGRATIONS_RAN', False):
        return
    app.config['MIGRATIONS_RAN'] = True

    try:
        inspector = inspect(db.engine)
        users_cols = [c['name'] for c in inspector.get_columns('users')]
        with db.engine.connect() as conn:
            _ensure_users_columns(conn, users_cols)
        _promote_owner(app)
        _seed_blog_posts()
        _ensure_posts_club_id(inspector)
        _ensure_posts_image_url_text(inspector)
        _ensure_schools_verification_cols(inspector)
        _ensure_chat_typing()
        _ensure_chat_messages_group_cols(inspector)
        _create_performance_indexes()
        _ensure_organization_tables()
        _ensure_connections_columns()
        _run_extended_migrations(inspector)
        _clean_duplicate_connections()
        _recalculate_club_member_counts()
        _add_connection_unique_indexes()
        _add_terms_privacy_columns()
        _create_policy_versions_table()
    except Exception as e:
        print(f"AUTO-MIGRATE: startup migration error: {e}")


def _ensure_users_columns(conn, cols):
    for col, col_type in [
        ('school_verified', 'BOOLEAN DEFAULT FALSE'),
        ('verified_school_id', 'INTEGER REFERENCES schools(id)'),
        ('totp_secret', 'VARCHAR(32) DEFAULT \'\''),
        ('totp_enabled', 'BOOLEAN DEFAULT FALSE'),
        ('totp_backup_codes', 'TEXT DEFAULT \'\''),
        ('email_verified', 'BOOLEAN DEFAULT FALSE'),
        ('email_verify_token', 'VARCHAR(128) DEFAULT \'\''),
        ('reset_password_token', 'VARCHAR(128) DEFAULT \'\''),
        ('reset_password_token_expires', 'VARCHAR(30) DEFAULT \'\''),
        ('email_otp', 'VARCHAR(6) DEFAULT \'\''),
        ('email_otp_expires', 'TIMESTAMP'),
        ('reset_otp', 'VARCHAR(6) DEFAULT \'\''),
        ('reset_otp_expires', 'TIMESTAMP'),
        ('cover_banner', 'VARCHAR(500) DEFAULT \'\''),
        ('session_version', 'INTEGER DEFAULT 0'),
        ('login_attempts', 'INTEGER DEFAULT 0'),
        ('locked_until', 'TIMESTAMP'),
    ]:
        if col not in cols:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
    if 'referral_code' not in cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) DEFAULT NULL"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)"))
    if 'referral_badge' not in cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN referral_badge BOOLEAN DEFAULT FALSE"))
    conn.commit()


def _promote_owner(app):
    try:
        owner_email = 'abhiraj29in@gmail.com'
        owner = User.query.filter_by(email=owner_email).first()
        if owner and owner.role != 'super_admin':
            owner.role = 'super_admin'
            db.session.commit()
            print(f"AUTO-MIGRATE: Promoted {owner_email} to super_admin")
        old_sa = User.query.filter_by(email='admin@scholrnet.com').first()
        if old_sa:
            db.session.delete(old_sa)
            db.session.commit()
            print("AUTO-MIGRATE: Removed hardcoded seed super_admin account")
    except Exception as e:
        print(f"AUTO-MIGRATE: super_admin promotion failed: {e}")


def _seed_blog_posts():
    try:
        from datetime import datetime, timezone
        if BlogPost.query.count() == 0:
            seed_articles = [
                {
                    'title': 'How to Find Internships as a High School Student',
                    'slug': 'how-to-find-internships-high-school',
                    'category': 'Guide',
                    'excerpt': 'A practical guide to finding internships as a high school student — where to look, how to apply, and how to stand out.',
                    'content': '<h2>Why Internships Matter in High School</h2><p>Internships give you real-world experience, strengthen your college applications, and help you discover what you enjoy. Here\'s how to find them.</p><h2>1. Start with Your Network</h2><p>Talk to teachers, family friends, and school counselors. Many opportunities come through personal connections. Let people know you\'re looking.</p><h2>2. Use Online Platforms</h2><p>ScholrNet aggregates internships, research programs, and fellowships for students. Create your profile and get matched with opportunities that fit your interests.</p><h2>3. Cold Email Strategically</h2><p>Identify companies or labs you\'re interested in. Write a short, professional email explaining why you want to work with them and what you can contribute.</p><h2>4. Build Your Portfolio</h2><p>Before applying, make sure your ScholrNet profile is complete with your achievements, projects, and school-verified credentials. A strong profile doubles your chances.</p><h2>5. Apply Early and Often</h2><p>Deadlines fill up fast. Track them on ScholrNet and apply as early as possible. Don\'t get discouraged by rejections — every application is practice.</p>'
                },
                {
                    'title': '10 Scholarships Every Indian Student Should Know About',
                    'slug': '10-scholarships-indian-students',
                    'category': 'Scholarships',
                    'excerpt': 'Discover 10 scholarships available to Indian students — from merit-based to need-based — and learn how to apply successfully.',
                    'content': '<h2>Scholarships Can Change Your Life</h2><p>Millions of rupees in scholarships go unclaimed every year. Here are 10 scholarships every Indian student should apply for.</p><h2>1. National Talent Search Examination (NTSE)</h2><p>One of the most prestigious scholarships in India. Open to class 10 students. Covers tuition and provides a monthly stipend.</p><h2>2. Kishore Vaigyanik Protsahan Yojana (KVPY)</h2><p>For students interested in research careers in basic sciences. Open to class 11, 12, and first-year undergraduate students.</p><h2>3. Inspire Scholarship</h2><p>For students who rank in the top 1% of their class 12 board exams in science. Provides financial support for undergraduate studies.</p><h2>4. AICTE Pragati Scholarship</h2><p>For girl students pursuing technical education. Covers tuition fees and provides a stipend for project work.</p><h2>5. Sitaram Jindal Foundation Scholarship</h2><p>Need-based scholarship for students from class 1 to professional courses. One of the most accessible scholarships.</p><h2>Build Your Profile on ScholrNet</h2><p>Keep your ScholrNet profile updated with your achievements. Many scholarship committees look for verified credentials — and that\'s exactly what we provide.</p>'
                },
                {
                    'title': 'How to Build a Strong Student Profile for College Applications',
                    'slug': 'build-strong-student-profile-college',
                    'category': 'Guide',
                    'excerpt': 'Learn how to create a compelling academic profile that colleges notice — with verified achievements, projects, and recommendations.',
                    'content': '<h2>Your Profile is Your Story</h2><p>College admissions officers spend an average of 8 minutes reviewing each application. Your profile needs to tell a compelling story in that time.</p><h2>1. Focus on Quality Over Quantity</h2><p>Having 20 minor achievements is less impressive than 3 significant ones with verified impact. Prioritize depth over breadth.</p><h2>2. Get Your Achievements Verified</h2><p>Unverified achievements are just claims. ScholrNet\'s school verification system turns claims into credentials that colleges can trust.</p><h2>3. Showcase Projects and Research</h2><p>Colleges want to see what you\'ve built, not just what you\'ve studied. Document your projects, research papers, and creative work on your portfolio.</p><h2>4. Demonstrate Leadership</h2><p>Leadership isn\'t just about titles. Show how you\'ve initiated change — starting a club, organizing an event, or mentoring younger students.</p><h2>5. Keep Everything in One Place</h2><p>Use ScholrNet to maintain your academic portfolio. Generate a shareable link for college applications. One URL. Everything they need to know.</p>'
                }
            ]
            now_str = str(datetime.now(timezone.utc))
            for art in seed_articles:
                existing = BlogPost.query.filter_by(slug=art['slug']).first()
                if not existing:
                    bp = BlogPost(title=art['title'], slug=art['slug'], excerpt=art['excerpt'], content=art['content'], category=art['category'], published=True, created_at=now_str, updated_at=now_str)
                    db.session.add(bp)
            db.session.commit()
            print("AUTO-MIGRATE: Seeded 3 blog articles")
    except Exception as e:
        print(f"AUTO-MIGRATE: Blog seeding failed: {e}")


def _ensure_posts_club_id(inspector):
    try:
        posts_cols = [c['name'] for c in inspector.get_columns('posts')]
        if 'club_id' not in posts_cols:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE posts ADD COLUMN club_id INTEGER REFERENCES clubs(id)"))
                conn.commit()
                print("AUTO-MIGRATE: Added club_id column to posts table")
    except Exception as e:
        print(f"AUTO-MIGRATE: posts.club_id migration failed: {e}")


def _ensure_posts_image_url_text(inspector):
    try:
        posts_cols = [c['name'] for c in inspector.get_columns('posts')]
        if 'image_url' in posts_cols:
            type_info = [c for c in inspector.get_columns('posts') if c['name'] == 'image_url'][0]
            if 'VARCHAR' in str(type_info.get('type', '')).upper():
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE posts ALTER COLUMN image_url TYPE TEXT"))
                    conn.commit()
                    print("AUTO-MIGRATE: Changed posts.image_url to TEXT")
    except Exception as e:
        print(f"AUTO-MIGRATE: posts.image_url type change failed: {e}")


def _ensure_schools_verification_cols(inspector):
    try:
        schools_cols = [c['name'] for c in inspector.get_columns('schools')]
        with db.engine.connect() as conn:
            if 'verification_code' not in schools_cols:
                conn.execute(text("ALTER TABLE schools ADD COLUMN verification_code VARCHAR(8) DEFAULT ''"))
            if 'verified_by_email' not in schools_cols:
                conn.execute(text("ALTER TABLE schools ADD COLUMN verified_by_email VARCHAR(200) DEFAULT ''"))
            conn.commit()
    except Exception as e:
        print(f"AUTO-MIGRATE: schools verification columns failed: {e}")


def _ensure_chat_typing():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS chat_typing (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, contact_id INTEGER NOT NULL, updated_at TIMESTAMP DEFAULT NOW())"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_typing_user_contact ON chat_typing(user_id, contact_id)"))
            conn.commit()
    except Exception as e:
        print(f"AUTO-MIGRATE: chat_typing table creation failed: {e}")


def _ensure_chat_messages_group_cols(inspector):
    try:
        chat_msg_cols = [c['name'] for c in inspector.get_columns('chat_messages')]
        with db.engine.connect() as conn:
            if 'group_id' not in chat_msg_cols:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN group_id INTEGER DEFAULT NULL"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_group ON chat_messages(group_id)"))
            if 'sender_name' not in chat_msg_cols:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN sender_name VARCHAR(100) DEFAULT ''"))
            if 'sender_avatar' not in chat_msg_cols:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN sender_avatar VARCHAR(50) DEFAULT ''"))
            conn.commit()
    except Exception as e:
        print(f"AUTO-MIGRATE: chat_messages group columns failed: {e}")


def _create_performance_indexes():
    try:
        with db.engine.connect() as conn:
            for idx_sql in [
                "CREATE INDEX IF NOT EXISTS idx_posts_club_id ON posts(club_id)",
                "CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, unread)",
                "CREATE INDEX IF NOT EXISTS idx_user_likes_post ON user_likes(user_id, post_id)",
                "CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)",
                "CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id)",
                "CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes)",
                "CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline)",
                "CREATE INDEX IF NOT EXISTS idx_users_school ON users(school)",
                "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
                "CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name)",
                "CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name)",
                "CREATE INDEX IF NOT EXISTS idx_experiences_user_current ON experiences(user_id, is_current)",
                "CREATE INDEX IF NOT EXISTS idx_blog_published_category ON blog_posts(published, category)",
                "CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published)",
                "CREATE INDEX IF NOT EXISTS idx_posts_author_likes ON posts(author_id, likes)",
                "CREATE INDEX IF NOT EXISTS idx_connections_connected_status ON connections(connected_user_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_connections_user_status ON connections(user_id, status)",
            ]:
                try:
                    conn.execute(text(idx_sql))
                except Exception:
                    pass
            conn.commit()
    except Exception as e:
        print(f"AUTO-MIGRATE: performance indexes failed: {e}")


def _ensure_organization_tables():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name VARCHAR(300) NOT NULL, slug VARCHAR(300) UNIQUE NOT NULL, type VARCHAR(20) NOT NULL, website VARCHAR(300) DEFAULT '', domain VARCHAR(100) DEFAULT '', website_domain VARCHAR(100) DEFAULT '', status VARCHAR(30) DEFAULT 'pending_email_verification', verification_level VARCHAR(20) DEFAULT 'unverified', logo VARCHAR(500) DEFAULT '', description TEXT DEFAULT '', address VARCHAR(500) DEFAULT '', phone VARCHAR(30) DEFAULT '', business_registration VARCHAR(100) DEFAULT '', verification_code VARCHAR(20) DEFAULT '', is_verified BOOLEAN DEFAULT FALSE, risk_level VARCHAR(20) DEFAULT 'low', duplicate_of INTEGER REFERENCES organizations(id), created_at TIMESTAMP DEFAULT NOW(), approved_at TIMESTAMP, approved_by INTEGER REFERENCES users(id), rejection_reason TEXT DEFAULT '')"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS organization_members (id SERIAL PRIMARY KEY, organization_id INTEGER REFERENCES organizations(id) NOT NULL, user_id INTEGER REFERENCES users(id), role VARCHAR(50) NOT NULL DEFAULT 'staff', invited_by INTEGER REFERENCES users(id), invited_at TIMESTAMP DEFAULT NOW(), joined_at TIMESTAMP, status VARCHAR(20) DEFAULT 'pending', invite_token VARCHAR(64) DEFAULT '')"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS organization_registrations (id SERIAL PRIMARY KEY, org_name VARCHAR(300) NOT NULL, org_type VARCHAR(20) NOT NULL, website VARCHAR(300) DEFAULT '', applicant_name VARCHAR(100) NOT NULL, applicant_role VARCHAR(100) DEFAULT '', applicant_email VARCHAR(200) NOT NULL, applicant_phone VARCHAR(30) DEFAULT '', notes TEXT DEFAULT '', email_domain VARCHAR(100) DEFAULT '', risk_level VARCHAR(20) DEFAULT 'low', duplicate_flag BOOLEAN DEFAULT FALSE, duplicate_org_id INTEGER REFERENCES organizations(id), otp VARCHAR(6) DEFAULT '', otp_expires_at TIMESTAMP, otp_verified_at TIMESTAMP, invite_token VARCHAR(64) DEFAULT '', invite_expires_at TIMESTAMP, invite_used_at TIMESTAMP, admin_notes TEXT DEFAULT '', status VARCHAR(30) DEFAULT 'pending_email', reviewed_by INTEGER REFERENCES users(id), reviewed_at TIMESTAMP, org_id INTEGER REFERENCES organizations(id), created_at TIMESTAMP DEFAULT NOW())"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS org_audit_logs (id SERIAL PRIMARY KEY, organization_id INTEGER REFERENCES organizations(id), action VARCHAR(100) NOT NULL, performed_by INTEGER REFERENCES users(id), metadata_json TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW())"))
            conn.commit()
        print("AUTO-MIGRATE: Ensured organization tables exist")
    except Exception as e:
        print(f"AUTO-MIGRATE: organization table creation failed: {e}")


def _run_extended_migrations(inspector):
    if os.environ.get('RUN_MIGRATIONS', '').lower() != 'true':
        return
    try:
        schools_cols = [c['name'] for c in inspector.get_columns('schools')]
        with db.engine.connect() as conn:
            try:
                ads_cols = [c['name'] for c in inspector.get_columns('ads')]
                if 'active' not in ads_cols:
                    conn.execute(text("ALTER TABLE ads ADD COLUMN active BOOLEAN DEFAULT TRUE"))
                if 'target_role' not in ads_cols:
                    conn.execute(text("ALTER TABLE ads ADD COLUMN target_role VARCHAR(30) DEFAULT ''"))
                if 'created_at' not in ads_cols:
                    conn.execute(text("ALTER TABLE ads ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
            except Exception:
                pass
            try:
                chat_cols = [c['name'] for c in inspector.get_columns('chat_messages')]
                if 'is_read' not in chat_cols:
                    conn.execute(text("ALTER TABLE chat_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE"))
            except Exception:
                pass
            try:
                vreq_cols = [c['name'] for c in inspector.get_columns('verification_requests')]
                if 'school_id' not in vreq_cols:
                    conn.execute(text("ALTER TABLE verification_requests ADD COLUMN school_id INTEGER REFERENCES schools(id)"))
            except Exception:
                pass
            conn.commit()
            conn.execute(text("CREATE TABLE IF NOT EXISTS clubs (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, description TEXT DEFAULT '', bio TEXT DEFAULT '', is_private BOOLEAN DEFAULT FALSE, owner_id INTEGER REFERENCES users(id) NOT NULL, avatar VARCHAR(300) DEFAULT '', cover_url VARCHAR(500) DEFAULT '', created_at VARCHAR(30) DEFAULT '', member_count INTEGER DEFAULT 1, tags VARCHAR(500) DEFAULT '')"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS club_members (id SERIAL PRIMARY KEY, club_id INTEGER REFERENCES clubs(id) NOT NULL, user_id INTEGER REFERENCES users(id) NOT NULL, role VARCHAR(20) DEFAULT 'member', joined_at VARCHAR(30) DEFAULT '')"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS club_join_requests (id SERIAL PRIMARY KEY, club_id INTEGER REFERENCES clubs(id) NOT NULL, user_id INTEGER REFERENCES users(id) NOT NULL, status VARCHAR(20) DEFAULT 'pending', requested_at VARCHAR(30) DEFAULT '', responded_at VARCHAR(30) DEFAULT '')"))
            try:
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_club_member ON club_members(club_id, user_id)"))
            except Exception:
                pass
            try:
                clubs_cols2 = [c['name'] for c in inspector.get_columns('clubs')]
                if 'is_private' not in clubs_cols2:
                    conn.execute(text("ALTER TABLE clubs ADD COLUMN is_private BOOLEAN DEFAULT FALSE"))
                if 'bio' not in clubs_cols2:
                    conn.execute(text("ALTER TABLE clubs ADD COLUMN bio TEXT DEFAULT ''"))
            except Exception:
                pass
            conn.commit()
            try:
                conn.execute(text("CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), user_name VARCHAR(100) DEFAULT '', action VARCHAR(50) NOT NULL, target_type VARCHAR(50) DEFAULT '', target_id INTEGER, detail TEXT DEFAULT '', ip_address VARCHAR(45) DEFAULT '', timestamp VARCHAR(30) DEFAULT '')"))
            except Exception:
                pass
            conn.commit()
    except Exception as e:
        print(f"AUTO-MIGRATE extended: {e}")


def _clean_duplicate_connections():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("SET client_min_messages TO warning"))
            conn.execute(text("DELETE FROM connections WHERE user_id = connected_user_id"))
            conn.execute(text("""
                DELETE FROM connections WHERE id NOT IN (
                    SELECT MIN(id) FROM connections GROUP BY user_id, connected_user_id
                )
            """))
            conn.execute(text("""
                DELETE FROM connections WHERE id IN (
                    SELECT c1.id FROM connections c1
                    INNER JOIN connections c2 ON (
                        c1.user_id = c2.connected_user_id AND c1.connected_user_id = c2.user_id
                    )
                    WHERE c1.id > c2.id
                )
            """))
            conn.commit()
        print("AUTO-MIGRATE: Cleaned duplicate connections")
    except Exception as e:
        print(f"AUTO-MIGRATE: connection cleanup failed: {e}")


def _recalculate_club_member_counts():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("""
                UPDATE clubs SET member_count = (
                    SELECT COUNT(*) FROM club_members WHERE club_members.club_id = clubs.id
                )
            """))
            conn.commit()
        print("AUTO-MIGRATE: Recalculated club member_counts")
    except Exception as e:
        print(f"AUTO-MIGRATE: club member_count recalculation failed: {e}")


def _add_connection_unique_indexes():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique
                ON connections(user_id, connected_user_id)
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair
                ON connections(LEAST(user_id, connected_user_id), GREATEST(user_id, connected_user_id))
            """))
            conn.commit()
        print("AUTO-MIGRATE: Added unique indexes on connections")
    except Exception as e:
        print(f"AUTO-MIGRATE: connections unique indexes failed: {e}")


def _ensure_connections_columns():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE connections ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
            """))
            conn.commit()
        print("AUTO-MIGRATE: Ensured connections.status column")
    except Exception as e:
        print(f"AUTO-MIGRATE: connections column check failed: {e}")


def _add_terms_privacy_columns():
    try:
        with db.engine.connect() as conn:
            for col, col_type in [
                ('terms_accepted', 'BOOLEAN DEFAULT FALSE'),
                ('terms_accepted_at', 'TIMESTAMP'),
                ('terms_version', 'VARCHAR(20) DEFAULT \'\''),
                ('privacy_accepted_at', 'TIMESTAMP'),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {col_type}"))
                except Exception:
                    pass
            conn.commit()
        print("AUTO-MIGRATE: Added terms/privacy columns to users table")
    except Exception as e:
        print(f"AUTO-MIGRATE: terms/privacy columns failed: {e}")


def _create_policy_versions_table():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS policy_versions (
                    id SERIAL PRIMARY KEY,
                    policy_type VARCHAR(20) NOT NULL,
                    version VARCHAR(20) NOT NULL,
                    content TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT NOW(),
                    published BOOLEAN DEFAULT FALSE
                )
            """))
            conn.commit()
        print("AUTO-MIGRATE: Created policy_versions table")
    except Exception as e:
        print(f"AUTO-MIGRATE: policy_versions table failed: {e}")


def enable_rls():
    """Enable RLS + revoke anon/authenticated perms on all tables."""
    try:
        rls_tables = ['users','achievements','projects','posts','comments','ads','opportunities','team_requests','team_applicants','verification_requests','mentors','mentorship_requests','mentor_interactions','notifications','chat_messages','chat_typing','clubs','club_members','club_join_requests','schools','school_announcements','connections','user_likes','event_registrations','experiences','audit_logs','leads','referrals','blog_posts','organizations','organization_members','organization_registrations','org_audit_logs']
        with db.engine.connect() as conn:
            conn.execute(text("SET client_min_messages TO warning"))
            for tbl in rls_tables:
                try:
                    conn.execute(text(f"ALTER TABLE IF EXISTS {tbl} ENABLE ROW LEVEL SECURITY"))
                except Exception:
                    pass
                try:
                    conn.execute(text(f"DROP POLICY IF EXISTS deny_all ON {tbl}"))
                    conn.execute(text(f"CREATE POLICY deny_all ON {tbl} FOR ALL USING (false)"))
                except Exception:
                    pass
                try:
                    conn.execute(text(f"REVOKE ALL ON {tbl} FROM anon, authenticated"))
                except Exception:
                    pass
            conn.commit()
        print("AUTO-MIGRATE: RLS enabled on all tables")
    except Exception as e:
        print(f"AUTO-MIGRATE: RLS setup failed: {e}")
