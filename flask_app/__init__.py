from flask import Flask, render_template, redirect
from markupsafe import escape


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = "VWHSBJJBHWJBJSBjbjhdbhjbdhvbh"

    from .views import views
    from .auth import auth

    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/')

    return app
