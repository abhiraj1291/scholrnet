import os
import json
import http.client
import ssl
from markupsafe import escape as escape_html

LOGO_B64 = 'https://www.scholrnet.in/static/logo-email.png'


def send_email(to_email, subject, html_body):
    api_key = (os.environ.get('RESEND_API_KEY', '') or '').strip()
    if api_key:
        body = json.dumps({
            'from': 'ScholrNet <noreply@scholrnet.in>',
            'to': [to_email],
            'subject': subject,
            'html': html_body
        })
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection('api.resend.com', context=ctx, timeout=15)
        try:
            conn.request('POST', '/emails', body, {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            })
            resp = conn.getresponse()
            data = resp.read().decode()
            if resp.status == 200:
                print(f"EMAIL SENT via Resend: {json.loads(data).get('id', 'ok')}")
                return True
            else:
                print(f"EMAIL SEND FAILED ({resp.status}): {data}")
        except Exception as e:
            print(f"EMAIL SEND FAILED: {e}")
        finally:
            conn.close()
    print(f"EMAIL ({to_email}): {subject}\n{html_body}")
    return False


def email_otp_body(name, otp, purpose):
    return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<tr><td style="padding:32px 32px 24px;text-align:center">
<img src="{LOGO_B64}" alt="ScholrNet" height="32" style="display:block;margin:0 auto 16px">
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a2744">{escape_html(purpose)}</h1>
<p style="margin:0 0 24px;font-size:14px;color:#5a6a7a">Hi {escape_html(name)},</p>
<div style="background:#f0f4ff;border-radius:12px;padding:20px;margin-bottom:24px">
<div style="font-size:12px;color:#5a6a7a;margin-bottom:8px">Your verification code</div>
<div style="font-size:36px;font-weight:900;color:#1a2744;letter-spacing:8px">{otp}</div>
<div style="font-size:12px;color:#5a6a7a;margin-top:8px">Expires in 10 minutes</div>
</div>
<p style="margin:0 0 4px;font-size:13px;color:#5a6a7a;line-height:1.5">If you didn't request this, please ignore this email.</p>
<p style="margin:0;font-size:13px;color:#5a6a7a">— ScholrNet Team</p>
</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#9aa6b5;border-top:1px solid #eef0f4">
ScholrNet — Academic Trust Network
</td></tr></table></td></tr></table></body></html>'''
