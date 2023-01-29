from flask import Blueprint, render_template, request, flash, redirect, url_for
from .models import User
from . import db

# To store password & Hash a password with the given method and salt with a string of the given length.
from werkzeug.security import generate_password_hash, check_password_hash

auth = Blueprint('auth', __name__)

#### LOGIN FORM ######
@auth.route('/login/', methods=['GET', 'POST'])
def login():
    data = request.form
    print(data)
    return render_template('login.html')

#### REGISTRATION FORM ######
@auth.route('/register/', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        #    Geting Form Data
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        email = request.form.get('email')
        password = request.form.get('password')
        password_repeat = request.form.get('password_repeat')
        # Form Validation With Flask
        if len(first_name) < 2 or len(last_name) < 2:
            flash("Short Name", category='error')
        elif len(password) < 8:
            flash("Short Password. Use 8 or more digit", category='error')
        elif password != password_repeat:
            flash("Password Missmatch", category='error')
        else:
            # Add user to Database
            new_user = User(email=email,
                            first_name=first_name,
                            last_name=last_name,
                            password=generate_password_hash(password, method='sha256'))
            db.session.add(new_user)
            db.session.commit()

            # Return to homepage if password is correct
            return redirect(url_for('views.dashboard'))
            flash("Registration Sucessful", category='success')
    return render_template('register.html')
