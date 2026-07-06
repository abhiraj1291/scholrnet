# ScholrNet v2

Academic Trust Network — a Flask + Jinja2 monolith with vanilla HTML/CSS/JS frontend. Mobile-first, dark mode, persistent auth, and 20+ features (feed, portfolio, verification, mentorship, analytics, AI advisor, chat, etc.).

## Quick Start

```bash
pip install -r backend/requirements.txt
cd backend && cp .env.example .env  # edit GEMINI_API_KEY if desired
cd .. && python backend/seed.py     # populates DB with sample data
python run.py
```

Open http://localhost:3000

## Project Structure

```
├── run.py                 # Entry point (creates Flask app)
├── backend/               # Python backend
│   ├── app.py             # All 40+ routes (page + API)
│   ├── models.py          # 22 SQLAlchemy models
│   ├── config.py          # Config (SQLite, Gemini key)
│   ├── seed.py            # DB seeder
│   └── requirements.txt
├── frontend/              # Frontend assets
│   ├── templates/         # 12 Jinja2 templates
│   │   ├── base.html      # Master layout
│   │   ├── auth/          # login.html, register.html
│   │   └── *.html         # feed, profile, teams, mentors, etc.
│   └── static/
│       ├── css/style.css  # Mobile-first CSS
│       └── js/            # main.js, feed.js, profile.js, admin.js, chat.js, search.js
└── scholrnet.db           # SQLite database (auto-created)
```

## Routes

### Pages (11)
`/login`, `/register`, `/dashboard`, `/profile`, `/opportunities`, `/teams`, `/mentors`, `/analytics`, `/advisor`, `/search`, `/chat`, `/school-desk`, `/admin-panel`

### API (30+)
`/api/posts`, `/api/user/stats`, `/api/ads`, `/api/notifications`, `/api/search`, `/api/messages`, `/api/connection/toggle`, `/api/gemini/analyze-portfolio`, `/api/gemini/ask-advisor`, `/api/health`, and CRUD for posts, comments, likes, achievements, projects, teams, mentorship, verification, opportunities, events, announcements.

## Deployment

### PythonAnywhere (Free)
1. Upload files via git or web UI
2. Create a web app with manual config → Python 3.11
3. Set WSGI file to `run.py` (or wrap in `run:app`)
4. Add env vars in the Web tab
5. Run `python backend/seed.py` in a Bash console

### Render (Free Tier)
1. Push to GitHub
2. Create new **Web Service**, select repo
3. Build command: `pip install -r backend/requirements.txt`
4. Start command: `gunicorn run:app`
5. Add `GEMINI_API_KEY` env var
6. Run seed: `render shell` → `python backend/seed.py`

### Railway (Free Tier)
1. Push to GitHub, create new Railway project
2. Start command: `gunicorn run:app`
3. Add env vars, deploy
4. Run `python backend/seed.py` once

### VPS (Ubuntu + Nginx)
```bash
git clone <repo> && cd scholrnet
pip install -r backend/requirements.txt gunicorn
python backend/seed.py
gunicorn run:app --bind 0.0.0.0:8000
# Reverse proxy with Nginx to port 8000
```

## Env Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | — | Google Gemini API key for AI features |
| `FLASK_SECRET_KEY` | No | scholrnet_secure_academic_seal | Session signing key |
| `APP_URL` | No | — | Public URL for self-referential links |

AI features gracefully degrade if `GEMINI_API_KEY` is not set.
