(() => {
  const DEFAULT_WALLET = '0xd7e9d18153de624713C18b1cA18A238C42033EA5';
  const CACHE_TTL = 5 * 60 * 1000;

  let activeAccount = null;

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(`ct_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);

      const isConnected = activeAccount || (window.ethereum && window.ethereum.selectedAddress);
      if (!isConnected) {
        const portfolioEl = document.getElementById('zerion-portfolio-summary');
        if (portfolioEl && !document.getElementById('demo-data-badge')) {
          const badge = document.createElement('div');
          badge.id = 'demo-data-badge';
          badge.style.cssText = 'grid-column: span 2; font-size: 0.65rem; color: var(--accent); opacity: 0.8; margin-bottom: 0.25rem;';
          badge.innerHTML = `<i class="fas fa-database mr-1"></i> Demo Mode: Displaying cached data from ${new Date(ts).toLocaleString()}`;
          portfolioEl.prepend(badge);
        }
        return data;
      }

      if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`ct_cache_${key}`); return null; }
      return data;
    } catch { return null; }
  }
  function cacheSet(key, data) {
    try { localStorage.setItem(`ct_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
  }

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
    '0x82750': ['Blast', 'ETH'], '0x2329': ['Moonbeam', 'GLMR'], '0x504': ['Moonriver', 'MOVR'],
    '0x19': ['Cronos', 'CRO'], '0x171': ['Pulse', 'PLS'], '0x6a': ['Kaia', 'KLAY'],
    '0x63564c40': ['Harmony', 'ONE'], '0x505': ['Astar', 'ASTR'], '0x2019': ['Metis', 'METIS']
  };

  // ──────────────────────────────────────────────────
  // API helpers
  // ──────────────────────────────────────────────────

  function getApiHost() {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'https://cryptotracker.abhimanyu.fyi'
      : '';
  }

  function getZerionKey() {
    return localStorage.getItem('ct_zerion_key') || '';
  }

  function hasZerionKey() {
    return getZerionKey().length > 10;
  }

  async function coinstatsFetch(walletPath) {
    const cacheKey = ('cs_' + walletPath).replace(/[^a-z0-9]/gi, '_').slice(0, 80);
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${getApiHost()}/api/zerion?coinstats=true&path=${encodeURIComponent(walletPath)}`);
    if (!res.ok) throw new Error(`CoinStats ${res.status}`);
    const data = await res.json();
    cacheSet(cacheKey, data);
    return data;
  }

  async function zerionFetch(path, retries = 2) {
    const cacheKey = path.replace(/[^a-z0-9]/gi, '_').slice(0, 80);
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${getApiHost()}/api/zerion?path=${encodeURIComponent(path)}`);
    if (res.status === 429) {
      throw new Error('Rate limited');
    }
    if (res.status === 503 && retries > 0) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '3', 10);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return zerionFetch(path, retries - 1);
    }
    if (!res.ok) throw new Error(`Zerion API error: ${res.status}`);
    const data = await res.json();
    cacheSet(cacheKey, data);
    return data;
  }

  const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;

  // ──────────────────────────────────────────────────
  // Wallet Connection
  // ──────────────────────────────────────────────────

  async function connectWallet() {
    if (!window.ethereum) {
      if (button?.querySelector('span')) {
        button.querySelector('span').textContent = 'Install MetaMask';
      }
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      return;
    }

    if (button) {
      button.disabled = true;
      button.querySelector('span').textContent = 'Connecting…';
    }

    try {
      const accounts = await Promise.race([
        window.ethereum.request({ method: 'eth_requestAccounts' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000))
      ]);

      const account = accounts?.[0];
      if (!account) throw new Error('No account returned');

      await refreshProfile(account);

      if (button) {
        button.querySelector('span').textContent = shortAddress(account);
        button.classList.add('is-connected');
      }

      if (window._ctWalletListeners) {
        window._ctWalletListeners.accountsChanged?.forEach(handler => {
          window.ethereum.removeListener?.('accountsChanged', handler);
        });
        window._ctWalletListeners.chainChanged?.forEach(handler => {
          window.ethereum.removeListener?.('chainChanged', handler);
        });
      }
      window._ctWalletListeners = { accountsChanged: [], chainChanged: [] };

      const accountsChangedHandler = async ([next]) => {
        if (button) {
          button.querySelector('span').textContent = next ? shortAddress(next) : 'Connect wallet';
          button.classList.toggle('is-connected', Boolean(next));
        }
        if (next) await refreshProfile(next); else resetProfile();
      };

      const chainChangedHandler = () => {
        window.ethereum.request({ method: 'eth_accounts' }).then(([a]) => a && refreshProfile(a));
      };

      window.ethereum.on?.('accountsChanged', accountsChangedHandler);
      window.ethereum.on?.('chainChanged', chainChangedHandler);

      window._ctWalletListeners.accountsChanged.push(accountsChangedHandler);
      window._ctWalletListeners.chainChanged.push(chainChangedHandler);
    } catch (error) {
      if (button?.querySelector('span')) {
        button.querySelector('span').textContent =
          error.code === 4001 ? 'Connection declined' :
          error.message === 'timeout' ? 'Timed out — retry' :
          'Connect wallet';
      }
      console.warn('connectWallet error:', error);
    } finally {
      if (button) button.disabled = false;
    }
  }
  window.connectWallet = connectWallet;

  // ──────────────────────────────────────────────────
  // Profile refresh (minimal RPC + CoinStats portfolio)
  // ──────────────────────────────────────────────────

  async function refreshProfile(account) {
    const [chainId, hexBalance, permissions] = await Promise.all([
      window.ethereum.request({ method: 'eth_chainId' }),
      window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] }),
      window.ethereum.request({ method: 'wallet_getPermissions' }).catch(() => [])
    ]);
    const [network, symbol] = networks[chainId] || [`Chain ${parseInt(chainId, 16)}`, 'native'];
    const balance = Number(BigInt(hexBalance)) / 1e18;
    profile.state.textContent = 'Connected';
    profile.address.textContent = shortAddress(account);
    profile.address.title = account;
    profile.network.textContent = network;
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

    loadPortfolio(account);
  }

  function resetProfile() {
    profile.state.textContent = 'Not connected';
    profile.address.textContent = profile.network.textContent = profile.balance.textContent = '—';
    profile.permissions.textContent = 'Read-only';
    activeAccount = null;
  }

  // ──────────────────────────────────────────────────
  // Portfolio loading — single call via CoinStats
  // Tier order: CoinStats API > x402 > Zerion > skip
  // ──────────────────────────────────────────────────

  let portfolioCache = null;
  let portfolioCacheTime = 0;
  let transactionsCache = null;
  let transactionsCacheTime = 0;
  let nftCache = null;
  let nftCacheTime = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async function loadPortfolio(address, forceRefresh = false) {
    const now = Date.now();
    
    // Check cache first
    if (!forceRefresh && portfolioCache && (now - portfolioCacheTime < CACHE_DURATION)) {
      console.log('📦 Using cached portfolio data');
      const portfolioEl = document.getElementById('zerion-portfolio-summary');
      if (portfolioEl && portfolioCache) {
        portfolioEl.innerHTML = portfolioCache;
      }
      return;
    }
    const portfolioEl = document.getElementById('zerion-portfolio-summary');
    if (portfolioEl) portfolioEl.textContent = 'Loading portfolio…';

    // Tier 1: CoinStats multi-chain balance (one call, all chains)
    try {
      const data = await coinstatsFetch(`/wallet/balances?address=${address}&blockchain=all`);
      const balances = Array.isArray(data) ? data : (data.balances || []);
      let totalValue = 0;

      for (const chainItem of balances) {
        const tokens = chainItem.balances || [];
        for (const token of tokens) {
          const qty = token.amount || 0;
          const price = token.price || 0;
          if (qty > 0 && price > 0) totalValue += qty * price;
        }
      }

      if (portfolioEl) {
        portfolioEl.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <div><span>Total Value</span><strong>$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
            <div><span>Source</span><strong style="font-size:.65rem; color:#6f786d;">CoinStats (all chains)</strong></div>
          </div>
        `;
      }
      return;
    } catch (e) {
      console.warn('Portfolio Tier 1 (CoinStats) failed:', e.message);
    }

    // Tier 2: x402 pay-per-request (no API key needed, USDC micropayment)
    try {
      const cacheKey = ('x402_balance_' + address).replace(/[^a-z0-9]/gi, '_').slice(0, 80);
      const cached = cacheGet(cacheKey);
      if (cached) {
        renderX402Portfolio(cached, portfolioEl);
        return;
      }
      const res = await fetch(`https://x402.coinstats.app/wallet/balances?address=${address}&blockchain=all`);
      if (res.status === 402) {
        console.warn('Portfolio Tier 2 (x402): payment required — skipping (no client wallet configured)');
      } else if (res.ok) {
        const data = await res.json();
        cacheSet(cacheKey, data);
        renderX402Portfolio(data, portfolioEl);
        return;
      }
    } catch (e) {
      console.warn('Portfolio Tier 2 (x402) failed:', e.message);
    }

    // Tier 3: Zerion portfolio summary
    try {
      const data = await zerionFetch(`/wallets/${address}/portfolio?currency=usd`);
      const attrs = data.data.attributes;
      const totalValue = attrs.total.positions;
      const change24h = attrs.changes?.absolute_1d ?? 0;
      const changePct = attrs.changes?.percent_1d ?? 0;
      
      const portfolioHtml = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
          <div><span>Total Value</span><strong>$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
          <div><span>24h Change</span><strong class="${change24h >= 0 ? 'text-accent' : ''}" style="${change24h < 0 ? 'color:#ef4444' : ''}">${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toLocaleString('en-US', { maximumFractionDigits: 2 })} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)</strong></div>
        </div>
      `;
      
      if (portfolioEl) {
        portfolioEl.innerHTML = portfolioHtml;
      }
      
      // Cache the result
      portfolioCache = portfolioHtml;
      portfolioCacheTime = now;
      console.log('💾 Portfolio data cached for', address);
      return;
    } catch (e) {
      console.warn('Portfolio Tier 3 (Zerion) failed:', e.message);
    }

    if (portfolioEl) portfolioEl.textContent = 'Could not load portfolio data.';
  }

  function renderX402Portfolio(data, el) {
    if (!el) return;
    const balances = Array.isArray(data) ? data : (data.balances || []);
    let totalValue = 0;
    for (const chainItem of balances) {
      const tokens = chainItem.balances || [];
      for (const token of tokens) {
        const qty = token.amount || 0;
        const price = token.price || 0;
        if (qty > 0 && price > 0) totalValue += qty * price;
      }
    }
    el.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
        <div><span>Total Value</span><strong>$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
        <div><span>Source</span><strong style="font-size:.65rem; color:#6f786d;">x402 (all chains)</strong></div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────────
  // Token Scanning — Tier order: CoinStats > x402 > Zerion > RPC
  // ──────────────────────────────────────────────────

  async function scanTopTokens() {
    const address = getActiveAddress();
    if (!address) { tokenList.textContent = 'Connect a wallet first.'; return; }
    scanTokens.disabled = true;
    tokenList.innerHTML = '';
    showScanProgress('indeterminate');

    // Tier 1: CoinStats Multi-Chain Balance
    try {
      scanTokens.textContent = 'Scanning via CoinStats (Tier 1)…';
      const data = await coinstatsFetch(`/wallet/balances?address=${address}&blockchain=all`);
      const balances = Array.isArray(data) ? data : (data.balances || []);
      let foundAny = false;

      tokenList.innerHTML = '';
      for (const chainItem of balances) {
        const chain = chainItem.blockchain || 'unknown';
        const tokens = chainItem.balances || [];
        for (const token of tokens) {
          const quantity = token.amount || 0;
          const price = token.price || 0;
          const value = quantity * price;
          const icon = token.icon || token.image || '';
          const name = token.name || token.symbol || 'Unknown';
          if (quantity <= 0) continue;
          foundAny = true;

          const row = document.createElement('div');
          row.className = 'wallet-token-row';
          row.style.gridTemplateColumns = 'minmax(60px,1.2fr) .6fr .8fr .8fr .6fr';
          
          // Get icon from multiple sources: CoinStats icon, Binance, or CoinGecko
          let iconUrl = token.icon || token.image || '';
          const symbolLower = (token.symbol || 'btc').toLowerCase();
          const nameLower = (token.name || 'bitcoin').toLowerCase().replace(/\s+/g, '-');
          
          if (!iconUrl) {
            // Try Binance icon URL pattern
            iconUrl = `https://raw.githubusercontent.com/TrustWallet/wallet-core/master/assets/icons/coins/${symbolLower}.png`;
          }
          
          row.innerHTML = `
            <div style="display:flex; align-items:center; gap:.4rem; overflow:hidden;">
              ${iconUrl ? `<img src="${iconUrl}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" onerror="this.onerror=null;this.src='https://assets.coingecko.com/coins/images/1/small/bitcoin.png';">` : ''}
              <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${token.symbol || '???'}</strong>
            </div>
            <span style="font-size:.65rem; color:#6f786d;">${chain}</span>
            <span>${quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
            <span>$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <span style="font-size:.65rem; color:var(--accent); font-weight:700;">$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          `;
          tokenList.appendChild(row);

          if (price > 0) {
            addToHoldings((token.symbol || '').toUpperCase() + 'USDT', token.name || token.symbol, (token.symbol || '').toUpperCase(), quantity, price);
          }
        }
      }
      if (foundAny) {
        hideScanProgress();
        scanTokens.innerHTML = `<i class="fas fa-check"></i> Found positions via CoinStats`;
        if (typeof window.fetchPrices === 'function') window.fetchPrices();
        scanTokens.disabled = false;
        return;
      }
    } catch (e) {
      console.warn('Tier 1 CoinStats scan failed:', e.message);
    }

    // Tier 2: x402 pay-per-request
    try {
      scanTokens.textContent = 'Trying x402 (Tier 2)…';
      const res = await fetch(`https://x402.coinstats.app/wallet/balances?address=${address}&blockchain=all`);
      if (res.ok) {
        const data = await res.json();
        const balances = Array.isArray(data) ? data : (data.balances || []);
        let foundAny = false;

        tokenList.innerHTML = '';
        for (const chainItem of balances) {
          const chain = chainItem.blockchain || 'unknown';
          const tokens = chainItem.balances || [];
          for (const token of tokens) {
            const quantity = token.amount || 0;
            const price = token.price || 0;
            const value = quantity * price;
            const icon = token.icon || token.image || '';
            if (quantity <= 0) continue;
            foundAny = true;

            const row = document.createElement('div');
            row.className = 'wallet-token-row';
            row.style.gridTemplateColumns = 'minmax(60px,1.2fr) .6fr .8fr .8fr .6fr';
            row.innerHTML = `
              <div style="display:flex; align-items:center; gap:.4rem; overflow:hidden;">
                ${icon ? `<img src="${icon}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${token.symbol || '???'}</strong>
              </div>
              <span style="font-size:.65rem; color:#6f786d;">${chain}</span>
              <span>${quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
              <span>$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              <span style="font-size:.65rem; color:var(--accent); font-weight:700;">$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            `;
            tokenList.appendChild(row);

            if (price > 0) {
              addToHoldings((token.symbol || '').toUpperCase() + 'USDT', token.name || token.symbol, (token.symbol || '').toUpperCase(), quantity, price);
            }
          }
        }
        if (foundAny) {
          hideScanProgress();
          scanTokens.innerHTML = `<i class="fas fa-check"></i> Found positions via x402`;
          if (typeof window.fetchPrices === 'function') window.fetchPrices();
          scanTokens.disabled = false;
          return;
        }
      }
    } catch (e) {
      console.warn('Tier 2 x402 scan failed:', e.message);
    }

    // Tier 3: Zerion positions
    try {
      scanTokens.textContent = 'Scanning via Zerion (Tier 3)…';
      const positions = await scanWithZerion(address);
      if (positions && positions.length) {
        hideScanProgress();
        tokenList.innerHTML = '';
        let addedCount = 0;
        for (const pos of positions) {
          const attrs = pos.attributes;
          const fungible = attrs.fungible_info;
          const chain = pos.relationships?.chain?.data?.id || 'unknown';
          const quantity = attrs.quantity?.float ?? 0;
          const price = attrs.price ?? 0;
          const symbol = fungible?.symbol || '???';
          const name = fungible?.name || symbol;
          const icon = fungible?.icon?.url || '';
          const change24h = attrs.changes?.absolute_1d;

          const row = document.createElement('div');
          row.className = 'wallet-token-row';
          row.style.gridTemplateColumns = 'minmax(60px,1.2fr) .6fr .8fr .8fr .6fr';
          row.innerHTML = `
            <div style="display:flex; align-items:center; gap:.4rem; overflow:hidden;">
              ${icon ? `<img src="${icon}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : ''}
              <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${symbol}</strong>
            </div>
            <span style="font-size:.65rem; color:#6f786d;">${chain}</span>
            <span>${quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
            <span>$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            ${change24h != null ? `<span style="color:${change24h >= 0 ? 'var(--accent)' : '#ef4444'}; font-size:.65rem;">${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toFixed(2)}</span>` : '<span></span>'}
          `;
          tokenList.appendChild(row);

          if (quantity > 0 && price > 0) {
            addToHoldings(symbol.toUpperCase() + 'USDT', name, symbol.toUpperCase(), quantity, price);
            addedCount++;
          }
        }
        scanTokens.innerHTML = `<i class="fas fa-check"></i> Found ${positions.length} positions via Zerion`;
        if (addedCount > 0 && typeof window.fetchPrices === 'function') window.fetchPrices();
        scanTokens.disabled = false;
        return;
      }
    } catch (e) {
      console.warn('Tier 3 Zerion scan failed:', e.message);
    }

    // Tier 4: Local RPC fallback
    hideScanProgress();
    await fallbackRpcScan(address);
  }

  async function scanWithZerion(address) {
    const positions = [];
    let url = `/wallets/${address}/positions/?filter[positions]=only_simple&filter[trash]=only_non_trash&sort=-value&currency=usd&page[size]=100`;
    while (url) {
      const data = await zerionFetch(url);
      positions.push(...data.data);
      url = data.links?.next ? data.links.next.replace(window.location.origin, '') : null;
    }
    return positions;
  }

  // ──────────────────────────────────────────────────
  // Transaction History (lazy-loaded on tab click)
  // ──────────────────────────────────────────────────

  async function loadTransactionHistory(forceRefresh = false) {
    const now = Date.now();
    
    // Check cache
    if (!forceRefresh && transactionsCache && (now - transactionsCacheTime < CACHE_DURATION)) {
      console.log('📦 Using cached transaction data');
      const txPanel = document.getElementById('zerion-tx-panel');
      if (txPanel && transactionsCache) {
        txPanel.innerHTML = transactionsCache;
      }
      return;
    }
    const address = getActiveAddress();
    if (!address) return;
    const txPanel = document.getElementById('zerion-tx-panel');
    if (!txPanel) return;
    txPanel.innerHTML = '<p style="color:#6f786d; font-size:.7rem;">Loading transactions…</p>';

    // Try CoinStats transactions first
    try {
      const data = await coinstatsFetch(`/wallet/transactions?address=${address}&connectionId=ethereum&limit=15`);
      const txs = Array.isArray(data) ? data : (data.transactions || []);
      if (txs.length) {
        txPanel.innerHTML = '';
        for (const tx of txs) {
          const row = document.createElement('div');
          row.className = 'wallet-token-row';
          row.style.cssText = 'grid-template-columns: auto 1fr auto; padding:.55rem .6rem; gap:.5rem;';
          const time = tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
          row.innerHTML = `
            <span style="font-size:.6rem; font-weight:700; padding:.1rem .35rem; border-radius:4px; text-transform:uppercase; background:#6366f122; color:#6366f1;">${tx.type || 'tx'}</span>
            <div style="font-size:.68rem; overflow:hidden; text-overflow:ellipsis;">${tx.from?.slice(0, 10)}… → ${tx.to?.slice(0, 10)}…</div>
            <span style="font-size:.58rem; color:#6f786d;">${time}</span>
          `;
          txPanel.appendChild(row);
        }
        return;
      }
    } catch (e) {
      console.warn('CoinStats transactions failed, trying Zerion:', e.message);
    }

    // Fallback to Zerion
    try {
      const data = await zerionFetch(`/wallets/${address}/transactions/?currency=usd&page[size]=15`);
      if (!data.data.length) { 
        const noTxHtml = '<p style="color:#6f786d; font-size:.72rem;">No recent transactions.</p>';
        txPanel.innerHTML = noTxHtml;
        transactionsCache = noTxHtml;
        transactionsCacheTime = now;
        return; 
      }
      txPanel.innerHTML = '';
      for (const tx of data.data) {
        const { operation_type, mined_at, transfers, fee, application_metadata } = tx.attributes;
        const chain = tx.relationships?.chain?.data?.id || '';
        const time = mined_at ? new Date(mined_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const app = application_metadata?.name || '';
        const typeColors = { trade: '#6366f1', send: '#ef4444', receive: '#22c55e', deposit: '#3b82f6', withdraw: '#f59e0b', mint: '#a855f7', approve: '#64748b', claim: '#14b8a6' };
        const color = typeColors[operation_type] || '#6f786d';

        let transfersHtml = '';
        for (const t of (transfers || []).slice(0, 3)) {
          const sym = t.fungible_info?.symbol || 'NFT';
          const dir = t.direction === 'out' ? '-' : '+';
          const val = t.value != null ? `$${Math.abs(t.value).toFixed(2)}` : '';
          const qty = t.quantity?.float ? parseFloat(t.quantity.float).toLocaleString('en-US', { maximumFractionDigits: 6 }) : '';
          transfersHtml += `<span style="color:${t.direction === 'out' ? '#ef4444' : 'var(--accent)'};">${dir}${qty} ${sym} ${val}</span>`;
        }

        const row = document.createElement('div');
        row.className = 'wallet-token-row';
        row.style.cssText = 'grid-template-columns: auto 1fr auto; padding:.55rem .6rem; gap:.5rem;';
        row.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:flex-start; gap:.15rem;">
            <span style="background:${color}22; color:${color}; font-size:.6rem; font-weight:700; padding:.1rem .35rem; border-radius:4px; text-transform:uppercase;">${operation_type}</span>
            <span style="font-size:.58rem; color:#6f786d;">${chain}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:.1rem; overflow:hidden;">
            ${app ? `<span style="font-size:.62rem; color:#94a3b8;">via ${app}</span>` : ''}
            <div style="display:flex; flex-wrap:wrap; gap:.3rem; font-size:.68rem;">${transfersHtml}</div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:.58rem; color:#6f786d;">${time}</span>
            ${fee?.value != null ? `<span style="display:block; font-size:.55rem; color:#475569;">fee $${fee.value.toFixed(2)}</span>` : ''}
          </div>
        `;
        txPanel.appendChild(row);
      }
      
      // Cache the result
      transactionsCache = txPanel.innerHTML;
      transactionsCacheTime = now;
      console.log('💾 Transactions cached');
    } catch (e) {
      const errorHtml = `<p style="color:#ef4444; font-size:.7rem;">${e.message}</p>`;
      txPanel.innerHTML = errorHtml;
    }
  }

  // ──────────────────────────────────────────────────
  // NFT Portfolio (lazy-loaded on tab click via Zerion)
  // ──────────────────────────────────────────────────

  async function loadNFTPortfolio(forceRefresh = false) {
    const now = Date.now();
    
    // Check cache
    if (!forceRefresh && nftCache && (now - nftCacheTime < CACHE_DURATION)) {
      console.log('📦 Using cached NFT data');
      const nftPanel = document.getElementById('zerion-nft-panel');
      if (nftPanel && nftCache) {
        nftPanel.innerHTML = nftCache;
      }
      return;
    }
    const address = getActiveAddress();
    if (!address) return;
    const nftPanel = document.getElementById('zerion-nft-panel');
    if (!nftPanel) return;
    nftPanel.innerHTML = '<p style="color:#6f786d; font-size:.7rem;">Loading NFTs…</p>';
    try {
      const data = await zerionFetch(`/wallets/${address}/nft-collections/?currency=usd&sort=-total_floor_price&page[size]=10`);
      if (!data.data.length) { 
        const noNftHtml = '<p style="color:#6f786d; font-size:.72rem;">No NFTs found.</p>';
        nftPanel.innerHTML = noNftHtml;
        nftCache = noNftHtml;
        nftCacheTime = now;
        return; 
      }
      nftPanel.innerHTML = '';
      for (const col of data.data) {
        const { collection_info, nfts_count, total_floor_price } = col.attributes;
        const name = collection_info?.name || 'Unknown';
        const icon = collection_info?.content?.icon?.url || collection_info?.content?.image?.url || '';
        const description = collection_info?.description || '';
        const chain = col.relationships?.chain?.data?.id || '';
        
        const row = document.createElement('div');
        row.className = 'wallet-token-row';
        row.style.cssText = 'grid-template-columns: auto 1fr auto auto; padding:.75rem; gap:.75rem; align-items:center;';
        row.innerHTML = `
          ${icon ? `<img src="${icon}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">` : '<div style="width:48px;height:48px;background:#1a1f27;border-radius:8px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="color:#6f786d;font-size:1.2rem;"></i></div>'}
          <div>
            <strong style="font-size:.75rem;">${name}</strong>
            <div style="font-size:.6rem; color:#6f786d; margin-top:.2rem;">
              ${nfts_count} NFT${nfts_count !== 1 ? 's' : ''}
              ${chain ? ` · ${chain}` : ''}
            </div>
            ${description ? `<div style="font-size:.6rem; color:#94a3b8; margin-top:.3rem; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${description.slice(0, 60)}${description.length > 60 ? '...' : ''}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:.72rem; color:#6f786d;">Floor Price</div>
            <strong style="color:var(--accent); font-size:.8rem;">${total_floor_price ? '$' + total_floor_price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</strong>
          </div>
        `;
        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:.4rem; overflow:hidden;">
            ${icon ? `<img src="${icon}" style="width:18px;height:18px;border-radius:4px;" onerror="this.style.display='none'">` : ''}
            <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap; font-size:.72rem;">${name}</strong>
          </div>
          <span style="font-size:.65rem; color:#6f786d;">${nfts_count} NFT${nfts_count > 1 ? 's' : ''}</span>
          <span style="font-size:.7rem;">${total_floor_price != null ? `$${total_floor_price.toFixed(2)}` : '—'}</span>
        `;
        nftPanel.appendChild(row);
      }
      
      // Cache the result
      nftCache = nftPanel.innerHTML;
      nftCacheTime = now;
      console.log('💾 NFTs cached');
    } catch (e) {
      nftPanel.innerHTML = `<p style="color:#ef4444; font-size:.7rem;">${e.message}</p>`;
    }
  }

  // ──────────────────────────────────────────────────
  // Tier 4: RPC batch scan fallback
  // ──────────────────────────────────────────────────

  async function fallbackRpcScan(address) {
    const mainnetChains = [
      ['Ethereum', 'ethereum', 'https://eth.llamarpc.com'],
      ['Polygon', 'polygon-pos', 'https://polygon-bor.publicnode.com'],
      ['Arbitrum', 'arbitrum-one', 'https://arbitrum-one.publicnode.com']
    ];

    scanTokens.textContent = `RPC fallback: scanning ${mainnetChains.length} chains...`;
    try {
      // Fetch top 500 tokens by market cap
      const markets = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=500&page=1').then(r => r.json()).catch(() => []);
      const accountArg = address.slice(2).padStart(64, '0');
      const found = [];
      let checked = 0;

      for (const [chainName, platform, rpc] of mainnetChains) {
        const candidates = markets.filter(m => m.platforms && m.platforms[platform]).map(m => ({
          market: m,
          address: m.platforms[platform]
        })).filter(item => /^0x[a-fA-F0-9]{40}$/.test(item.address));

        for (let i = 0; i < candidates.length; i += 20) {
          const batch = candidates.slice(i, i + 20);
          const payload = batch.map((item, idx) => ({
            jsonrpc: '2.0',
            id: idx,
            method: 'eth_call',
            params: [{ to: item.address, data: `0x70a08231${accountArg}` }, 'latest']
          }));

          const results = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(r => r.ok ? r.json() : []).catch(() => []);

          const arr = Array.isArray(results) ? results : [];
          for (let j = 0; j < batch.length; j++) {
            const value = arr.find(r => r.id === j)?.result || '0x0';
            if (BigInt(value) > 0n) {
              const quantity = Number(BigInt(value)) / 1e18; // Convert from wei
              found.push({ ...batch[j], chainName, quantity });
            }
          }
          checked += batch.length;
          tokenList.textContent = `Scanning ${chainName} · ${checked} tokens checked…`;
        }
      }

      tokenList.innerHTML = '';
      if (!found.length) {
        tokenList.textContent = 'No balances found. Try adding a CoinStats API key for full coverage.';
        return;
      }

      // Sort by value descending
      found.sort((a, b) => (b.quantity * b.market.current_price) - (a.quantity * a.market.current_price));

      // Add sorting controls
      const sortControls = document.createElement('div');
      sortControls.style.cssText = 'display:flex; gap:.5rem; margin-bottom:.5rem; font-size:.65rem;';
      sortControls.innerHTML = `
        <button id="sort-value" style="background:var(--accent);color:#111;padding:.25rem .5rem;border-radius:4px;border:none;cursor:pointer;font-weight:700;">Sort by Value ↓</button>
        <button id="sort-name" style="background:none;color:var(--accent);padding:.25rem .5rem;border-radius:4px;border:1px solid var(--accent);cursor:pointer;">Sort by Name ↑</button>
        <button id="sort-rank" style="background:none;color:var(--accent);padding:.25rem .5rem;border-radius:4px;border:1px solid var(--accent);cursor:pointer;">Sort by Rank ↑</button>
      `;
      tokenList.appendChild(sortControls);

      const renderTokens = (sortedTokens) => {
        // Remove existing token rows
        while (tokenList.children.length > 1) {
          tokenList.removeChild(tokenList.lastChild);
        }
        
        for (const item of sortedTokens) {
          const symbol = item.market.symbol.toUpperCase();
          const rank = item.market.market_cap_rank;
          const quantity = item.quantity;
          const price = item.market.current_price || 0;
          const value = quantity * price;
          const icon = item.market.image || ''; // CoinGecko provides token images
          
          const row = document.createElement('div');
          row.className = 'wallet-token-row';
          row.style.cssText = 'grid-template-columns: 1fr auto auto auto auto; padding:.55rem .6rem; gap:.5rem;';
          row.innerHTML = `
            <div style="display:flex; align-items:center; gap:.5rem;">
              ${icon ? `<img src="${icon}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : ''}
              <span style="font-size:.55rem; color:#6f786d; font-weight:700;">#${rank}</span>
              <strong>${symbol}</strong>
              <span style="font-size:.6rem; color:#6f786d;">${item.market.name}</span>
            </div>
            <span style="font-size:.65rem; color:#6f786d;">${item.chainName}</span>
            <span>${quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
            <span>$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <span style="color:var(--accent); font-weight:700;">$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          `;
          tokenList.appendChild(row);
          
          if (price > 0) {
            addToHoldings(symbol + 'USDT', item.market.name, symbol, quantity, price);
          }
        }
      };
      
      renderTokens(found);
      
      // Add sorting event listeners
      document.getElementById('sort-value')?.addEventListener('click', () => {
        const sorted = [...found].sort((a, b) => (b.quantity * b.market.current_price) - (a.quantity * a.market.current_price));
        renderTokens(sorted);
      });
      
      document.getElementById('sort-name')?.addEventListener('click', () => {
        const sorted = [...found].sort((a, b) => a.market.symbol.localeCompare(b.market.symbol));
        renderTokens(sorted);
      });
      
      document.getElementById('sort-rank')?.addEventListener('click', () => {
        const sorted = [...found].sort((a, b) => a.market.market_cap_rank - b.market.market_cap_rank);
        renderTokens(sorted);
      });
    } catch (e) {
      tokenList.textContent = 'Scan failed.';
    } finally {
      scanTokens.disabled = false;
      scanTokens.innerHTML = `<i class="fas fa-radar"></i> Scan tokens`;
    }
  }

  // ──────────────────────────────────────────────────
  // Tab Navigation
  // ──────────────────────────────────────────────────

  function initWalletTabs() {
    const tabs = document.querySelectorAll('.wallet-tab-btn');
    const panels = document.querySelectorAll('.wallet-tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.style.borderColor = 'transparent'; t.style.color = '#6f786d'; });
        panels.forEach(p => p.classList.add('hidden'));
        tab.classList.add('active'); tab.style.borderColor = 'var(--accent)'; tab.style.color = 'var(--accent)';
        const target = document.getElementById(tab.dataset.panel);
        if (target) target.classList.remove('hidden');

        if (tab.dataset.panel === 'zerion-tx-panel' && activeAccount) loadTransactionHistory();
        if (tab.dataset.panel === 'zerion-nft-panel' && activeAccount) loadNFTPortfolio();
      });
    });
  }

  // ──────────────────────────────────────────────────
  // Add token to portfolio holdings
  // ──────────────────────────────────────────────────

  function addToHoldings(pairSymbol, name, ticker, amount, price) {
    if (!window.portfolio) return;
    const existing = window.portfolio.find(h => h.ticker === ticker);
    if (existing) {
      if (amount > 0) {
        const totalAmount = existing.amount + amount;
        const avgPrice = ((existing.amount * existing.purchasePrice) + (amount * price)) / totalAmount;
        existing.amount = totalAmount;
        existing.purchasePrice = avgPrice;
      }
    } else if (amount > 0) {
      window.portfolio.push({ symbol: pairSymbol, name, ticker, amount, purchasePrice: price });
    }
  }

  // ──────────────────────────────────────────────────
  // Manual token add (via contract address + RPC)
  // ──────────────────────────────────────────────────

  const decodeUint = (hex) => Number(BigInt(hex));
  const decodeSymbol = (hex) => {
    try { const offset = Number(BigInt(`0x${hex.slice(2, 66)}`)) * 2 + 2; const size = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`)); return new TextDecoder().decode(Uint8Array.from(hex.slice(offset + 64, offset + 64 + size * 2).match(/.{1,2}/g).map(byte => parseInt(byte, 16)))); } catch { return 'TOKEN'; }
  };

  async function addTokenBalance() {
    const address = tokenInput?.value.trim();
    if (!activeAccount) { tokenList.textContent = 'Connect a wallet first.'; return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) { tokenList.textContent = 'Enter a valid ERC-20 contract address.'; return; }
    const accountArg = activeAccount.slice(2).padStart(64, '0');
    try {
      const [balanceHex, decimalsHex, symbolHex] = await Promise.all([
        window.ethereum.request({ method: 'eth_call', params: [{ to: address, data: `0x70a08231${accountArg}` }, 'latest'] }),
        window.ethereum.request({ method: 'eth_call', params: [{ to: address, data: '0x313ce567' }, 'latest'] }),
        window.ethereum.request({ method: 'eth_call', params: [{ to: address, data: '0x95d89b41' }, 'latest'] })
      ]);
      const decimals = decodeUint(decimalsHex); const amount = decodeUint(balanceHex) / 10 ** decimals; const symbol = decodeSymbol(symbolHex);
      const row = document.createElement('div'); row.className = 'wallet-token-row'; row.innerHTML = `<strong>${symbol}</strong><span>${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span><span>—</span>`;
      tokenList.prepend(row); tokenInput.value = '';
      if (amount > 0) addToHoldings(symbol + 'USDT', symbol, symbol, amount, 0);
    } catch { tokenList.textContent = 'Could not read this token on the active network.'; }
  }

  // ──────────────────────────────────────────────────
  // Account Details toggle
  // ──────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────
  // Event listeners & initialization
  // ──────────────────────────────────────────────────

  const profileToggle = document.getElementById('wallet-profile-toggle');
  const profilePanel = document.getElementById('wallet-profile-panel');
  const profileClose = document.getElementById('wallet-profile-close');
  profileToggle?.addEventListener('click', () => profilePanel?.classList.toggle('hidden'));
  profileClose?.addEventListener('click', () => profilePanel?.classList.add('hidden'));

  function showScanProgress(percent) {
    const bar = document.getElementById('scan-progress');
    const fill = document.getElementById('scan-progress-bar');
    if (!bar || !fill) return;
    bar.classList.remove('hidden');
    if (percent === 'indeterminate') { bar.classList.add('is-indeterminate'); return; }
    bar.classList.remove('is-indeterminate');
    fill.style.width = `${Math.min(100, Math.round(percent))}%`;
  }
  function hideScanProgress() {
    const bar = document.getElementById('scan-progress');
    if (bar) { bar.classList.add('hidden'); bar.classList.remove('is-indeterminate'); }
  }

  addToken?.addEventListener('click', addTokenBalance);
  scanTokens?.addEventListener('click', scanTopTokens);
  button?.addEventListener('click', connectWallet);

  function getActiveAddress() {
    return activeAccount || DEFAULT_WALLET;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect-wallet');
    if (connectBtn && !connectBtn._ctBound) {
      connectBtn._ctBound = true;
      connectBtn.addEventListener('click', connectWallet);
    }
    initWalletTabs();

    const zerionInput = document.getElementById('zerion-key');
    const saveBtn = document.getElementById('save-settings');
    if (zerionInput) zerionInput.value = getZerionKey();
    saveBtn?.addEventListener('click', () => {
      if (zerionInput) localStorage.setItem('ct_zerion_key', zerionInput.value.trim());
    });

    if (scanTokens) {
      scanTokens.innerHTML = '<i class="fas fa-radar"></i> Scan tokens (all chains)';
    }

    const addr = getActiveAddress();
    profile.address.textContent = shortAddress(addr);
    profile.address.title = addr;
    profile.state.textContent = 'Ready to connect';
    if (document.getElementById('detail-full-address')) {
      document.getElementById('detail-full-address').textContent = addr;
    }
  });

  preview?.addEventListener('click', () => {
    const eth = window.currentPrices?.ETHUSDT;
    output.textContent = eth ? `Paper signal: monitor ETH near $${eth.toLocaleString('en-US', { maximumFractionDigits: 2 })}; no order was placed.` : 'Waiting for a market price before creating a paper signal.';
  });
  
  console.log('✅ wallet.js initialization complete');
})();
