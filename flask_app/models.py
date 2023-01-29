from . import db
from flask_login import UserMixin
from sqlalchemy.sql import func

#ERC Address Data
class ERCaddress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Size of ERC20 address is 40
    data = db.Column(db.String(40), nullable=False)
    date_update = db.Column(db.DateTime(timezone=True), default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

# User Data
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key = True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    first_name = db.Column(db.String(150))
    last_name = db.Column(db.String(150))
    erc_addresses = db.relationship('ERCaddress')
