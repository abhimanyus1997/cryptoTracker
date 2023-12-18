from pyscript import window, document


my_element = document.querySelector("#myip")
my_element.innerText = "Your IP: "+window.location.hostname


