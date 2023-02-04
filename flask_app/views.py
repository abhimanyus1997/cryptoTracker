from flask import Blueprint, render_template, request, flash, redirect, url_for
from flask_app import cryptotracker_scrapping as ct
from flask_app import cryptotracker_api as cta
import pandas as pd

views = Blueprint('views', __name__)


@views.route('/')
def home():
    return redirect(url_for('auth.login'))


@views.route('/dashboard')  # decorator drfines the
def dashboard(wallet=None):
    if wallet == None:
        wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # vitalik's address
    else:
        wallet = wallet
    # generating csv
    nTokens = cta.getTokensCSV(address=wallet, filename=f"{wallet}-export-csv")
    # getting balance
    bal, ens = ct.getEther()
    eth, usd = bal[0], bal[1]
    return render_template('index.html',
                           nTokens=nTokens,
                           username=ens.text,
                           erc20=wallet,
                           eth=eth.text,
                           usd=usd.text)


# @views.route('/home')
# def home():
#     return redirect('/')


@views.route('/<erc20>')  # decorator drfines the
def user(erc20):
    name = "User"
    # getting balance
    bal, ens = ct.getEther(erc20)
    eth_, usd_ = bal[0], bal[1]
    # generating csv
    nTokens = cta.getTokensCSV(address=erc20, filename=f"{erc20}-export-csv")
    # If No ENS
    if ens == None:
        ens = "User"
    else:
        ens = ens.text
    # Reading data from CSV
    #df = pd.read_csv("token_generated.csv")

    # CSV reader
    symbols, pricelist, holding, value = cta.readCSV("export_csv.csv")
    data = list(zip(symbols, pricelist, holding, value))
    return render_template('index.html',
                           username=ens,
                           erc20=erc20,
                           eth=eth_.text,
                           usd=usd_.text,
                           nTokens=nTokens,
                           data=data
                           )


@views.route('/profile')
def profile():
    return render_template('profile.html')


@views.route('/table/')
def table():
    return render_template('table.html')
