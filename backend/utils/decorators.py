import functools
from flask import jsonify
from flask_login import current_user


def admin_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated_function


def super_admin_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated_function


def verified_school_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.role not in ('admin', 'super_admin') or not current_user.verified_school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated_function
