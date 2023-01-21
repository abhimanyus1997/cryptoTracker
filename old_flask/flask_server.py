from flask import Flask
from markupsafe import escape

app = Flask(__name__) #creating the Flask class object

@app.route('/') #decorator drfines the
def home():
    return "hello, this is our first flask website";


@app.route('/hi')
def hello_world():
   return 'hello world'


@app.route('/hello/<name>')
def hello_name(name):
    x = "Hello "+str(name)
    return x

if __name__ =='__main__':
    app.run(host='0.0.0.0', port=80,debug = True)