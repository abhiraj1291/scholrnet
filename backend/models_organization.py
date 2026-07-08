import enum
from datetime import datetime, timezone, timedelta
from extensions import db

class OrgStatus(enum.Enum):
    pending_email = 'pending_email_verification'
    pending_approval = 'pending_approval'
    approved = 'approved'
    rejected = 'rejected'
    suspended = 'suspended'
    archived = 'archived'

class OrgType(enum.Enum):
    school = 'school'
    institution = 'institution'
    company = 'company'

class OrgMemberStatus(enum.Enum):
    pending = 'pending'
    active = 'active'
    removed = 'removed'

class Organization(db.Model):
    __tablename__ = 'organizations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False, index=True)
    slug = db.Column(db.String(300), unique=True, nullable=False, index=True)
    type = db.Column(db.String(20), nullable=False, index=True)
    website = db.Column(db.String(300), default='')
    domain = db.Column(db.String(100), default='')
    status = db.Column(db.String(30), default=OrgStatus.pending_email.value, index=True)
    verification_level = db.Column(db.String(20), default='unverified')
    logo = db.Column(db.String(500), default='')
    description = db.Column(db.Text, default='')
    address = db.Column(db.String(500), default='')
    phone = db.Column(db.String(30), default='')
    business_registration = db.Column(db.String(100), default='')
    verification_code = db.Column(db.String(20), default='')
    is_verified = db.Column(db.Boolean, default=False)
    risk_level = db.Column(db.String(20), default='low')
    duplicate_of = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    rejection_reason = db.Column(db.Text, default='')

    members = db.relationship('OrganizationMember', backref='organization', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'slug': self.slug,
            'type': self.type, 'website': self.website, 'domain': self.domain,
            'status': self.status, 'verification_level': self.verification_level,
            'logo': self.logo, 'description': self.description,
            'address': self.address, 'phone': self.phone,
            'verification_code': self.verification_code,
            'is_verified': self.is_verified, 'risk_level': self.risk_level,
            'duplicate_of': self.duplicate_of,
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'approved_at': self.approved_at.isoformat() if self.approved_at else '',
        }


class OrganizationRegistration(db.Model):
    __tablename__ = 'organization_registrations'
    id = db.Column(db.Integer, primary_key=True)
    org_name = db.Column(db.String(300), nullable=False)
    org_type = db.Column(db.String(20), nullable=False)
    website = db.Column(db.String(300), default='')
    applicant_name = db.Column(db.String(100), nullable=False)
    applicant_role = db.Column(db.String(100), default='')
    applicant_email = db.Column(db.String(200), nullable=False, index=True)
    applicant_phone = db.Column(db.String(30), default='')
    notes = db.Column(db.Text, default='')
    email_domain = db.Column(db.String(100), default='')
    risk_level = db.Column(db.String(20), default='low')
    duplicate_flag = db.Column(db.Boolean, default=False)
    duplicate_org_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    otp = db.Column(db.String(6), default='')
    otp_expires_at = db.Column(db.DateTime, nullable=True)
    otp_verified_at = db.Column(db.DateTime, nullable=True)
    invite_token = db.Column(db.String(64), default='')
    invite_expires_at = db.Column(db.DateTime, nullable=True)
    invite_used_at = db.Column(db.DateTime, nullable=True)
    admin_notes = db.Column(db.Text, default='')
    status = db.Column(db.String(30), default='pending_email', index=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class OrganizationMember(db.Model):
    __tablename__ = 'organization_members'
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    role = db.Column(db.String(50), nullable=False, default='staff')
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    invited_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    joined_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='pending', index=True)

    user = db.relationship('User', foreign_keys=[user_id])
    inviter = db.relationship('User', foreign_keys=[invited_by])


class OrgAuditLog(db.Model):
    __tablename__ = 'org_audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    metadata_json = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
