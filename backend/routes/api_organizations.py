import os, re, secrets, json, html
from urllib.parse import urlparse
from datetime import datetime, timezone, timedelta
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, current_app, abort
from flask_login import login_required, current_user
import hmac
from models import db, User
from models_organization import Organization, OrganizationRegistration, OrganizationMember, OrgAuditLog, OrgStatus, OrgType, OrgMemberStatus
from extensions import bcrypt, limiter
from utils.email import send_email, email_otp_body

org_bp = Blueprint('org', __name__, url_prefix='')

@org_bp.errorhandler(429)
def org_429(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Too many requests. Please try again later.'}), 429
    return render_template('error.html', code=429, title='Too Many Requests', message='Please try again in a few minutes.', emoji='⏳'), 429

def _slugify(name):
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s[:250]

def _extract_domain(email):
    parts = email.strip().lower().split('@')
    return parts[1] if len(parts) == 2 else ''

def _extract_website_domain(website):
    if not website:
        return ''
    website = website.strip().lower()
    if not website.startswith('http'):
        website = 'https://' + website
    try:
        return urlparse(website).hostname or ''
    except:
        return ''

FREE_EMAIL_DOMAINS = {'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'}

def _assess_risk(email_domain, website_domain):
    if email_domain in FREE_EMAIL_DOMAINS:
        return 'high'
    if website_domain and email_domain != website_domain:
        return 'medium'
    return 'low'

def _check_duplicate_domain(domain, org_type):
    if not domain:
        return None
    existing = Organization.query.filter_by(domain=domain, type=org_type).filter(
        Organization.status.in_(['approved', 'active', 'pending_approval'])
    ).first()
    return existing.id if existing else None

def _org_audit(org_id, action, performed_by=None, metadata=None):
    log = OrgAuditLog(
        organization_id=org_id,
        action=action,
        performed_by=performed_by or (current_user.id if current_user.is_authenticated else None),
        metadata_json=json.dumps(metadata or {})
    )
    db.session.add(log)

# ─── Registration Pages ─────────────────────────────────────────

@org_bp.route('/register-company')
def register_company():
    return render_template('organizations/register.html', org_type='company')

@org_bp.route('/register-institution')
def register_institution():
    return render_template('organizations/register.html', org_type='institution')

@org_bp.route('/register-school')
def register_school():
    return render_template('organizations/register.html', org_type='school')

# ─── Registration API ───────────────────────────────────────────

@org_bp.route('/api/organization/register', methods=['POST'])
@limiter.limit("10 per 15 minutes", methods=['POST'])
def api_org_register():
    try:
        data = request.json or {}
        org_name = data.get('org_name', '').strip()
        org_type = data.get('org_type', '').strip()
        website = data.get('website', '').strip()
        applicant_name = data.get('applicant_name', '').strip()
        applicant_role = data.get('applicant_role', '').strip()
        applicant_email = data.get('applicant_email', '').strip().lower()
        applicant_phone = data.get('applicant_phone', '').strip()
        notes = data.get('notes', '').strip()

        if not org_name or not applicant_name or not applicant_email or org_type not in ('school', 'institution', 'company'):
            return jsonify({'error': 'Missing required fields'}), 400
        if org_type == 'company' and not website:
            return jsonify({'error': 'Website is required for companies'}), 400

        email_domain = _extract_domain(applicant_email)
        if email_domain in FREE_EMAIL_DOMAINS:
            return jsonify({'error': 'Registration is not accepted from free email providers. Please use your official organization email.'}), 400

        existing = OrganizationRegistration.query.filter(
            OrganizationRegistration.applicant_email == applicant_email,
            OrganizationRegistration.status.in_(['pending_email', 'pending_approval'])
        ).first()
        if existing:
            return jsonify({'error': 'A pending registration already exists for this email'}), 409

        slug = _slugify(org_name)
        base_slug = slug
        counter = 1
        while Organization.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        website_domain = _extract_website_domain(website)
        risk = _assess_risk(email_domain, website_domain)
        dup_id = _check_duplicate_domain(email_domain or website_domain, org_type)

        otp = f"{secrets.randbelow(1000000):06d}"
        reg = OrganizationRegistration(
            org_name=org_name, org_type=org_type, website=website,
            applicant_name=applicant_name, applicant_role=applicant_role,
            applicant_email=applicant_email, applicant_phone=applicant_phone,
            notes=notes, email_domain=email_domain,
            risk_level=risk, duplicate_flag=bool(dup_id),
            duplicate_org_id=dup_id,
            otp=otp, otp_expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            status='pending_email'
        )
        db.session.add(reg)
        db.session.flush()
        _org_audit(None, 'organization_registered', metadata={'reg_id': reg.id, 'type': org_type, 'name': org_name})
        db.session.commit()

        html = email_otp_body(applicant_name, otp, f'Verify your {org_type} registration on ScholrNet')
        send_email(applicant_email, f'Verify your {org_type} registration — ScholrNet', html)

        return jsonify({'success': True, 'reg_id': reg.id, 'message': 'OTP sent to your email'})
    except Exception as e:
        current_app.logger.exception('org register error')
        return jsonify({'error': 'Registration failed'}), 500

# ─── OTP Verification ───────────────────────────────────────────

@org_bp.route('/api/organization/verify-otp', methods=['POST'])
@limiter.limit("5 per 15 minutes", methods=['POST'])
def api_org_verify_otp():
    try:
        data = request.json or {}
        reg_id = data.get('reg_id')
        otp = data.get('otp', '').strip()
        reg = OrganizationRegistration.query.get(reg_id)
        if not reg:
            return jsonify({'error': 'Registration not found'}), 404
        if reg.status != 'pending_email':
            return jsonify({'error': 'Invalid state'}), 400
        if not reg.otp_expires_at or datetime.now(timezone.utc) > reg.otp_expires_at:
            return jsonify({'error': 'OTP expired. Request a new one.'}), 400
        if not hmac.compare_digest(str(reg.otp), otp):
            return jsonify({'error': 'Invalid OTP'}), 403

        reg.otp_verified_at = datetime.now(timezone.utc)
        reg.otp = ''
        reg.status = 'pending_approval'
        db.session.commit()
        _org_audit(None, 'otp_verified', metadata={'reg_id': reg.id})

        slug = _slugify(reg.org_name)
        base_slug = slug
        counter = 1
        while Organization.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        website_domain = _extract_website_domain(reg.website)
        org = Organization(
            name=reg.org_name, slug=slug, type=reg.org_type,
            website=reg.website, domain=reg.email_domain,
            website_domain=website_domain,
            status='pending_approval',
            verification_level='unverified',
            risk_level=reg.risk_level,
            duplicate_of=reg.duplicate_org_id,
            phone=reg.applicant_phone
        )
        if reg.org_type == 'school':
            import secrets as sec, string
            org.verification_code = ''.join(sec.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        db.session.add(org)
        db.session.flush()

        reg.org_id = org.id
        reg.status = 'pending_approval'
        db.session.commit()

        return jsonify({'success': True, 'message': 'Email verified. Your registration is pending admin approval.', 'reg_id': reg.id})
    except Exception as e:
        current_app.logger.exception('org verify otp error')
        return jsonify({'error': 'Verification failed'}), 500

@org_bp.route('/api/organization/resend-otp', methods=['POST'])
@limiter.limit("3 per 15 minutes", methods=['POST'])
def api_org_resend_otp():
    try:
        data = request.json or {}
        reg_id = data.get('reg_id')
        reg = OrganizationRegistration.query.get(reg_id)
        if not reg:
            return jsonify({'error': 'Registration not found'}), 404
        otp = f"{secrets.randbelow(1000000):06d}"
        reg.otp = otp
        reg.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.session.commit()
        html = email_otp_body(reg.applicant_name, otp, f'Verify your {reg.org_type} registration on ScholrNet')
        send_email(reg.applicant_email, f'Verify your {reg.org_type} registration — ScholrNet', html)
        return jsonify({'success': True, 'message': 'New OTP sent'})
    except Exception as e:
        current_app.logger.exception('org resend otp error')
        return jsonify({'error': 'Failed to resend OTP'}), 500

# ─── Admin Review Queue ─────────────────────────────────────────

@org_bp.route('/api/admin/pending-organizations')
@login_required
def api_admin_pending_orgs():
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    registrations = OrganizationRegistration.query.filter_by(status='pending_approval').order_by(OrganizationRegistration.created_at.desc()).all()
    approved = OrganizationRegistration.query.filter_by(status='approved').order_by(OrganizationRegistration.created_at.desc()).limit(20).all()
    return jsonify({
        'pending': [{
            'id': r.id, 'org_name': r.org_name, 'org_type': r.org_type,
            'website': r.website, 'applicant_name': r.applicant_name,
            'applicant_role': r.applicant_role, 'applicant_email': r.applicant_email,
            'applicant_phone': r.applicant_phone, 'notes': r.notes,
            'email_domain': r.email_domain, 'risk_level': r.risk_level,
            'duplicate_flag': r.duplicate_flag, 'duplicate_org_id': r.duplicate_org_id,
            'otp_verified': bool(r.otp_verified_at),
            'created_at': r.created_at.isoformat() if r.created_at else ''
        } for r in registrations],
        'approved': [{
            'id': r.id, 'org_name': r.org_name, 'org_type': r.org_type,
            'status': r.status, 'created_at': r.created_at.isoformat() if r.created_at else ''
        } for r in approved]
    })

@org_bp.route('/api/admin/organization/<int:reg_id>/approve', methods=['POST'])
@login_required
def api_admin_org_approve(reg_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json or {}
    reg = OrganizationRegistration.query.get_or_404(reg_id)
    if reg.status not in ('pending_approval',):
        return jsonify({'error': 'Invalid state'}), 400

    org = Organization.query.get(reg.org_id) if reg.org_id else None
    if not org:
        org = Organization.query.filter_by(name=reg.org_name, type=reg.org_type, status='pending_approval').first()
    if not org:
        return jsonify({'error': 'Organization record not found'}), 404

    org.status = 'approved'
    org.is_verified = True
    org.approved_at = datetime.now(timezone.utc)
    org.approved_by = current_user.id
    reg.status = 'approved'
    reg.reviewed_by = current_user.id
    reg.reviewed_at = datetime.now(timezone.utc)
    reg.admin_notes = data.get('admin_notes', reg.admin_notes or '')

    invite_token = secrets.token_urlsafe(48)
    reg.invite_token = invite_token
    reg.invite_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    db.session.commit()
    _org_audit(org.id, 'organization_approved', metadata={'reg_id': reg.id, 'admin_notes': data.get('admin_notes', '')})

    activate_link = url_for('org.activate_org_page', token=invite_token, _external=True)
    html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<tr><td style="padding:32px 32px 24px;text-align:center">
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a2744">Your Organization is Approved!</h1>
<p style="margin:16px 0;font-size:14px;color:#5a6a7a;line-height:1.5">
Hi {reg.applicant_name},<br><br>
Your registration for <strong>{reg.org_name}</strong> has been approved by our team.<br><br>
Click the button below to set up your account and activate your organization dashboard.
</p>
<a href="{activate_link}" style="display:inline-block;padding:14px 32px;border-radius:8px;background:#6C3BF5;color:#fff;font-size:15px;font-weight:600;text-decoration:none;margin:16px 0">Activate Your Account</a>
<p style="font-size:12px;color:#9aa6b5;margin-top:8px">This link expires in 48 hours.</p>
</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#9aa6b5;border-top:1px solid #eef0f4">ScholrNet — Academic Trust Network</td></tr>
</table></td></tr></table></body></html>'''
    send_email(reg.applicant_email, f'{reg.org_name} is approved — Activate your ScholrNet account', html)

    return jsonify({'success': True, 'message': 'Organization approved. Invite email sent.'})

@org_bp.route('/api/admin/organization/<int:reg_id>/reject', methods=['POST'])
@login_required
def api_admin_org_reject(reg_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json or {}
    reason = data.get('reason', '').strip()
    escaped_reason = html.escape(reason) if reason else ''
    reg = OrganizationRegistration.query.get_or_404(reg_id)
    if reg.status not in ('pending_approval',):
        return jsonify({'error': 'Invalid state'}), 400

    org = Organization.query.get(reg.org_id) if reg.org_id else None
    if not org:
        org = Organization.query.filter_by(name=reg.org_name, type=reg.org_type, status='pending_approval').first()
    if org:
        org.status = 'rejected'
        org.rejection_reason = reason
    reg.status = 'rejected'
    reg.reviewed_by = current_user.id
    reg.reviewed_at = datetime.now(timezone.utc)
    reg.admin_notes = reason
    db.session.commit()
    _org_audit(org.id if org else None, 'organization_rejected', metadata={'reg_id': reg.id, 'reason': reason})

    html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<tr><td style="padding:32px 32px 24px;text-align:center">
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#dc2626">Registration Update</h1>
<p style="margin:16px 0;font-size:14px;color:#5a6a7a;line-height:1.5">
Hi {reg.applicant_name},<br><br>
Your registration for <strong>{reg.org_name}</strong> was not approved at this time.
</p>
{f'<p style="margin:16px 0;font-size:14px;color:#5a6a7a;padding:16px;background:#fef2f2;border-radius:8px"><strong>Reason:</strong> {escaped_reason}</p>' if reason else ''}
<p style="font-size:13px;color:#5a6a7a">You may re-apply with updated information.</p>
</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#9aa6b5;border-top:1px solid #eef0f4">ScholrNet — Academic Trust Network</td></tr>
</table></td></tr></table></body></html>'''
    send_email(reg.applicant_email, f'Update on your {reg.org_type} registration', html)

    return jsonify({'success': True, 'message': 'Registration rejected.'})

@org_bp.route('/api/admin/organization/<int:reg_id>/suspend', methods=['POST'])
@login_required
def api_admin_org_suspend(reg_id):
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    reg = OrganizationRegistration.query.get_or_404(reg_id)
    org = Organization.query.get(reg.org_id) if reg.org_id else None
    if not org:
        org = Organization.query.filter_by(name=reg.org_name, type=reg.org_type).first()
    if org:
        org.status = 'suspended'
    db.session.commit()
    _org_audit(org.id if org else None, 'organization_suspended', metadata={'reg_id': reg.id})
    return jsonify({'success': True, 'message': 'Organization suspended.'})

# ─── Activation ─────────────────────────────────────────────────

@org_bp.route('/verify-org-otp')
def verify_org_otp_page():
    reg_id = request.args.get('reg_id', type=int)
    if not reg_id:
        return render_template('error.html', code=400, title='Missing Parameter', message='No registration ID provided.', emoji='❓'), 400
    reg = OrganizationRegistration.query.get(reg_id)
    if not reg or reg.status not in ('pending_email',):
        return render_template('error.html', code=400, title='Invalid Request', message='This registration is not pending email verification.', emoji='❌'), 400
    return render_template('organizations/verify_otp.html', reg_id=reg_id)

@org_bp.route('/registration-pending')
def registration_pending_page():
    return render_template('organizations/pending.html')

@org_bp.route('/activate-organization')
def activate_org_page():
    token = request.args.get('token', '')
    reg = OrganizationRegistration.query.filter_by(invite_token=token).first()
    if not reg or reg.invite_expires_at and datetime.now(timezone.utc) > reg.invite_expires_at:
        return render_template('organizations/activate.html', error='This link has expired. Please contact support.')
    if reg.invite_used_at:
        return render_template('organizations/activate.html', error='This link has already been used.')
    return render_template('organizations/activate.html', reg_id=reg.id, token=token, org_name=reg.org_name)

@org_bp.route('/api/organization/activate', methods=['POST'])
@limiter.limit("5 per 15 minutes", methods=['POST'])
def api_org_activate():
    try:
        data = request.json or {}
        token = data.get('token', '').strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()

        if len(password) < 8 or len(password) > 128:
            return jsonify({'error': 'Password must be 8-128 characters'}), 400
        if not name:
            return jsonify({'error': 'Name is required'}), 400

        reg = OrganizationRegistration.query.filter_by(invite_token=token).first()
        if not reg:
            return jsonify({'error': 'Invalid token'}), 404
        if reg.invite_used_at:
            return jsonify({'error': 'Token already used'}), 400
        if reg.invite_expires_at and datetime.now(timezone.utc) > reg.invite_expires_at:
            return jsonify({'error': 'Token expired'}), 400

        org = Organization.query.get(reg.org_id) if reg.org_id else None
        if not org:
            org = Organization.query.filter_by(name=reg.org_name, type=reg.org_type, status='approved').first()
        if not org:
            return jsonify({'error': 'Organization not found'}), 404

        existing = User.query.filter_by(email=reg.applicant_email).first()
        if existing:
            user = existing
            user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        else:
            user = User(
                name=name, email=reg.applicant_email,
                password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
                role='admin' if reg.org_type in ('school', 'institution') else 'recruiter',
                email_verified=True
            )
            db.session.add(user)
        db.session.flush()

        # Set verified_school_id for school activations (bridges old system)
        if reg.org_type == 'school':
            user.verified_school_id = org.id

        member = OrganizationMember(
            organization_id=org.id, user_id=user.id,
            role='principal' if reg.org_type == 'school' else 'director' if reg.org_type == 'institution' else 'hr_admin',
            invited_at=datetime.now(timezone.utc), joined_at=datetime.now(timezone.utc),
            status='active'
        )
        db.session.add(member)

        reg.invite_used_at = datetime.now(timezone.utc)
        reg.invite_token = ''
        org.status = 'active'
        db.session.commit()
        _org_audit(org.id, 'organization_activated', metadata={'user_id': user.id})

        return jsonify({'success': True, 'message': 'Account activated! You can now log in.'})
    except Exception as e:
        current_app.logger.exception('org activate error')
        return jsonify({'error': 'Activation failed'}), 500

# ─── Organization Dashboard ──────────────────────────────────────

@org_bp.route('/organization/dashboard')
@login_required
def org_dashboard():
    member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
    if not member:
        return render_template('error.html', code=403, title='No Organization', message='You are not a member of any organization.', emoji='🏢'), 403
    org = Organization.query.get(member.organization_id)
    if org.status == 'suspended':
        return render_template('error.html', code=403, title='Suspended', message='Your organization has been suspended.', emoji='🚫'), 403
    return render_template(
        'organizations/dashboard.html',
        org=org, member=member,
        role_display=member.role.replace('_', ' ').title()
    )

@org_bp.route('/api/organization/profile')
@login_required
def api_org_profile():
    member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    org = Organization.query.get(member.organization_id)
    members = OrganizationMember.query.filter_by(organization_id=org.id).all()
    user_ids = [m.user_id for m in members if m.user_id]
    users = {u.id: {'name': u.name, 'email': u.email, 'avatar_url': u.avatar_url} for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return jsonify({
        'org': org.to_dict(),
        'members': [{'id': m.id, 'user_id': m.user_id, 'role': m.role, 'status': m.status,
                      'user': users.get(m.user_id, {'name': 'Unknown', 'email': ''}),
                      'joined_at': m.joined_at.isoformat() if m.joined_at else ''} for m in members],
        'role': member.role
    })

# ─── Invite Members ──────────────────────────────────────────────

@org_bp.route('/api/organization/invite', methods=['POST'])
@login_required
def api_org_invite():
    try:
        member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
        if not member:
            return jsonify({'error': 'Not a member'}), 403
        org = Organization.query.get(member.organization_id)

        admin_roles = {'principal', 'director', 'hr_admin'}
        if member.role not in admin_roles:
            return jsonify({'error': 'You do not have permission to invite members'}), 403

        data = request.json or {}
        email = data.get('email', '').strip().lower()
        role = data.get('role', 'staff').strip()
        invite_name = data.get('name', '').strip()
        if not email or not invite_name:
            return jsonify({'error': 'Email and name required'}), 400

        allowed_roles = _allowed_roles_for_org(org.type)
        if role not in allowed_roles:
            return jsonify({'error': f'Invalid role for this organization. Allowed: {", ".join(allowed_roles)}'}), 400

        existing_user = User.query.filter_by(email=email).first()
        existing_member = None
        if existing_user:
            existing_member = OrganizationMember.query.filter_by(organization_id=org.id, user_id=existing_user.id).first()
            if existing_member:
                return jsonify({'error': 'User is already a member'}), 409

        invite_token = secrets.token_urlsafe(48)
        invite = OrganizationMember(
            organization_id=org.id,
            user_id=existing_user.id if existing_user else None,
            role=role,
            invited_by=current_user.id,
            status='pending',
            invite_token=invite_token
        )
        db.session.add(invite)
        db.session.flush()
        _org_audit(org.id, 'invite_sent', metadata={'email': email, 'role': role, 'invited_by': current_user.id})

        accept_link = url_for('org.accept_invite_page', token=invite_token, org_id=org.id, _external=True)
        if not existing_user:
            accept_link += f"&email={email}&name={invite_name}"

        html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<tr><td style="padding:32px 32px 24px;text-align:center">
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a2744">You're Invited!</h1>
<p style="margin:16px 0;font-size:14px;color:#5a6a7a;line-height:1.5">
<strong>{current_user.name}</strong> has invited you to join <strong>{org.name}</strong> as <strong>{role.replace('_', ' ').title()}</strong>.
</p>
<a href="{accept_link}" style="display:inline-block;padding:14px 32px;border-radius:8px;background:#6C3BF5;color:#fff;font-size:15px;font-weight:600;text-decoration:none;margin:16px 0">Accept Invitation</a>
</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#9aa6b5;border-top:1px solid #eef0f4">ScholrNet — Academic Trust Network</td></tr>
</table></td></tr></table></body></html>'''
        send_email(email, f'Join {org.name} on ScholrNet', html)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Invitation sent'})
    except Exception as e:
        current_app.logger.exception('org invite error')
        return jsonify({'error': 'Failed to send invitation'}), 500

def _allowed_roles_for_org(org_type):
    if org_type == 'school':
        return ['principal', 'vice_principal', 'coordinator', 'teacher', 'counselor', 'office_staff']
    elif org_type == 'institution':
        return ['director', 'coordinator', 'instructor', 'staff']
    elif org_type == 'company':
        return ['hr_admin', 'recruiter', 'hiring_manager', 'staff']
    return ['staff']

# ─── Accept Invite ───────────────────────────────────────────────

@org_bp.route('/accept-invite')
def accept_invite_page():
    token = request.args.get('token', '')
    org_id = request.args.get('org_id', type=int)
    email = request.args.get('email', '')
    invite_name = request.args.get('name', '')
    return render_template('organizations/accept_invite.html', token=token, org_id=org_id, email=email, invite_name=invite_name)

@org_bp.route('/api/organization/accept-invite', methods=['POST'])
@limiter.limit("10 per 15 minutes", methods=['POST'])
def api_accept_invite():
    try:
        data = request.json or {}
        token = data.get('token', '').strip()
        org_id_str = data.get('org_id')
        if not token or not org_id_str:
            return jsonify({'error': 'Token and organization ID are required'}), 400
        try:
            org_id = int(org_id_str)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid organization ID'}), 400

        password = data.get('password', '')
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()

        if current_user.is_authenticated:
            user = current_user
        else:
            if not email or not name:
                return jsonify({'error': 'Name and email required'}), 400
            if len(password) < 8:
                return jsonify({'error': 'Password must be at least 8 characters'}), 400
            existing = User.query.filter_by(email=email).first()
            if existing:
                user = existing
            else:
                user = User(name=name, email=email, password_hash=bcrypt.generate_password_hash(password).decode('utf-8'), email_verified=True)
                db.session.add(user)
            db.session.flush()

        member = OrganizationMember.query.filter_by(
            organization_id=org_id,
            invite_token=token,
            status='pending'
        ).first()
        if not member:
            return jsonify({'error': 'Invitation not found or invalid token'}), 404

        member.user_id = user.id
        member.status = 'active'
        member.joined_at = datetime.now(timezone.utc)
        member.invite_token = ''
        org = Organization.query.get(org_id)
        _org_audit(org_id, 'invite_accepted', metadata={'user_id': user.id, 'role': member.role})
        db.session.commit()

        return jsonify({'success': True, 'message': f'You are now a member of {org.name}!'})
    except Exception as e:
        current_app.logger.exception('accept invite error')
        return jsonify({'error': 'Failed to accept invitation'}), 500

# ─── Organization Public Profile ─────────────────────────────────

@org_bp.route('/org/<int:org_id>/<slug>')
def org_public_profile(org_id, slug):
    org = Organization.query.get_or_404(org_id)
    members = OrganizationMember.query.filter_by(organization_id=org_id, status='active').all()
    user_ids = [m.user_id for m in members if m.user_id]
    users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return render_template('organizations/profile.html', org=org, members=members, users=users)

# ─── Organization Settings ───────────────────────────────────────

@org_bp.route('/api/organization/settings', methods=['POST'])
@login_required
def api_org_settings():
    member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    admin_roles = {'principal', 'director', 'hr_admin'}
    if member.role not in admin_roles:
        return jsonify({'error': 'Permission denied'}), 403

    org = Organization.query.get(member.organization_id)
    data = request.json or {}
    if 'description' in data:
        org.description = data['description']
    if 'address' in data:
        org.address = data['address']
    if 'phone' in data:
        org.phone = data['phone']
    if 'logo' in data:
        org.logo = data['logo']
    db.session.commit()
    _org_audit(org.id, 'settings_updated', metadata={'by': current_user.id})
    return jsonify({'success': True, 'message': 'Settings updated'})

# ─── Manage Members ──────────────────────────────────────────────

@org_bp.route('/api/organization/member/<int:member_id>/role', methods=['POST'])
@login_required
def api_org_member_role(member_id):
    member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    admin_roles = {'principal', 'director', 'hr_admin'}
    if member.role not in admin_roles:
        return jsonify({'error': 'Permission denied'}), 403

    target = OrganizationMember.query.get_or_404(member_id)
    if target.organization_id != member.organization_id:
        return jsonify({'error': 'Not in your organization'}), 403

    data = request.json or {}
    new_role = data.get('role', '')
    allowed = _allowed_roles_for_org(target.organization.type)
    if new_role not in allowed:
        return jsonify({'error': f'Invalid role. Allowed: {", ".join(allowed)}'}), 400

    old_role = target.role
    target.role = new_role
    db.session.commit()
    _org_audit(member.organization_id, 'role_changed', metadata={'user_id': target.user_id, 'from': old_role, 'to': new_role, 'by': current_user.id})
    return jsonify({'success': True, 'message': 'Role updated'})

@org_bp.route('/api/organization/member/<int:member_id>/remove', methods=['POST'])
@login_required
def api_org_member_remove(member_id):
    member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    admin_roles = {'principal', 'director', 'hr_admin'}
    if member.role not in admin_roles:
        return jsonify({'error': 'Permission denied'}), 403

    target = OrganizationMember.query.get_or_404(member_id)
    if target.organization_id != member.organization_id:
        return jsonify({'error': 'Not in your organization'}), 403
    if target.id == member.id:
        return jsonify({'error': 'Cannot remove yourself'}), 400

    target.status = 'removed'
    db.session.commit()
    _org_audit(member.organization_id, 'member_removed', metadata={'user_id': target.user_id, 'by': current_user.id})
    return jsonify({'success': True, 'message': 'Member removed'})

# ─── Audit Logs ──────────────────────────────────────────────────

@org_bp.route('/api/organization/audit-logs')
@login_required
def api_org_audit_logs():
    member = OrganizationMember.query.filter_by(user_id=current_user.id, status='active').first()
    if not member:
        return jsonify({'error': 'Not a member'}), 403
    logs = OrgAuditLog.query.filter_by(organization_id=member.organization_id).order_by(OrgAuditLog.id.desc()).limit(50).all()
    return jsonify({'logs': [{
        'id': l.id, 'action': l.action, 'performed_by': l.performed_by,
        'metadata': l.metadata_json, 'created_at': l.created_at.isoformat() if l.created_at else ''
    } for l in logs]})
