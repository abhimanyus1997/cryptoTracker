# Importing Modules
import requests
from bs4 import BeautifulSoup

default_address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

# URLS
homepage_url = "https://etherscan.io/address/"
tokenpage_url = "https://etherscan.io/tokenholdings?a="


def getEther(account=default_address):
    """Returns
    1: no of Ether tokens & USD Value
    2: ENS name
    """
    homepage = "https://etherscan.io/address/"+str(account).lower()
    try:
        # Request to Homepage with Custom UA to avoid identifying as a bot
        r = requests.get(homepage,
                 headers={
                     'User-Agent': "Mozilla/5.0 (Windows NT 10.0 ; Win64 ;x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"}
                 )

        try:
            # BeautifulSoup Object
            soup = BeautifulSoup(r.content, 'html.parser')

            try:
                # Finding Ether Balance & usd bal
                balance = soup.find_all('div', class_='col-md-8')
                try:
                    ens = soup.find('a', id="ensName")
                except Exception as e:
                    print("Error @ ensname:", e)
            except Exception as e:
                print("Error @ balance:", e)
        except Exception as e:
            print("Error @ BeautifulSoup:", e)
    except Exception as e:
        print("Error @ Request:", e)

    return balance,ens



