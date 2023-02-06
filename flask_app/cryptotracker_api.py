import numpy as np
import requests
import json
import pandas as pd
import logging

FILE_NAME = "export_csv.csv"
base_url = "https://api.ethplorer.io"


def getTokensCSV(address: str, export_csv: bool = True, filename : str = FILE_NAME):
    """
    Returns no of tokens for an address and saves a CSV
    """
    address = address.lower()
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
            df.to_csv(filename)
    return no_of_tokens


def readCSV(filename : str=FILE_NAME):
    """
    Reads CSV and returns tuple of
    return -> (symbols, price, holding, worth in USD)
    """
    df = pd.read_csv(filename, index_col=False)
    symbol_list = list(df.symbol)
    price_list_uncleaned = list(df.price)
    # Convert holdings from wei
    holding_list = [bal_wei*1E-18 for bal_wei in list(df.balance)]
    price_list = []
    value_list =[]
    # print(type(price_list_uncleaned))
    for nth_price in price_list_uncleaned:
        if nth_price == 'False' or nth_price == False:
            price_list.append(0)
        else:
            # convert raw string to dict
            logging.debug(f"nth_price: {nth_price}\nType of nth_price: {nth_price}")
            nth_price_dic = eval(nth_price)
            price_list.append(nth_price_dic["rate"])
    value_float = np.multiply(np.array(holding_list), np.array(price_list))
    value_list = ["{:0.2f}".format(x) for x in value_float]

    return symbol_list, price_list, holding_list, value_list
