import os

from flask import Flask, render_template, redirect
from markupsafe import escape

# Custom Made Modules for tracking balance
import cryptotracker_scrapping as ct


app = Flask(__name__) #creating the Flask class object


@app.route('/') #decorator drfines the
def index():
    #name = "Vitalik B"
    wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" #vitalik's address
    # getting balance
    bal,ens = ct.getEther()
    eth,usd = bal[0],bal[1]
    return render_template('index.html', title='Welcome',
        username=ens.text,
        erc20=wallet,
        eth=eth.text,
        usd=usd.text)


@app.route('/home')
def home():
    return redirect('/')

@app.route('/<erc20>')  # decorator drfines the
def user(erc20):
    name = "User"
    # getting balance
    bal, ens = ct.getEther(erc20)
    eth_, usd_ = bal[0], bal[1]

    # If No ENS
    if ens == None:
        ens = "User"
    else:
        ens = ens.text

    return render_template('index.html',
                           username=ens,
                           erc20=erc20,
                           eth=eth_.text,
                           usd=usd_.text)

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