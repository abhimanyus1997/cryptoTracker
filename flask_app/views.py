from flask import Blueprint, render_template, request, flash, redirect
from flask_app import cryptotracker_scrapping as ct

views = Blueprint('views', __name__)

# @views.route('/')
# def home():
#     return "<h1>Test</h1>"


@views.route('/')  # decorator drfines the
def index():
    # name = "Vitalik B"
    wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # vitalik's address
    # getting balance
    bal, ens = ct.getEther()
    eth, usd = bal[0], bal[1]
    return render_template('index.html', title='Welcome',
                           username=ens.text,
                           erc20=wallet,
                           eth=eth.text,
                           usd=usd.text)


@views.route('/home')
def home():
    return redirect('/')


@views.route('/<erc20>')  # decorator drfines the
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

@views.route('/profile/')
def profile():
    return render_template('profile.html')


@views.route('/table/')
def table():
    return render_template('table.html')
