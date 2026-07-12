(() => {
  const button = document.getElementById('connect-wallet');
  const output = document.getElementById('bot-output');
  const preview = document.getElementById('bot-preview');
  const tokenInput = document.getElementById('wallet-token-address');
  const addToken = document.getElementById('add-wallet-token');
  const scanTokens = document.getElementById('scan-top-tokens');
  const tokenList = document.getElementById('wallet-token-list');
  const profile = {
    state: document.getElementById('wallet-state'), address: document.getElementById('wallet-address'),
    network: document.getElementById('wallet-network'), balance: document.getElementById('wallet-balance'),
    permissions: document.getElementById('wallet-permissions')
  };
  const networks = {
    '0x1': ['Ethereum', 'ETH'], '0x89': ['Polygon', 'POL'], '0xa': ['Optimism', 'ETH'],
    '0xa4b1': ['Arbitrum One', 'ETH'], '0x2105': ['Base', 'ETH'], '0x38': ['BNB Smart Chain', 'BNB'],
    '0xa86a': ['Avalanche', 'AVAX'], '0xfa': ['Fantom', 'FTM'], '0x64': ['Gnosis', 'xDAI'],
    '0xa4ec': ['Celo', 'CELO'], '0x44d': ['Polygon zkEVM', 'ETH'], '0xe708': ['Linea', 'ETH'],
    '0x8274f': ['Scroll', 'ETH'], '0x144': ['zkSync Era', 'ETH'], '0x1388': ['Mantle', 'MNT'],
    '0x82750': ['Blast', 'ETH'], '0xa': ['Optimism', 'ETH'], '0x2329': ['Moonbeam', 'GLMR'],
    '0x504': ['Moonriver', 'MOVR'], '0x19': ['Cronos', 'CRO'], '0x171': ['Pulse', 'PLS'],
    '0x28c58': ['Taiko', 'ETH'], '0x76adf1': ['ZKsync', 'ETH'], '0x46f': ['Telos', 'TLOS'],
    '0x1e': ['RSK', 'RBTC'], '0x6a': ['Kaia', 'KLAY'], '0x63564c40': ['Harmony', 'ONE'],
    '0x128': ['HECO', 'HT'], '0x505': ['Astar', 'ASTR'], '0x2019': ['Metis', 'METIS'],
    '0x440': ['Fuse', 'FUSE'], '0x1a4': ['Oasis Emerald', 'ROSE']
  };
  const platforms = {
    '0x1': 'ethereum', '0x89': 'polygon-pos', '0xa': 'optimistic-ethereum',
    '0xa4b1': 'arbitrum-one', '0x2105': 'base', '0x38': 'binance-smart-chain',
    '0xa86a': 'avalanche', '0xfa': 'fantom', '0x64': 'xdai', '0xa4ec': 'celo',
    '0x44d': 'polygon-zkevm', '0xe708': 'linea', '0x144': 'zksync',
    '0x1388': 'mantle', '0x19': 'cronos', '0x2329': 'moonbeam',
    '0x504': 'moonriver', '0x505': 'astar', '0x2019': 'metis-andromeda'
  };
  const scanChains = [
    ['Ethereum', 'ethereum', 'https://ethereum-rpc.publicnode.com'],
    ['Polygon', 'polygon-pos', 'https://polygon-bor-rpc.publicnode.com'],
    ['BNB Chain', 'binance-smart-chain', 'https://bsc-rpc.publicnode.com'],
    ['Arbitrum', 'arbitrum-one', 'https://arbitrum-one-rpc.publicnode.com'],
    ['Optimism', 'optimistic-ethereum', 'https://optimism-rpc.publicnode.com'],
    ['Base', 'base', 'https://base-rpc.publicnode.com'],
    ['Avalanche', 'avalanche', 'https://avalanche-c-chain-rpc.publicnode.com'],
    ['Fantom', 'fantom', 'https://fantom-rpc.publicnode.com'],
    ['Gnosis', 'xdai', 'https://gnosis-rpc.publicnode.com'],
    ['Celo', 'celo', 'https://celo-rpc.publicnode.com'],
    ['Linea', 'linea', 'https://linea-rpc.publicnode.com'],
    ['Scroll', 'scroll', 'https://scroll-rpc.publicnode.com'],
    ['zkSync Era', 'zksync', 'https://zksync-rpc.publicnode.com'],
    ['Mantle', 'mantle', 'https://mantle-rpc.publicnode.com'],
    ['Blast', 'blast', 'https://blast-rpc.publicnode.com'],
    ['Polygon zkEVM', 'polygon-zkevm', 'https://polygon-zkevm-rpc.publicnode.com'],
    ['Moonbeam', 'moonbeam', 'https://moonbeam-rpc.publicnode.com'],
    ['Moonriver', 'moonriver', 'https://moonriver-rpc.publicnode.com'],
    ['Cronos', 'cronos', 'https://cronos-evm-rpc.publicnode.com'],
    ['Metis', 'metis-andromeda', 'https://metis-pokt.nodies.app'],
    ['Kaia', 'klay-token', 'https://klaytn-rpc.publicnode.com'],
    ['Harmony', 'harmony-shard-0', 'https://harmony-0-rpc.publicnode.com'],
    ['Astar', 'astar', 'https://astar-rpc.publicnode.com'],
    ['Taiko', 'taiko', 'https://taiko-rpc.publicnode.com'],
    ['Telos', 'telos', 'https://telos-rpc.publicnode.com'],
    ['Fuse', 'fuse', 'https://fuse-rpc.publicnode.com'],
    ['Mode', 'mode', 'https://mode-rpc.publicnode.com'],
    ['Manta Pacific', 'manta-pacific', 'https://manta-pacific-rpc.publicnode.com'],
    ['opBNB', 'opbnb', 'https://opbnb-rpc.publicnode.com'],
    ['Aurora', 'aurora', 'https://aurora-rpc.publicnode.com'],
    ['Canto', 'canto', 'https://canto-rpc.publicnode.com'],
    ['Boba', 'boba', 'https://boba-ethereum-rpc.publicnode.com'],
    ['Kava', 'kava', 'https://kava-evm-rpc.publicnode.com'],
    ['Sei', 'sei-network', 'https://sei-rpc.publicnode.com'],
    ['Merlin', 'merlin-chain', 'https://merlin-rpc.publicnode.com'],
    ['Core DAO', 'core', 'https://core-rpc.publicnode.com'],
    ['Flare', 'flare-network', 'https://flare-rpc.publicnode.com'],
    ['Fraxtal', 'fraxtal', 'https://fraxtal-rpc.publicnode.com'],
    ['Zora', 'zora', 'https://zora-rpc.publicnode.com'],
    ['World Chain', 'world-chain', 'https://worldchain-mainnet.g.alchemy.com/public']
  ];
  let activeAccount = null;

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
    activeAccount = account;

    const detailsPanel = document.getElementById('wallet-details-panel');
    if (detailsPanel) {
      document.getElementById('detail-full-address').textContent = account;
      document.getElementById('detail-chain-id').textContent = `${chainId} (${parseInt(chainId, 16)})`;
      document.getElementById('detail-network-name').textContent = network;
      document.getElementById('detail-native-symbol').textContent = symbol;
      document.getElementById('detail-balance-full').textContent = `${(Number(BigInt(hexBalance)) / 1e18).toFixed(18)} ${symbol}`;
      document.getElementById('detail-permissions').textContent = permissions.length ? permissions.map(p => p.parentCapability || 'account').join(', ') : 'Read-only (no write access)';
    }
  }

  function resetProfile() {
    profile.state.textContent = 'Not connected';
    profile.address.textContent = profile.network.textContent = profile.balance.textContent = '—';
    profile.permissions.textContent = 'Read-only';
    activeAccount = null;
  }

  // Account Details toggle
  const accountDetailsBtn = document.getElementById('account-details-btn');
  const detailsPanel = document.getElementById('wallet-details-panel');
  accountDetailsBtn?.addEventListener('click', () => {
    if (!activeAccount) {
      detailsPanel.innerHTML = '<p class="bot-output">Connect a wallet first to view account details.</p>';
    }
    detailsPanel.classList.toggle('hidden');
    accountDetailsBtn.querySelector('i').classList.toggle('fa-chevron-down');
    accountDetailsBtn.querySelector('i').classList.toggle('fa-chevron-up');
  });

  const decodeUint = (hex) => Number(BigInt(hex));
  const decodeSymbol = (hex) => {
    try { const offset = Number(BigInt(`0x${hex.slice(2, 66)}`)) * 2 + 2; const size = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`)); return new TextDecoder().decode(Uint8Array.from(hex.slice(offset + 64, offset + 64 + size * 2).match(/.{1,2}/g).map(byte => parseInt(byte, 16)))); } catch { return 'TOKEN'; }
  };

  async function addTokenBalance() {
    const address = tokenInput?.value.trim();
    if (!activeAccount) { tokenList.textContent = 'Connect a wallet first.'; return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) { tokenList.textContent = 'Enter a valid ERC-20 contract address.'; return; }
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const accountArg = activeAccount.slice(2).padStart(64, '0');
    try {
      const [balanceHex, decimalsHex, symbolHex] = await Promise.all([
        window.ethereum.request({ method: 'eth_call', params: [{ to: address, data: `0x70a08231${accountArg}` }, 'latest'] }),
        window.ethereum.request({ method: 'eth_call', params: [{ to: address, data: '0x313ce567' }, 'latest'] }),
        window.ethereum.request({ method: 'eth_call', params: [{ to: address, data: '0x95d89b41' }, 'latest'] })
      ]);
      const decimals = decodeUint(decimalsHex); const amount = decodeUint(balanceHex) / 10 ** decimals; const symbol = decodeSymbol(symbolHex);
      const platform = platforms[chainId]; let usd = null;
      if (platform) { const price = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${address}&vs_currencies=usd`).then(r => r.ok ? r.json() : {}); usd = price[address.toLowerCase()]?.usd; }
      const row = document.createElement('div'); row.className = 'wallet-token-row'; row.innerHTML = `<strong>${symbol}</strong><span>${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span><span>${usd ? `$${(amount * usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'Price unavailable'}</span>`;
      tokenList.prepend(row); tokenInput.value = '';

      if (amount > 0 && usd) {
        addToHoldings(symbol + 'USDT', symbol, symbol, amount, usd);
      }
    } catch { tokenList.textContent = 'Could not read this token on the active network.'; }
  }

  function addToHoldings(pairSymbol, name, ticker, amount, price) {
    if (!window.portfolio) return;
    const existing = window.portfolio.find(h => h.ticker === ticker);
    if (existing) {
      const totalAmount = existing.amount + amount;
      const avgPrice = ((existing.amount * existing.purchasePrice) + (amount * price)) / totalAmount;
      existing.amount = totalAmount;
      existing.purchasePrice = avgPrice;
    } else {
      window.portfolio.push({ symbol: pairSymbol, name, ticker, amount, purchasePrice: price });
    }
  }

  addToken?.addEventListener('click', addTokenBalance);

  async function scanTopTokens() {
    if (!activeAccount) { tokenList.textContent = 'Connect a wallet first.'; return; }
    scanTokens.disabled = true; scanTokens.textContent = `Scanning top 1000 tokens across ${scanChains.length} chains…`; tokenList.textContent = 'Loading public market and contract metadata…';
    try {
      const pages = [1, 2, 3, 4];
      const marketPages = await Promise.all(pages.map(page =>
        fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`).then(r => r.json()).catch(() => [])
      ));
      const markets = marketPages.flat();
      const coinList = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true').then(r => r.json());
      const byId = new Map(coinList.map(coin => [coin.id, coin]));
      const accountArg = activeAccount.slice(2).padStart(64, '0');
      const found = [];
      let checked = 0;
      const totalChains = scanChains.length;

      for (const [chainName, platform, rpc] of scanChains) {
        const candidates = markets.map(market => ({ market, address: byId.get(market.id)?.platforms?.[platform] })).filter(item => /^0x[a-fA-F0-9]{40}$/.test(item.address));
        for (let index = 0; index < candidates.length; index += 20) {
          const batch = candidates.slice(index, index + 20);
          const payload = batch.map((item, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_call', params: [{ to: item.address, data: `0x70a08231${accountArg}` }, 'latest'] }));
          const rawResults = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.ok ? r.json() : []).catch(() => []);
          const results = Array.isArray(rawResults) ? rawResults : [];
          for (let i = 0; i < batch.length; i++) { const value = results.find(result => result.id === i)?.result || '0x0'; if (BigInt(value) > 0n) found.push({ ...batch[i], chainName }); }
          checked += batch.length;
          tokenList.textContent = `Scanning ${chainName} · ${checked} contracts checked across ${totalChains} chains…`;
        }
      }
      tokenList.innerHTML = '';
      if (!found.length) tokenList.textContent = `No balances found among top-1000 token contracts across ${totalChains} supported chains.`;
      for (const item of found) {
        const row = document.createElement('div'); row.className = 'wallet-token-row';
        row.innerHTML = `<strong>${item.market.symbol.toUpperCase()}</strong><span>${item.chainName}</span><span>$${item.market.current_price?.toLocaleString('en-US') || '—'}</span>`;
        tokenList.appendChild(row);

        if (item.market.current_price) {
          addToHoldings(
            item.market.symbol.toUpperCase() + 'USDT',
            item.market.name,
            item.market.symbol.toUpperCase(),
            0,
            item.market.current_price
          );
        }
      }
      if (found.length && typeof window.fetchPrices === 'function') {
        window.fetchPrices();
      }
    } catch { tokenList.textContent = 'Public token data is temporarily rate-limited. Try again shortly.'; }
    finally { scanTokens.disabled = false; scanTokens.innerHTML = `<i class="fas fa-radar"></i> Scan top 1000 tokens across ${scanChains.length} chains`; }
  }

  scanTokens?.addEventListener('click', scanTopTokens);
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
