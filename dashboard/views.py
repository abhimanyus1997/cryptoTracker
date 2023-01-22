from django.http import HttpResponse
from django.template import loader

from django.shortcuts import render


def index(request):
    username = "Vitalik"
    wallet = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
   return render(request, "dashboard/template/index.html", {'username' : username, 'erc20':wallet})

# def index(request):
#   template = loader.get_template('index.html')
#   return HttpResponse(template.render())


def test(request):
    return HttpResponse("Hello, world. You're at the polls index.")
