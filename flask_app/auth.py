from flask import Blueprint, render_template, request

auth = Blueprint('auth', __name__)


@auth.route('/login/', methods=['GET','POST'])
def login():
    data = request.form
    print(data)
    return render_template('login.html')


@auth.route('/register/',methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
    #    Geting Form Data
       first_name = request.form.get('first_name')
       last_name = request.form.get('last_name')
       email = request.form.get('email')
       password = request.form.get('password')
       password_repeat = request.form.get('password_repeat')

    return render_template('register.html')
