(() => {
  const button = document.getElementById('connect-wallet');
  const output = document.getElementById('bot-output');
  const preview = document.getElementById('bot-preview');
  const profile = {
    state: document.getElementById('wallet-state'), address: document.getElementById('wallet-address'),
    network: document.getElementById('wallet-network'), balance: document.getElementById('wallet-balance'),
    permissions: document.getElementById('wallet-permissions')
  };
  const networks = { '0x1': ['Ethereum', 'ETH'], '0x89': ['Polygon', 'POL'], '0xa': ['Optimism', 'ETH'], '0xa4b1': ['Arbitrum One', 'ETH'], '0x2105': ['Base', 'ETH'], '0x38': ['BNB Smart Chain', 'BNB'] };

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
      await refreshProfile(account);
      button.querySelector('span').textContent = shortAddress(account);
      button.classList.add('is-connected');
      window.ethereum.on?.('accountsChanged', async ([next]) => {
        button.querySelector('span').textContent = next ? shortAddress(next) : 'Connect wallet';
        button.classList.toggle('is-connected', Boolean(next));
        if (next) await refreshProfile(next); else resetProfile();
      });
      window.ethereum.on?.('chainChanged', () => window.ethereum.request({ method: 'eth_accounts' }).then(([account]) => account && refreshProfile(account)));
    } catch (error) {
      button.querySelector('span').textContent = error.code === 4001 ? 'Connection declined' : 'Connect wallet';
    } finally { button.disabled = false; }
  }
  async function refreshProfile(account) {
    const [chainId, hexBalance, permissions] = await Promise.all([
      window.ethereum.request({ method: 'eth_chainId' }),
      window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] }),
      window.ethereum.request({ method: 'wallet_getPermissions' }).catch(() => [])
    ]);
    const [network, symbol] = networks[chainId] || [`Chain ${parseInt(chainId, 16)}`, 'native'];
    const balance = Number(BigInt(hexBalance)) / 1e18;
    profile.state.textContent = 'Connected'; profile.address.textContent = shortAddress(account);
    profile.address.title = account; profile.network.textContent = network;
    profile.balance.textContent = `${balance.toLocaleString('en-US', { maximumFractionDigits: 5 })} ${symbol}`;
    profile.permissions.textContent = permissions.length ? 'Account access' : 'Read-only';
  }
  function resetProfile() { profile.state.textContent = 'Not connected'; profile.address.textContent = profile.network.textContent = profile.balance.textContent = '—'; profile.permissions.textContent = 'Read-only'; }
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
