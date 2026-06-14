# ScholrNet — Roadmap & Context

## Goal
Transform ScholrNet into a professional, fast, trustworthy student platform with improved conversion, SEO, and modern design.

## Constraints & Preferences
- Python/Flask only; no React/Node.js build step.
- Vanilla HTML/CSS/JS with Lucide icons + custom CSS.
- Mobile-first responsive.
- Real persistent auth (Flask-Login + bcrypt + optional Firebase Google login).
- Supabase PostgreSQL + Storage for files.
- Vercel free tier (10s function timeout), no credit card required.
- Custom domain scholrnet.in connected and live.
- Never add fake testimonials, user counts, partnerships, or success stories.

## Progress

### Phase 1: Performance & Security (Done)
- Removed `notifications` variable from 15+ route handlers (was passed but never used in templates)
- Lazy-loaded schools list via JS fetch on settings modal open (not on every page via context processor)
- Removed 9+ unused DB queries from dashboard route (posts, opportunities, team_requests, mentors, achievements, projects, registered_event_ids, connections — all loaded via JS API)
- Removed unused achievements, projects, ads queries from profile route
- Added `defer` to all 6 JS script tags
- Added preconnect for Supabase storage, Google Fonts, Unpkg, Gstatic
- Bumped static cache to v5
- Fixed RLS: extracted `enable_rls()` that runs AFTER `db.create_all()`, added `REVOKE ALL FROM anon, authenticated` on all 26 tables, added missing `chat_typing`

### Phase 2: Landing Page Redesign (Done)
- 10-section responsive structure: sticky nav with backdrop blur, hero with mockup cards, trust bar (real DB counts), 6-feature grid, comparison table vs LinkedIn/Internshala/Unstop, 3-step how-it-works, live opportunities from DB, featured clubs from DB, founder story, 6-question FAQ with Schema.org, final CTA with 4 trust badges, 4-column footer
- Design system: Purple primary (#6C3BF5), Teal secondary (#00C4B8), Coral accent (#FF6B6B), CSS custom properties, card shadows, scroll animations
- Landing JS: scroll observer, hero card stagger, FAQ toggle animation, mobile nav with escape-key close, smooth scroll
- Real DB data: schools_count, users_count, clubs_count, opportunities_count, recent_opportunities, recent_clubs

### Phase 2b: Auth Pages Redesign (Done)
- Login and register pages rewritten with new design system
- Register: trust badges, Inter font, SVG artwork, consistent card layout

### Phase 3: Conversion & SEO (Done)
- **Conversion funnel**: Landing hero CTA → Register directly (no Login prompt). Login only via explicit `/login` link.
- **Registration friction reduced**: Removed password confirmation field, removed email-verify nag from dashboard
- **Blog**: 3 seed articles via auto-migration (internships guide, 10 scholarships, profile building), `blog_index.html`, `blog_post.html` with Schema.org BlogPosting LD+JSON, Open Graph
- **SEO routes**: `/robots.txt`, `/sitemap.xml` (dynamic with schools + blog), `/opportunity/<id>/<slug>`, `/school/<id>/<slug>` (school_landing.html with students + clubs), `/blog`, `/blog/<slug>`
- **School landing pages**: Public SEO page per school showing verified students + clubs, CTA to join
- **Email capture**: Inline lead form in landing CTA section, exit-intent modal (once per visitor via localStorage), both POST to `/api/leads`
- **Trust signals**: 4 CTA badges on landing + register form
- **Nav/Footer**: "Resources" link to blog in desktop nav, mobile nav, and footer
- **Referral system**: `/api/referral/generate`, `/api/referral/invite`, `/api/referral/claim`, badge awarded after 1 joined referral
- **Social sharing**: `/api/share/achievement/<id>` returns share text + profile URL
- **Opportunity detail page**: SEO-optimized with Schema.org Article markup

## Remaining / Next Steps
1. Set `VERCEL_TOKEN` GitHub secret so auto-deploy runs on push to main
2. Submit sitemap to Google Search Console for indexing
3. Add more blog content (monthly cadence)

## Key Decisions
- Schools lazy-loaded via JS API (not context processor)
- Landing page uses real DB data (never fake numbers)
- Purple primary (differentiates from LinkedIn=blue, Unstop=blue, Internshala=green)
- Email capture is optional (not required for signup)
- Referral badge awarded after 1 joined referral (low threshold)
- No password confirmation on register (reduced friction)
- Email verification not enforced (users can explore before verifying)

## Critical Context
- Production URL: https://scholrnet.in
- Vercel free-tier function timeout: 10s (Python cold start adds 2-4s)
- Flask app connects as superuser (bypasses Postgres RLS)
- Resend API key works, domain verified for email
- CSP allows `https:` for images, `*.supabase.co`, `https://challenges.cloudflare.com`

## Relevant Files
- `backend/app.py` — all routes (landing, blog, school, referral, share, leads, robots.txt, sitemap.xml, RLS auto-migration, blog seeding)
- `backend/models.py` — Lead, Referral, BlogPost, User (referral_code, referral_badge), 28 total models
- `api/index.py` — calls `enable_rls()` after `db.create_all()`
- `frontend/templates/landing.html` — 10-section landing with email capture + exit modal
- `frontend/templates/blog_index.html`, `blog_post.html`, `school_landing.html`, `opportunity_detail.html`
- `frontend/templates/auth/login.html`, `register.html` — redesigned
- `frontend/templates/base.html` — Inter font, footer CSS, meta tags, `?v=5`
- `frontend/static/css/landing.css` — design system + exit modal styles
- `frontend/static/js/landing.js` — email capture, exit intent, scroll animations, FAQ, mobile nav
- `frontend/static/css/style.css` — `.app-footer` styles
