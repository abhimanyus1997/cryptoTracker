import numpy as np
import requests
import json
import pandas as pd

base_url = "https://api.ethplorer.io"


def getTokensCSV(address, export_csv=False, filename="export_csv"):
    """
    Returns no of tokens for an address and saves a CSV
    """
    endpoint = f"/getAddressInfo/{address}?apiKey=freekey"
    url = base_url + endpoint
    response = requests.get(url)
    if response.status_code == 200:
        # If successful save response
        token_info_response = json.loads(response.text)
        token_list = token_info_response['tokens']
    else:
        # Returns zero if no token found or api error
        token_list = []
        return 0

    #returns no of tokens
    no_of_tokens = len(token_list)

    #code to generate CSV
    if export_csv:
        flag = True
        for token in token_list:
            token_info = pd.DataFrame([token["tokenInfo"]])
            token_ = token.copy()
            token_.pop("tokenInfo")
            balance_info = pd.DataFrame([token_])
            info = pd.concat([token_info, balance_info], axis=1)
            # Run once
            if flag:
                columns = list(info.columns)
                df = pd.DataFrame(columns=columns)
                flag = False
            df = pd.concat([df, info], axis=0)
            df.to_csv(f"{filename}.csv")
    return no_of_tokens


def readCSV(filename="export_csv"):
    """
    Reads CSV and returns tuple of
    return -> (symbols, price, holding, worth in USD)
    """
    df = pd.read_csv(f"{filename}.csv")
    symbols = list(df.symbol)
    prices = list(df.price)
    # Convert holdings from wei
    holding = [bal_wei*1E-18 for bal_wei in list(df.balance)]
    pricelist = []
    for nth_price in prices:
        if nth_price:
            pricelist.append(nth_price["rate"])
        else:
            pricelist.append(0)
    a = np.multiply(np.array(holding), np.array(pricelist))
    value = ["{:0.2f}".format(x) for x in a]
    return symbols, pricelist, holding, value
