@app.errorhandler(404)
def invalid_route(e):
    return render_template('404.html')