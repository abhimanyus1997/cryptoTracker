from flask import Flask, redirect, url_for, request
app = Flask(__name__)


@app.route('/')  # decorator drfines the
def home():
    return "Welcome to Server."


@app.route('/success/<name>')
def success(name):
   return 'welcome  New User:%s' % name


@app.route('/login', methods=['POST'])
def login():
    uname = request.form['uname']
    passwrd = request.form['pass']
    if uname == "abhimanyus1997" and passwrd == "123":
        return "Welcome Admin:  %s" % uname
    elif uname == "abhimanyus1997" and passwrd != "123":
        return "<script> alert('Wrong Password for Admin')</script>"
    else:
        return redirect(url_for('success', name=uname))

if __name__ == '__main__':
   app.run(debug=True)
