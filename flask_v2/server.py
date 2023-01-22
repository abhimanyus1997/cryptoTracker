import os

from flask import Flask, render_template
from markupsafe import escape

app = Flask(__name__) #creating the Flask class object

@app.route('/') #decorator drfines the
def index():
    name = "Vitalik B"
    wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" #vitalik's address
    return render_template('index.html', title='Welcome', username=name, erc20=wallet)

@app.route('/hi')
def hello_world():
   return 'hello world'


@app.route('/hello/<name>')
def hello_name(name):
    x = "Hello "+str(name)
    return x

if __name__ =='__main__':
    app.run(host='0.0.0.0', port=80,debug = True)