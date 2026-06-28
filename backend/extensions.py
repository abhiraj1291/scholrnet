from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress

db = SQLAlchemy()
bcrypt = Bcrypt()
login_manager = LoginManager()
compress = Compress()

login_manager.login_view = 'auth.login'

limiter = Limiter(
    get_remote_address,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri="memory://",
)
