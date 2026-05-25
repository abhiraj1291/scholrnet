"""Seed script: populates SQLite with initial mock data."""
import json
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from flask_bcrypt import Bcrypt
from config import Config
from models import db, User, Achievement, Project, Post, Comment, Ad, Opportunity, TeamRequest
from models import TeamApplicant, VerificationRequest, Mentor, MentorshipRequest, MentorInteraction
from models import Notification, ChatMessage, School, SchoolAnnouncement, Connection, UserLike, EventRegistration

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
bcrypt = Bcrypt(app)

def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create admin user
        admin = User(
            name="Mrs. Shreya Sen",
            email="shreya@scholrnet.com",
            password_hash=bcrypt.generate_password_hash("school123").decode('utf-8'),
            school="Delhi Public School (DPS), R.K. Puram",
            role="admin",
            avatar="SS",
            grade="Faculty",
            bio="Head Coordinator of Academic Honors & CBSE Project Submissions"
        )
        db.session.add(admin)

        super_admin = User(
            name="Platform Admin",
            email="admin@scholrnet.com",
            password_hash=bcrypt.generate_password_hash("admin123").decode('utf-8'),
            school="ScholrNet",
            role="super_admin",
            avatar="SA",
            bio="Platform Administrator"
        )
        db.session.add(super_admin)

        student = User(
            name="Aarav Sharma",
            email="aarav@scholrnet.com",
            password_hash=bcrypt.generate_password_hash("student123").decode('utf-8'),
            school="Delhi Public School (DPS), R.K. Puram",
            grade="Class XII - Science (PCM)",
            role="student",
            avatar="AS",
            bio="Ambitious learner, coder, and astronomy enthusiast."
        )
        db.session.add(student)
        db.session.flush()

        # Achievements
        achievements_data = [
            {"title": "Regional Science Exhibition - 1st Position", "cat": "Project", "inst": "State Science Department", "year": "2025", "stat": "Verified", "vb": "Delhi Public School", "vh": "SCHOLR-7F9AD29B-C429"},
            {"title": "National Cyber Olympiad (NCO) - AIR 42", "cat": "Olympiad", "inst": "Science Olympiad Foundation (SOF)", "year": "2025", "stat": "Verified", "vb": "Delhi Public School", "vh": "SCHOLR-3E12D8A4-E393"},
            {"title": "Research Paper: Gravity Anomaly Modeling on Lunar Craters", "cat": "Research", "inst": "Young Scholars Astronomy Guild", "year": "2026", "stat": "Pending", "vb": "Pending Verification"},
        ]
        for a in achievements_data:
            ach = Achievement(
                user_id=student.id, title=a["title"], category=a["cat"],
                institution=a["inst"], year=a["year"], description=f"{a['title']} - achievement",
                verification_status=a["stat"], verified_by=a["vb"],
                verified_at="2025-11-10" if a["stat"] == "Verified" else "",
                verification_hash=a.get("vh", "")
            )
            db.session.add(ach)

        # Projects
        projects_data = [
            {"title": "Mars Rover CAD Prototyping", "desc": "Mechanical layout for rover chassis using Fusion 360.", "skills": "CAD Modeling,Physics Mechanics,3D Printing", "stat": "Pending"},
            {"title": "PyGrade: GPA Tracker", "desc": "CLI tool for CBSE percentage formatting.", "skills": "Python,CBSE Grading", "stat": "Verified", "vb": "Delhi Public School"},
        ]
        for p in projects_data:
            proj = Project(
                user_id=student.id, title=p["title"], description=p["desc"],
                skills=p["skills"], verification_status=p["stat"], verified_by=p.get("vb", "")
            )
            db.session.add(proj)

        # Schools
        schools_data = [
            {"id": 1, "name": "Delhi Public School (DPS), R.K. Puram", "location": "Sector XII, R.K. Puram, New Delhi", "tagline": "Service Before Self", "about": "One of India's most prestigious co-educational day-cum-boarding schools.", "established": "1972"},
            {"id": 2, "name": "Campion School, Mumbai", "location": "Cooperage Road, Fort, Mumbai", "tagline": "Joy in Learning", "about": "ICSE boys' school fostering leadership and computational science.", "established": "1943"},
            {"id": 3, "name": "The Doon School, Dehradun", "location": "Mall Road, Dehradun", "tagline": "The Aristocracy of Service", "about": "India's preeminent all-boys boarding school.", "established": "1935"},
        ]
        for s in schools_data:
            school = School(id=s["id"], name=s["name"], location=s["location"], tagline=s["tagline"], about=s["about"], established=s["established"])
            db.session.add(school)

        # Announcements
        anns = [
            {"sid": 1, "title": "Registration Open: Regional CBSE Science Fair", "content": "DPS will host the zonal Innovation Fair on June 10.", "badge": "Official Notice"},
            {"sid": 2, "title": "Young Authors Research Summit 2026", "content": "Partnering with Western Scholars League for abstract review.", "badge": "Honors List"},
        ]
        for a in anns:
            ann = SchoolAnnouncement(school_id=a["sid"], title=a["title"], content=a["content"], badge_text=a["badge"])
            db.session.add(ann)

        # Posts
        posts_data = [
            {"an": "Delhi Public School (DPS), R.K. Puram", "aa": "🏫", "as": "CBSE Affiliated Registry", "t": "Official Announcement: Zonal CBSE Innovation Exhibits", "c": "Our scientific advisory board invites all students to showcase projects.", "b": "DPS RK PURAM BULLETIN", "l": 138, "tg": ["DPSRKPuram", "ScienceZonals"]},
            {"an": "Aisha Patel", "aa": "AP", "as": "Campion School, Mumbai", "t": "National Merit Scholarship Winner!", "c": "Awarded the NTSE Scholarship!", "b": "NTSE SCHOLAR 2025", "l": 247, "tg": ["NTSE", "Scholarship"]},
            {"an": "Raj Kumar", "aa": "RK", "as": "The Doon School, Dehradun", "t": "Co-authored Research Paper Accepted!", "c": "Physics paper accepted in CBSE Regional Young Science Review.", "b": "PHYSICS EXCELLENCE", "l": 512, "tg": ["Research", "Acoustics"]},
        ]
        posts_authors = [admin.id, student.id, admin.id]
        for idx, p in enumerate(posts_data):
            post = Post(
                author_id=posts_authors[idx],
                author_name=p["an"], author_avatar=p["aa"], author_school=p["as"],
                title=p["t"], content=p["c"], badge_text=p["b"], likes=p["l"],
                tags=json.dumps(p["tg"]), timestamp="1 day ago"
            )
            db.session.add(post)
        db.session.flush()

        # Comments for first post
        comments_data = [
            {"pid": 1, "author": "Aarav Sharma", "avatar": "AS", "text": "Incredible opportunity! I am preparing my research draft."},
            {"pid": 1, "author": "Mrs. Shreya Sen (Coordinator)", "avatar": "SS", "text": "Warm congratulations! Make DPS proud."},
        ]
        for c in comments_data:
            cm = Comment(post_id=c["pid"], author=c["author"], avatar=c["avatar"], text=c["text"], timestamp="1 hour ago")
            db.session.add(cm)

        # Opportunities
        opps = [
            {"name": "Ignite National Teen Innovation Hackathon 2026", "type": "Hackathon", "prov": "Innovation Council of India", "prize": "₹5,00,000", "desc": "National prototype building contest for Grade IX-XII.", "elig": "Teams of 2-4 school pupils.", "dead": "June 15, 2026"},
            {"name": "KVPY Fellowships", "type": "Scholarship", "prov": "DST, Govt of India", "prize": "₹7,000/month", "desc": "Scholarship for excellence in basic sciences.", "elig": "Grade XI & XII science students.", "dead": "July 20, 2026"},
            {"name": "Shastri Research Grant", "type": "Fellowship", "prov": "Shastri Science Institute", "prize": "₹50,000 stipend", "desc": "Seed funding for high school chemical/material science.", "elig": "Grade XII with verified science achievements.", "dead": "August 01, 2026"},
        ]
        for o in opps:
            opp = Opportunity(name=o["name"], type=o["type"], provider=o["prov"], prize_pool=o["prize"], description=o["desc"], eligibility=o["elig"], deadline=o["dead"])
            db.session.add(opp)

        # Ads
        ads_data = [
            {"title": "MIT Teen Tech Summer Bootcamp 2026", "company": "MIT Innovation Labs", "img": "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", "content": "4-week virtual incubation for global high schoolers.", "cta_url": "https://mit.edu", "cta_text": "Apply Online", "placement": "left_sidebar", "clicks": 142, "imps": 4890},
            {"title": "Stanford Math & Physics Honors Track", "company": "Stanford pre-collegiate", "img": "linear-gradient(135deg, #881337 0%, #4c0519 100%)", "content": "Master Advanced Mechanics and Calculus BC.", "cta_url": "https://stanford.edu", "cta_text": "Explore Courses", "placement": "left_sidebar", "clicks": 89, "imps": 3120},
            {"title": "Supercharge Your Academic Portfolio", "company": "ScholrNet Premium", "img": "linear-gradient(135deg, #0a66c2 0%, #0369a1 100%)", "content": "Direct matching with Ivy League counselors.", "cta_url": "https://scholrnet.com", "cta_text": "Get Premium", "placement": "in_feed", "clicks": 341, "imps": 12050},
        ]
        for a in ads_data:
            ad = Ad(title=a["title"], company=a["company"], image=a["img"], content=a["content"], cta_url=a["cta_url"], cta_text=a["cta_text"], placement=a["placement"], clicks=a["clicks"], impressions=a["imps"])
            db.session.add(ad)

        # Mentors
        mentors_data = [
            {"name": "Prof. Sandeep Kulkarni", "role": "Coach", "inst": "HBCSE", "subj": "Physics Mechanics,Calculus,Astronomy", "bio": "Senior Physics Coach and Olympiad Trainer.", "rating": 4.9, "verified": True},
            {"name": "Mrs. Shreya Sen", "role": "Teacher", "inst": "Delhi Public School (DPS)", "subj": "Calculus,Mathematics", "bio": "Head Coordinator of Academic Honors.", "rating": 4.8, "verified": True},
            {"name": "Neha Singhal", "role": "Alumni", "inst": "Stanford University", "subj": "Python,React,CAD", "bio": "Gold Medalist in NCO, studying CS at Stanford.", "rating": 5.0, "verified": True},
        ]
        for m in mentors_data:
            mentor = Mentor(name=m["name"], role=m["role"], institution=m["inst"], subjects=m["subj"], bio=m["bio"], rating=m["rating"], is_verified=m["verified"], avatar=make_avatar(m["name"]))
            db.session.add(mentor)

        # Team requests
        teams_data = [
            {"title": "Need CAD Specialist for NASA Contest", "creator": student.name, "creator_id": student.id, "school": student.school, "opp": "NASA Space Settlement Design", "looking": ["Fusion 360", "Orbital Kinematics"], "desc": "Designing a centrifugal Mars orbital colony."},
        ]
        for t in teams_data:
            tr = TeamRequest(title=t["title"], creator_id=t["creator_id"], creator_name=t["creator"], creator_avatar=student.avatar, school=t["school"], opportunity_name=t["opp"], looking_for=json.dumps(t["looking"]), description=t["desc"])
            db.session.add(tr)
        db.session.flush()

        # Applicant
        app_l = TeamApplicant(team_request_id=1, name="Pranav Goel", school="The Doon School", status="accepted")
        db.session.add(app_l)

        # Verification requests
        vreqs = [
            {"uid": student.id, "sn": "Raj Kumar", "ss": "Delhi Public School", "at": "CBSE City Topper 2025", "cat": "Olympiad", "inst": "CBSE Board", "det": "Scoring transcript showing 99.4 percentile."},
            {"uid": student.id, "sn": "Sneha Kapoor", "ss": "Delhi Public School", "at": "Automated SafeSchool Bus Sensor", "cat": "Project", "inst": "DPS Science Club", "det": "Ultrasonic warning system for school buses."},
        ]
        for v in vreqs:
            vr = VerificationRequest(user_id=v["uid"], student_name=v["sn"], student_school=v["ss"], achievement_title=v["at"], category=v["cat"], institution=v["inst"], details=v["det"], status="pending", requested_at="2026-05-20")
            db.session.add(vr)

        # Chat messages
        chat_data = [
            {"s": student.id, "r": admin.id, "t": "Hey Mrs. Sen! Did you verify my robotics milestone?"},
            {"s": admin.id, "r": student.id, "t": "Yes! Got the digital cryptographic signature this morning."},
            {"s": student.id, "r": admin.id, "t": "That is awesome, thank you!"},
        ]
        for ch in chat_data:
            msg = ChatMessage(sender_id=ch["s"], receiver_id=ch["r"], text=ch["t"], timestamp="Just now")
            db.session.add(msg)

        # Notification
        notif = Notification(user_id=student.id, title="Welcome to ScholrNet! Complete your profile.", type="info", timestamp="Just now", unread=True)
        db.session.add(notif)

        # Connection
        conn = Connection(user_id=student.id, connected_user_id=admin.id)
        db.session.add(conn)

        db.session.commit()
        print("Database seeded successfully!")
        print("Users created:")
        print("  Student: aarav@scholrnet.com / student123")
        print("  Counselor: shreya@scholrnet.com / school123")
        print("  Super Admin: admin@scholrnet.com / admin123")


def make_avatar(name):
    parts = name.strip().split()
    return "".join(p[0] for p in parts if p)[:2].upper() or "ST"


if __name__ == "__main__":
    seed()
