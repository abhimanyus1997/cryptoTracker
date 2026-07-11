(() => {
  const button = document.getElementById('connect-wallet');
  const output = document.getElementById('bot-output');
  const preview = document.getElementById('bot-preview');

  const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
  async function connectWallet() {
    if (!window.ethereum) {
      button.querySelector('span').textContent = 'Install MetaMask';
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      return;
    }
    button.disabled = true;
    button.querySelector('span').textContent = 'Connecting…';
    try {
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      button.querySelector('span').textContent = shortAddress(account);
      button.classList.add('is-connected');
      window.ethereum.on?.('accountsChanged', ([next]) => {
        button.querySelector('span').textContent = next ? shortAddress(next) : 'Connect wallet';
        button.classList.toggle('is-connected', Boolean(next));
      });
    } catch (error) {
      button.querySelector('span').textContent = error.code === 4001 ? 'Connection declined' : 'Connect wallet';
    } finally { button.disabled = false; }
  }
  button?.addEventListener('click', connectWallet);
  window.addEventListener('load', () => {
    if (!sessionStorage.getItem('ct_web3_checked')) {
      sessionStorage.setItem('ct_web3_checked', '1');
      if (window.ethereum && window.confirm('Web3 wallet detected. Would you like to connect it to CryptoTracker?')) connectWallet();
      if (!window.ethereum && button?.querySelector('span')) button.querySelector('span').textContent = 'Check Web3 wallet';
    }
  });
  preview?.addEventListener('click', () => {
    const eth = window.currentPrices?.ETHUSDT;
    output.textContent = eth ? `Paper signal: monitor ETH near $${eth.toLocaleString('en-US', { maximumFractionDigits: 2 })}; no order was placed.` : 'Waiting for a market price before creating a paper signal.';
  });
})();
