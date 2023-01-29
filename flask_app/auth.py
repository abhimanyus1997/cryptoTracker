from flask import Blueprint, render_template, request, flash, redirect, url_for
from .models import User
from . import db

import logging
logging.basicConfig(filename='security.log', filemode='w',
            format='%(name)s - %(levelname)s - %(message)s',
            level=logging.DEBUG)

# To store password & Hash a password with the given method and salt with a string of the given length.
from werkzeug.security import generate_password_hash, check_password_hash

auth = Blueprint('auth', __name__)

#### LOGIN FORM ######
@auth.route('/login/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email').lower()
        password = request.form.get('password')
        # Search for first USeer
        user = User.query.filter_by(email=email).first()
        logging.critical("user searched in query")
        if user:
            # Check password with hashed password
            if check_password_hash(user.password, password):
                logging.critical("Hash Matched Successfully")
                flash("Logged in Successfully", category="success")
                # Return to homepage if password is correct
                return redirect(url_for('views.user', erc20=user.erc20))
            else:
                logging.error("Incorrect Password")
                flash("Incorrect Password ", category="error")
        else:
            flash("Email Doesn't Exist", category="error")
    return render_template('login.html')


#### REGISTRATION FORM ######
@auth.route('/register/', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        #    Geting Form Data
        first_name = request.form.get('first_name').lower()
        last_name = request.form.get('last_name').lower()
        email = request.form.get('email').lower()
        password = request.form.get('password')
        password_repeat = request.form.get('password_repeat')
        erc20 = request.form.get('erc20').lower()
        # Avoid Adding Duplicate USer
        user = User.query.filter_by(email=email).first()
        if user:
            flash("User Already Exist", category='error')
        # Form Validation With Flask
        elif len(first_name) < 2 or len(last_name) < 2:
            flash("Short Name", category='error')
        elif len(password) < 8:
            flash("Short Password. Use 8 or more digit", category='error')
        elif password != password_repeat:
            flash("Password Missmatch", category='error')
        elif len(erc20) != 42:
            flash("Wallet Address Must be 42 digit including 0x", category='error')
        elif erc20[:2] != "0x":
            flash("Wallet Address Must start with 0x", category='error')
        else:
            # Add user to Database
            new_user = User(email=email,
                            first_name=first_name,
                            last_name=last_name,
                            password=generate_password_hash(password, method='sha256'),
                            erc20 = erc20
                            )
            db.session.add(new_user)
            db.session.commit()

            # Return to homepage if password is correct
            return redirect(url_for('auth.login'))
            flash("Registration Sucessful", category='success')
    return render_template('register.html')
