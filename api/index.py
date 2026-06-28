import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from dotenv import load_dotenv
load_dotenv()

from app import create_app

try:
    app = create_app()
except Exception:
    import traceback
    print(f"APP CREATION ERROR: {traceback.format_exc()}", file=sys.stderr)
    from flask import Flask
    app = Flask(__name__)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def fallback(path):
        return """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ScholrNet</title>
<style>body{margin:0;padding:2rem;font-family:-apple-system,sans-serif;background:#f4f6f9;color:#1a2744;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{max-width:28rem;text-align:center;background:#fff;padding:2.5rem;border-radius:1.5rem;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
h1{font-size:1.5rem;margin:0 0 0.5rem}
p{font-size:0.875rem;color:#5a6a7a;margin:0 0 1.5rem;line-height:1.6}
.btn{display:inline-block;padding:0.75rem 2rem;background:#1a2744;color:#fff;border-radius:0.75rem;text-decoration:none;font-weight:600;font-size:0.875rem}
</style></head>
<body><div class="card">
<h1>ScholrNet</h1>
<p>We're waking up the server. Please refresh in a moment.</p>
<a class="btn" href="/">Refresh</a>
</div></body></html>"""
