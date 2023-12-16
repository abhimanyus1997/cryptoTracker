let bitcoinValue = null;
let ethereumValue = null;
let bnbValue = null;
let solValue = null;

const bitcoinDisplay = document.getElementById('valuesBitcoin');
const ethereumDisplay = document.getElementById('valuesEthereum');
const bnbDisplay = document.getElementById('valuesBNB');
const solDisplay = document.getElementById('valuesSOL');

const socket = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum,binance-coin,solana');

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    const newBitcoinValue = data.bitcoin;
    const newEthereumValue = data.ethereum;
    const newBNBValue = data['binance-coin'];
    const newSOLValue = data.solana;

    // Check if new data is available and update values accordingly
    if (newBitcoinValue !== undefined) {
        bitcoinValue = newBitcoinValue;
    }

    if (newEthereumValue !== undefined) {
        ethereumValue = newEthereumValue;
    }

    if (newBNBValue !== undefined) {
        bnbValue = newBNBValue;
    }

    if (newSOLValue !== undefined) {
        solValue = newSOLValue;
    }

    // Update display only if new data is available
    if (newBitcoinValue !== undefined || bitcoinValue === null) {
        bitcoinDisplay.innerText = `$${bitcoinValue !== null ? bitcoinValue : 'N/A'}`;
    }

    if (newEthereumValue !== undefined || ethereumValue === null) {
        ethereumDisplay.innerText = `$${ethereumValue !== null ? ethereumValue : 'N/A'}`;
    }

    if (newBNBValue !== undefined || bnbValue === null) {
        bnbDisplay.innerText = `$${bnbValue !== null ? bnbValue : 'N/A'}`;
    }

    if (newSOLValue !== undefined || solValue === null) {
        solDisplay.innerText = `$${solValue !== null ? solValue : 'N/A'}`;
    }
};
