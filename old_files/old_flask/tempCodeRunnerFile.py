@app.route("/<name>")
def hello(name):
    return f"Hello, {escape(name)}!"