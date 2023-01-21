from flask import Flask, request, url_for,redirect, render_template
app = Flask(__name__)


@app.route('/')  # decorator drfines the
def home():
    return render_template('index.html')


@app.route('/success/<name>')
def success(name):
   return 'welcome  New User:%s' % name


@app.route('/login', methods=['POST'])
def login():
    uname = request.form['uname']
    passwrd = request.form['pass']
    if uname == "abhimanyus1997" and passwrd == "123":
        return render_template('admin.html')
    elif uname == "abhimanyus1997" and passwrd != "123":
        return "<script> alert('Wrong Password for Admin')</script>"
    else:
        return redirect(url_for('success', name=uname))

if __name__ == '__main__':
   app.run(host="0.0.0.0",debug=True)
