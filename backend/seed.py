"""Seed script: populates database with initial mock data."""
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

def seed_all(bcrypt_inst=None, flask_app=None):
    bc = bcrypt_inst or Bcrypt(app)
    if flask_app or not bcrypt_inst:
        _run_seed(bc)
    else:
        with app.app_context():
            _run_seed(bc)

def _run_seed(bcrypt):
    db.drop_all()
    db.create_all()