import os

from flask import Flask, render_template
from markupsafe import escape

app = Flask(__name__) #creating the Flask class object

@app.route('/') #decorator drfines the
def index():
    name = "Abhimanyu"
    return render_template('dashboard.html', title='Welcome', username=name)

@app.route('/hi')
def hello_world():
   return 'hello world'


@app.route('/hello/<name>')
def hello_name(name):
    x = "Hello "+str(name)
    return x

if __name__ =='__main__':
    app.run(host='0.0.0.0', port=80,debug = True)