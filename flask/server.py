import os

from flask import Flask, render_template
from markupsafe import escape

app = Flask(__name__) #creating the Flask class object

@app.route('/') #decorator drfines the
def index():
    name = "Vitalik B"
    wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" #vitalik's address
    return render_template('index.html', title='Welcome', username=name, erc20=wallet)


@app.route('/login/')
def login():
    return render_template('login.html')


@app.route('/profile/')
def profile():
    return render_template('profile.html')


@app.route('/register/')
def register():
    return render_template('register.html')


@app.route('/table/')
def table():
    return render_template('table.html')

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html')

if __name__ =='__main__':
    app.run(host='0.0.0.0', port=80,debug = True)