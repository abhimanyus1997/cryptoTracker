from flask import Flask, render_template, redirect
from markupsafe import escape
from flask_sqlalchemy import SQLAlchemy
from os import path

# create the extension
db = SQLAlchemy()
DB_NAME = "database.db"

def create_app():
    # create the app
    app = Flask(__name__)
    app.config['SECRET_KEY'] = "VWHSBJJBHWJBJSBjbjhdbhjbdhvbh"
    # configure the SQLite database, relative to the app instance folder
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{DB_NAME}"
    # initializing DB
    db.init_app(app)

    from .views import views
    from .auth import auth

    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/')
    # Check database
    from .models import User, ERCaddress
    create_database(app)

    return app

# To create database if doesn't exist
def create_database(app):
    if not path.exists("flask_app"+DB_NAME):
        # requires an application context
        with app.app_context():
            # to create the table schema
            db.create_all()
        print("Created Database!")