from flask import Blueprint, render_template, request, flash

auth = Blueprint('auth', __name__)


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
            flash("Registration Sucessful", category='success')
    return render_template('register.html')
