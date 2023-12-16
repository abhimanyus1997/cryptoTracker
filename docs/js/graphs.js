let bitcoinValue = null;
let ethereumValue = null;

const bitcoinDisplay = document.getElementById('valuesBitcoin');
const ethereumDisplay = document.getElementById('valuesEthereum');

const socket = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum');

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    const newBitcoinValue = data.bitcoin;
    const newEthereumValue = data.ethereum;

    if (newBitcoinValue !== undefined) {
        bitcoinValue = newBitcoinValue;
    }

    if (newEthereumValue !== undefined) {
        ethereumValue = newEthereumValue;
    }

    bitcoinDisplay.innerText = `Bitcoin: $${bitcoinValue !== null ? bitcoinValue : 'N/A'}`;
    ethereumDisplay.innerText = `Ethereum: $${ethereumValue !== null ? ethereumValue : 'N/A'}`;
};
