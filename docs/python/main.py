import pandas as pd
from pyweb import pydom
from pyodide.http import open_url
from pyscript import display, when, document, window
from js import console
import matplotlib.pyplot as plt


def log(message):
    # log to pandas dev console
    print(message)
    # log to JS console
    console.log(message)


@when("click", "#csvBtn")
def click_handler(event):
    """
    Event handlers get an event object representing the activity that raised
    them.
    """
    # pydom["div#pandas-output-inner"].html = ""
    url = document.querySelector("#csvFile").value

    # log(f"Trying to fetch CSV from {url}")
    df = pd.read_csv(open_url(url))
    df.plot()
    # plt.gcf().canvas.set_window_title('Pandas Plot')
    # pydom["div#pandas-output"].style["display"] = "block"
    # pydom["div#pandas-dev-console"].style["display"] = "block"
    # document.querySelector("#test").innerText = url
    # pydom["div#test"].style["display"] = "block"

    # Create a string representation of the describe() output
    description = df.describe().to_html()
    document.querySelector("#test").style.display = "block"
    # document.querySelector("#test").innerText = description
    # display(description, target="test", append="True")
    display(df.describe(), target="test", append="True")
    df.plot()
    plt.show()








