(() => {
  const ZERION_BASE = 'https://api.zerion.io/v1';
  const DEFAULT_WALLET = '0xd7e9d18153de624713C18b1cA18A238C42033EA5';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  let activeAccount = null;

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(`ct_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      
      // If the user isn't logged in/connected, preserve cached results permanently for demo purposes
      const isConnected = activeAccount || (window.ethereum && window.ethereum.selectedAddress);
      if (!isConnected) {
        // Display a small UI badge indicating cached demo data
        const portfolioEl = document.getElementById('zerion-portfolio-summary');
        if (portfolioEl && !document.getElementById('demo-data-badge')) {
          const badge = document.createElement('div');
          badge.id = 'demo-data-badge';
          badge.style.cssText = 'grid-column: span 2; font-size: 0.65rem; color: var(--accent); opacity: 0.8; margin-bottom: 0.25rem;';
          badge.innerHTML = `<i class="fas fa-database mr-1"></i> Demo Mode: Displaying cached superuser data from ${new Date(ts).toLocaleString()}`;
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

  function getZerionKey() {
    return localStorage.getItem('ct_zerion_key') || '';
  }

  function zerionHeaders() {
    const key = getZerionKey();
    return {
      accept: 'application/json',
      authorization: `Basic ${btoa(key + ':')}`
    };
  }

  function hasZerionKey() {
    return getZerionKey().length > 10;
  }

  async function zerionFetch(path, retries = 2) {
    const cacheKey = path.replace(/[^a-z0-9]/gi, '_').slice(0, 80);
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'https://cryptotracker.abhimanyu.fyi' 
      : '';
    const res = await fetch(`${host}/api/zerion?path=${encodeURIComponent(path)}`);
    if (res.status === 429) {
      showApiKeyPrompt();
      throw new Error('Rate limited — enter your own Zerion API key in Settings.');
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

  function showApiKeyPrompt() {
    const existing = document.getElementById('zerion-key-prompt');
    if (existing) return;
    const prompt = document.createElement('div');
    prompt.id = 'zerion-key-prompt';
    prompt.className = 'wallet-token-row';
    prompt.style.cssText = 'grid-template-columns:1fr auto; border-color:rgba(239,68,68,.4); margin-top:.5rem;';
    prompt.innerHTML = `
      <span style="color:#ef4444; font-size:.7rem;">Rate limited. Enter your Zerion API key in Settings or get one at dashboard.zerion.io</span>
      <button onclick="document.getElementById('settings-toggle')?.click(); this.parentElement.remove();" class="bot-preview" style="font-size:.65rem; padding:.3rem .5rem;">Open Settings</button>
    `;
    tokenList?.after(prompt);
  }

  const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;

  async function connectWallet() {
    console.log('🔵 connectWallet() called');
    console.log('🔵 Button element:', button);
    console.log('🔵 window.ethereum:', window.ethereum);
    
    // Handle case where no Web3 provider exists at all
    if (!window.ethereum) {
      console.warn('⚠️ No Web3 provider detected (window.ethereum is undefined)');
      if (button?.querySelector('span')) {
        console.log('📝 Updating button text to "Install MetaMask"');
        button.querySelector('span').textContent = 'Install MetaMask';
      }
      console.log('🌐 Opening MetaMask download page');
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      return;
    }
    
    console.log('✅ Web3 provider detected');
    
    if (button) {
      console.log('🔘 Disabling button and updating text to "Connecting…"');
      button.disabled = true;
      button.querySelector('span').textContent = 'Connecting…';
    }
    
    try {
      console.log('📡 Requesting eth_requestAccounts...');
      // Race eth_requestAccounts against a 30s timeout to unblock stuck pending requests
      const accounts = await Promise.race([
        window.ethereum.request({ method: 'eth_requestAccounts' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000))
      ]);
      
      console.log('✅ Accounts received:', accounts);
      const account = accounts?.[0];
      
      if (!account) {
        console.error('❌ No account returned from eth_requestAccounts');
        throw new Error('No account returned');
      }
      
      console.log('👤 Account address:', account);
      console.log('🔄 Calling refreshProfile...');
      await refreshProfile(account);
      
      if (button) {
        console.log('📝 Updating button text with connected address');
        button.querySelector('span').textContent = shortAddress(account);
        button.classList.add('is-connected');
      }
      
      // Only register listeners once
      if (!window._ctWalletListening) {
        console.log('👂 Registering wallet event listeners');
        window._ctWalletListening = true;
        window.ethereum.on?.('accountsChanged', async ([next]) => {
          console.log('🔄 Account changed:', next);
          if (button) {
            button.querySelector('span').textContent = next ? shortAddress(next) : 'Connect wallet';
            button.classList.toggle('is-connected', Boolean(next));
          }
          if (next) await refreshProfile(next); else resetProfile();
        });
        window.ethereum.on?.('chainChanged', () => {
          console.log('🔗 Chain changed, refreshing account');
          window.ethereum.request({ method: 'eth_accounts' }).then(([a]) => a && refreshProfile(a));
        });
      } else {
        console.log('✋ Event listeners already registered, skipping');
      }
    } catch (error) {
      console.error('❌ connectWallet error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (button?.querySelector('span')) {
        console.log('📝 Updating button text based on error type');
        button.querySelector('span').textContent =
          error.code === 4001 ? 'Connection declined' :
          error.message === 'timeout' ? 'Timed out — retry' :
          'Connect wallet';
      }
      console.warn('connectWallet error:', error);
    } finally {
      console.log('🔓 Re-enabling button');
      if (button) button.disabled = false;
    }
  }
  window.connectWallet = connectWallet; // expose for banner/inline onclick
  console.log('✅ connectWallet exposed to window.connectWallet');

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

    loadZerionPortfolio(account);
    loadZerionPnL(account);
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

  // ──────────────────────────────────────────────────
  // Zerion-powered portfolio (replaces batch RPC scanning)
  // ──────────────────────────────────────────────────

  async function loadZerionPortfolio(address) {
    const portfolioEl = document.getElementById('zerion-portfolio-summary');
    if (portfolioEl) portfolioEl.textContent = 'Loading portfolio…';
    try {
      const data = await zerionFetch(`/wallets/${address}/portfolio?currency=usd`);
      const attrs = data.data.attributes;
      const totalValue = attrs.total.positions;
      const change24h = attrs.changes?.absolute_1d ?? 0;
      const changePct = attrs.changes?.percent_1d ?? 0;
      if (portfolioEl) {
        portfolioEl.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <div><span>Total Value</span><strong>$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
            <div><span>24h Change</span><strong class="${change24h >= 0 ? 'text-accent' : ''}" style="${change24h < 0 ? 'color:#ef4444' : ''}">${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toLocaleString('en-US', { maximumFractionDigits: 2 })} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)</strong></div>
          </div>
        `;
      }
    } catch (e) {
      if (portfolioEl) portfolioEl.textContent = e.message;
    }
  }

  async function loadZerionPnL(address) {
    const pnlEl = document.getElementById('zerion-pnl-summary');
    if (!pnlEl) return;
    pnlEl.textContent = 'Loading PnL…';
    try {
      const data = await zerionFetch(`/wallets/${address}/pnl?currency=usd`);
      const pnl = data.data.attributes;
      pnlEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
          <div><span>Realized</span><strong class="${pnl.realized_gain >= 0 ? 'text-accent' : ''}" style="${pnl.realized_gain < 0 ? 'color:#ef4444' : ''}">${pnl.realized_gain >= 0 ? '+' : ''}$${Math.abs(pnl.realized_gain).toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
          <div><span>Unrealized</span><strong class="${pnl.unrealized_gain >= 0 ? 'text-accent' : ''}" style="${pnl.unrealized_gain < 0 ? 'color:#ef4444' : ''}">${pnl.unrealized_gain >= 0 ? '+' : ''}$${Math.abs(pnl.unrealized_gain).toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
          <div><span>Net Invested</span><strong>$${Math.abs(pnl.net_invested).toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
          <div><span>Total Fees</span><strong>$${pnl.total_fee.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
        </div>
      `;
    } catch (e) {
      pnlEl.textContent = e.message;
    }
  async function scanWithZerion(address) {
    tokenList.textContent = 'Fetching all positions via Zerion (all chains, no rate limits)…';
    const positions = [];
    let url = `/wallets/${address}/positions/?filter[positions]=only_simple&filter[trash]=only_non_trash&sort=-value&currency=usd&page[size]=100`;
    while (url) {
      const data = await zerionFetch(url);
      positions.push(...data.data);
      url = data.links?.next ? data.links.next.replace(window.location.origin, '') : null;
    }
    return positions;
  }

  async function scanTopTokens() {
    const address = getActiveAddress();
    if (!address) { tokenList.textContent = 'Connect a wallet first.'; return; }
    scanTokens.disabled = true;
    tokenList.innerHTML = '';

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'https://cryptotracker.abhimanyu.fyi' 
      : '';

    // Tier 1: CoinStats Multi-Chain API Scan
    try {
      scanTokens.textContent = 'Scanning CoinStats Multi-Chain (Tier 1)…';
      showScanProgress('indeterminate');
      const response = await fetch(`${host}/api/zerion?coinstats=true&path=${encodeURIComponent(`/wallet/balances?address=${address}&blockchain=all`)}`);
      
      if (response.ok) {
        const data = await response.json();
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
            if (quantity <= 0) continue;
            foundAny = true;

            const row = document.createElement('div');
            row.className = 'wallet-token-row';
            row.style.gridTemplateColumns = 'minmax(60px,1.2fr) .6fr .8fr .8fr .6fr';
            row.innerHTML = `
              <div style="display:flex; align-items:center; gap:.4rem; overflow:hidden;">
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
      }
    } catch (e) {
      console.warn('Tier 1 CoinStats Multi-Chain scan failed, attempting Tier 2 Zerion...', e);
    }

    // Tier 2: Zerion Multi-Chain API Scan
    try {
      scanTokens.textContent = 'Scanning Zerion Proxy (Tier 2)…';
      const positions = await scanWithZerion(address);
      hideScanProgress();
      tokenList.innerHTML = '';
      if (positions && positions.length) {
        let addedCount = 0;
        for (const pos of positions) {
          const attrs = pos.attributes;
          const fungible = attrs.fungible_info;
          const chain = pos.relationships?.chain?.data?.id || 'unknown';
          const quantity = attrs.quantity?.float ?? 0;
          const value = attrs.value ?? 0;
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
              ${icon ? `<img src="${icon}" style="width:16px;height:16px;border-radius:50%;" onerror="this.style.display='none'">` : ''}
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
      console.warn('Tier 2 Zerion Multi-Chain scan failed, attempting Tier 3 Local RPC...', e);
    }

    // Tier 3: Local RPC Scan Fallback
    hideScanProgress();
    await fallbackRpcScan(address);
  }

  // ──────────────────────────────────────────────────
  // Transaction History (Zerion)
  // ──────────────────────────────────────────────────

  async function loadTransactionHistory() {
    const address = getActiveAddress();
    if (!address || !hasZerionKey()) return;
    const txPanel = document.getElementById('zerion-tx-panel');
    if (!txPanel) return;
    txPanel.innerHTML = '<p style="color:#6f786d; font-size:.7rem;">Loading transactions…</p>';
    try {
      const data = await zerionFetch(`/wallets/${address}/transactions/?currency=usd&page[size]=15`);
      if (!data.data.length) { txPanel.innerHTML = '<p style="color:#6f786d; font-size:.72rem;">No recent transactions.</p>'; return; }
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
    } catch (e) {
      txPanel.innerHTML = `<p style="color:#ef4444; font-size:.7rem;">${e.message}</p>`;
    }
  }

  // ──────────────────────────────────────────────────
  // NFT Portfolio (Zerion)
  // ──────────────────────────────────────────────────

  async function loadNFTPortfolio() {
    const address = getActiveAddress();
    if (!address || !hasZerionKey()) return;
    const nftPanel = document.getElementById('zerion-nft-panel');
    if (!nftPanel) return;
    nftPanel.innerHTML = '<p style="color:#6f786d; font-size:.7rem;">Loading NFTs…</p>';
    try {
      const data = await zerionFetch(`/wallets/${address}/nft-collections/?currency=usd&sort=-total_floor_price&page[size]=10`);
      if (!data.data.length) { nftPanel.innerHTML = '<p style="color:#6f786d; font-size:.72rem;">No NFTs found.</p>'; return; }
      nftPanel.innerHTML = '';
      for (const col of data.data) {
        const { collection_info, nfts_count, total_floor_price } = col.attributes;
        const name = collection_info?.name || 'Unknown';
        const icon = collection_info?.content?.icon?.url || '';
        const row = document.createElement('div');
        row.className = 'wallet-token-row';
        row.style.gridTemplateColumns = '1fr auto auto';
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
    } catch (e) {
      nftPanel.innerHTML = `<p style="color:#ef4444; font-size:.7rem;">${e.message}</p>`;
    }
  }

  // ──────────────────────────────────────────────────
  // Fallback: RPC batch scan (when no Zerion key)
  // ──────────────────────────────────────────────────

  const scanChains = [
    ['Ethereum', 'ethereum', 'https://ethereum-rpc.publicnode.com'],
    ['Polygon', 'polygon-pos', 'https://polygon-bor-rpc.publicnode.com'],
    ['BNB Chain', 'binance-smart-chain', 'https://bsc-rpc.publicnode.com'],
    ['Arbitrum', 'arbitrum-one', 'https://arbitrum-one-rpc.publicnode.com'],
    ['Optimism', 'optimistic-ethereum', 'https://optimism-rpc.publicnode.com'],
    ['Base', 'base', 'https://base-rpc.publicnode.com'],
    ['Avalanche', 'avalanche', 'https://avalanche-c-chain-rpc.publicnode.com'],
    ['Fantom', 'fantom', 'https://fantom-rpc.publicnode.com'],
    ['Linea', 'linea', 'https://linea-rpc.publicnode.com'],
    ['Scroll', 'scroll', 'https://scroll-rpc.publicnode.com']
  ];

  async function fallbackRpcScan(address) {
    // Only scan top 50 tokens on main chains to reduce API calls
    const mainnetChains = [
      ['Ethereum', 'ethereum', 'https://eth.llamarpc.com'],
      ['Polygon', 'polygon-pos', 'https://polygon-bor.publicnode.com'],
      ['Arbitrum', 'arbitrum-one', 'https://arbitrum-one.publicnode.com']
    ];
    
    scanTokens.textContent = `Scanning top 50 tokens across ${mainnetChains.length} main chains...`;
    try {
      // Only fetch top 50 by market cap instead of 250
      const markets = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1').then(r => r.json()).catch(() => []);
      const accountArg = address.slice(2).padStart(64, '0');
      const found = [];
      let checked = 0;

      for (const [chainName, platform, rpc] of mainnetChains) {
        // Get contract addresses from the market data directly (platforms field)
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
            if (BigInt(value) > 0n) found.push({ ...batch[j], chainName });
          }
          checked += batch.length;
          tokenList.textContent = `Scanning ${chainName} · ${checked} tokens checked…`;
        }
      }

      tokenList.innerHTML = '';
      if (!found.length) { 
        tokenList.textContent = `No balances found on ${mainnetChains.length} main chains. Add a Zerion API key for full coverage.`; 
        return; 
      }
      
      for (const item of found) {
        const row = document.createElement('div');
        row.className = 'wallet-token-row';
        row.innerHTML = `<strong>${item.market.symbol.toUpperCase()}</strong><span>${item.chainName}</span><span>$${item.market.current_price?.toLocaleString('en-US') || '—'}</span>`;
        tokenList.appendChild(row);
        if (item.market.current_price) {
          addToHoldings(item.market.symbol.toUpperCase() + 'USDT', item.market.name, item.market.symbol.toUpperCase(), 0, item.market.current_price);
        }
      }
    } catch (e) { 
      tokenList.textContent = 'Scan failed. Add a Zerion API key for reliable multi-chain scanning.'; 
    }
    finally { 
      scanTokens.disabled = false; 
      scanTokens.innerHTML = `<i class="fas fa-radar"></i> Scan tokens (${mainnetChains.length} main chains)`; 
    }
  }

  // ──────────────────────────────────────────────────
  // Tab Navigation for wallet sections
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

        if (tab.dataset.panel === 'zerion-tx-panel' && activeAccount && hasZerionKey()) loadTransactionHistory();
        if (tab.dataset.panel === 'zerion-nft-panel' && activeAccount && hasZerionKey()) loadNFTPortfolio();
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
  // Event listeners
  // ──────────────────────────────────────────────────

  // Wallet Profile panel toggle
  const profileToggle = document.getElementById('wallet-profile-toggle');
  const profilePanel = document.getElementById('wallet-profile-panel');
  const profileClose = document.getElementById('wallet-profile-close');
  profileToggle?.addEventListener('click', () => profilePanel?.classList.toggle('hidden'));
  profileClose?.addEventListener('click', () => profilePanel?.classList.add('hidden'));

  // Progress bar for scanning
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

  // Zerion API key save handler (from settings modal)
  window.addEventListener('DOMContentLoaded', () => {
    // Safety-net: re-bind connect button in case IIFE ran before DOM was ready
    console.log('🔧 DOMContentLoaded - Setting up connect button');
    const connectBtn = document.getElementById('connect-wallet');
    console.log('🔍 connectBtn element found:', connectBtn);
    
    if (connectBtn && !connectBtn._ctBound) {
      console.log('✅ Binding click event listener to connect button');
      connectBtn._ctBound = true;
      connectBtn.addEventListener('click', (e) => {
        console.log('🖱️ Connect Wallet button clicked!');
        console.log('Event:', e);
        connectWallet();
      });
    } else if (connectBtn?._ctBound) {
      console.log('⚠️ Connect button already bound, skipping duplicate binding');
    } else {
      console.error('❌ Connect button not found in DOM');
    }
    initWalletTabs();

    const zerionInput = document.getElementById('zerion-key');
    const saveBtn = document.getElementById('save-settings');
    if (zerionInput) zerionInput.value = getZerionKey();
    saveBtn?.addEventListener('click', () => {
      if (zerionInput) localStorage.setItem('ct_zerion_key', zerionInput.value.trim());
    });

    // Update scan button label based on key
    if (scanTokens) {
      scanTokens.innerHTML = hasZerionKey()
        ? '<i class="fas fa-radar"></i> Scan all tokens (Zerion API — all chains)'
        : '<i class="fas fa-radar"></i> Scan tokens (limited — add Zerion key for full scan)';
    }

    // Auto-load portfolio with default wallet
    const addr = getActiveAddress();
    profile.address.textContent = shortAddress(addr);
    profile.address.title = addr;
    profile.state.textContent = 'Viewing';
    if (document.getElementById('detail-full-address')) {
      document.getElementById('detail-full-address').textContent = addr;
    }
    loadZerionPortfolio(addr);
    loadZerionPnL(addr);
  });

  window.addEventListener('load', () => {
    if (!sessionStorage.getItem('ct_web3_checked')) {
      sessionStorage.setItem('ct_web3_checked', '1');
      if (window.ethereum) {
        // Show a non-blocking banner instead of window.confirm (blocked by browsers on HTTPS)
        const banner = document.createElement('div');
        banner.id = 'web3-connect-banner';
        banner.style.cssText = 'position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(22,28,36,.95);border:1px solid rgba(52,211,153,.3);border-radius:12px;padding:.7rem 1.2rem;display:flex;align-items:center;gap:.8rem;box-shadow:0 8px 32px rgba(0,0,0,.4);font-size:.8rem;color:#e2e8f0;backdrop-filter:blur(12px);';
        banner.innerHTML = `<i class="fas fa-fingerprint" style="color:var(--accent);"></i><span>Web3 wallet detected &mdash; connect to see your live portfolio</span><button onclick="connectWallet();this.closest('#web3-connect-banner').remove();" style="background:var(--accent);color:#111;border:none;border-radius:8px;padding:.3rem .8rem;cursor:pointer;font-weight:700;font-size:.75rem;white-space:nowrap;">Connect</button><button onclick="this.closest('#web3-connect-banner').remove();" style="background:none;border:none;color:#6f786d;cursor:pointer;font-size:1rem;line-height:1;">&times;</button>`;
        document.body.appendChild(banner);
        setTimeout(() => banner?.remove(), 10000);
      } else if (button?.querySelector('span')) {
        button.querySelector('span').textContent = 'Install MetaMask';
      }
    }
  });

  preview?.addEventListener('click', () => {
    console.log('Preview button clicked');
    const eth = window.currentPrices?.ETHUSDT;
    output.textContent = eth ? `Paper signal: monitor ETH near $${eth.toLocaleString('en-US', { maximumFractionDigits: 2 })}; no order was placed.` : 'Waiting for a market price before creating a paper signal.';
  });
  
  }
  
  console.log('✅ wallet.js initialization complete');
})();
