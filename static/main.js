let selectedCurrency = 'USD';
const currencySymbols = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
let portfolio = [
    { symbol: 'ETHUSDT', name: 'Ethereum', ticker: 'ETH', amount: 0.035, purchasePrice: 2197.02 },
    { symbol: 'AVAXUSDT', name: 'Avalanche', ticker: 'AVAX', amount: 0.816, purchasePrice: 22.08 },
    { symbol: 'SCRUSDT', name: 'Scroll', ticker: 'SCR', amount: 49.096, purchasePrice: 1.21 }
];
let tradingPairs = [];
const coinImages = {
    'ETHUSDT': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    'AVAXUSDT': 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    'SCRUSDT': 'https://assets.coingecko.com/coins/images/39228/small/scroll.png',
    'BTCUSDT': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    'SOLUSDT': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    'DOGEUSDT': 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    'ADAUSDT': 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    'DOTUSDT': 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
    'MATICUSDT': 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
    'LINKUSDT': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    'XRPUSDT': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png'
};
let availableCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
let perfChart = null;
let predChart = null;

// Expose portfolio globally for Ai.js to access
window.portfolio = portfolio;


console.log("Portfolio initialized:", portfolio);
console.log("✅ main.js loaded");
console.log("📦 Portfolio set globally:", window.portfolio);

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            console.log(`Debounced function called after ${wait}ms`);
            func.apply(this, args);
        }, wait);
    };
}

function getPortfolioSummaryText(prices) {
    let summary = "Current Portfolio Summary:\n";
    let totalValue = 0;

    portfolio.forEach(holding => {
        const price = prices[holding.symbol] || holding.purchasePrice;
        const value = holding.amount * price;
        totalValue += value;

        summary += `
- ${holding.name} (${holding.ticker})
  Amount: ${holding.amount.toFixed(8)}
  Current Price: ${formatCurrency(price)}
  Value: ${formatCurrency(value)}
  Purchase Price: ${formatCurrency(holding.purchasePrice)}
  Profit/Loss: ${((price - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(2)}%
\n`;
    });

    summary += `Total Portfolio Value: ${formatCurrency(totalValue)}\n`;

    return summary;
}

function populateCurrencySelector() {
    const selector = document.getElementById('currency-selector');
    const selectorMobile = document.getElementById('currency-selector-mobile');
    const populate = (sel) => {
        sel.innerHTML = '';
        const priorityCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
        priorityCurrencies.forEach(curr => {
            if (availableCurrencies.includes(curr)) {
                sel.innerHTML += `<option value="${curr}">${curr} (${currencySymbols[curr] || curr})</option>`;
            }
        });
        availableCurrencies.forEach(curr => {
            if (!priorityCurrencies.includes(curr)) {
                sel.innerHTML += `<option value="${curr}">${curr}</option>`;
            }
        });
        sel.value = availableCurrencies.includes(selectedCurrency) ? selectedCurrency : 'USD';
    };
    if (selector) populate(selector);
    if (selectorMobile) populate(selectorMobile);
    selectedCurrency = selector ? selector.value : (selectorMobile ? selectorMobile.value : 'USD');
    console.log("Currency selector populated, selected:", selectedCurrency);
}

async function fetchTradingPairs() {
    console.log("Fetching trading pairs...");
    try {
        const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
        tradingPairs = response.data.symbols
            .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
            .slice(0, 500)
            .map(s => ({ symbol: s.symbol, name: s.baseAsset, ticker: s.baseAsset }))
            .sort((a, b) => a.name.localeCompare(b.name));
        populateCoinDropdowns();
        console.log("Trading pairs fetched:", tradingPairs.length);
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
    }
}

function populateCoinDropdowns() {
    const coinSelect = document.getElementById('coin-name');
    const predictSelect = document.getElementById('predict-coin');
    coinSelect.innerHTML = '<option value="">Select coin</option>';
    predictSelect.innerHTML = '';
    tradingPairs.forEach(pair => {
        coinSelect.innerHTML += `<option value="${pair.symbol}">${pair.name} (${pair.ticker})</option>`;
        predictSelect.innerHTML += `<option value="${pair.symbol}">${pair.name} (${pair.ticker})</option>`;
    });

    // Add listener for prediction updates
    predictSelect.addEventListener('change', (e) => {
        updatePredictionChart(e.target.value);
    });

    predictSelect.value = 'ETHUSDT';
    updatePredictionChart('ETHUSDT'); // Initial load
    console.log("Coin dropdowns populated");
}

async function fetchHistoricalPrice(symbol, date) {
    try {
        const timestamp = new Date(date).getTime();
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol, interval: '1d', startTime: timestamp, endTime: timestamp + 24 * 60 * 60 * 1000, limit: 1 }
        });
        const price = response.data[0] ? parseFloat(response.data[0][4]) : null;
        console.log(`Historical price for ${symbol} on ${date}: ${price}`);
        return price;
    } catch (error) {
        console.error('Error fetching historical price:', error);
        return null;
    }
}

async function fetchPrices() {
    console.log("Fetching prices...");

    // Portfolio & Summary Skeletons on initial load
    const tbody = document.getElementById('portfolio-body');
    if (!tbody.hasChildNodes() || tbody.children.length === 0) {
        tbody.innerHTML = Array(3).fill(0).map(() => `
            <tr>
                <td class="py-4 px-4"><div class="flex items-center"><div class="skeleton w-10 h-10 rounded-full mr-3"></div><div class="space-y-1"><div class="skeleton skeleton-text w-24"></div><div class="skeleton skeleton-text w-16"></div></div></div></td>
                <td class="py-4 px-4"><div class="skeleton skeleton-text w-full"></div></td>
                <td class="py-4 px-4"><div class="skeleton skeleton-text w-full"></div></td>
                <td class="py-4 px-4"><div class="skeleton skeleton-text w-full"></div></td>
                <td class="py-4 px-4"><div class="skeleton skeleton-text w-full"></div></td>
                <td class="py-4 px-4"><div class="skeleton skeleton-text w-full"></div></td>
                <td class="py-4 px-4 text-center"><div class="skeleton skeleton-text w-8 mx-auto"></div></td>
            </tr>
        `).join('');

        // Add skeleton classes to summary cards if they are showing placeholders
        ['portfolio-value', 'change-value', 'change-percent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('skeleton', 'text-transparent', 'rounded');
        });
    }

    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price');
        const prices = response.data.reduce((acc, item) => {
            acc[item.symbol] = parseFloat(item.price);
            return acc;
        }, {});
        await updatePortfolio(prices);
        await updateSummary(prices);
        console.log("Prices fetched successfully");
    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

function formatCurrency(value) {
    return `${currencySymbols[selectedCurrency] || selectedCurrency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchYesterdayPrice(symbol) {
    console.log(`Fetching yesterday's price for ${symbol}...`);
    try {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const timestamp = yesterday.getTime();
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol,
                interval: '1h',
                startTime: timestamp,
                endTime: timestamp + 60 * 60 * 1000,
                limit: 1
            }
        });
        const yesterdayPrice = response.data[0] ? parseFloat(response.data[0][4]) : null;
        console.log(`Yesterday's price for ${symbol}: ${yesterdayPrice}`);
        return yesterdayPrice;
    } catch (error) {
        console.error(`Error fetching yesterday's price for ${symbol}:`, error);
        return null;
    }
}

async function updatePortfolio(prices) {
    console.log("Updating portfolio...");
    const tbody = document.getElementById('portfolio-body');
    tbody.innerHTML = '';

    for (const [index, holding] of portfolio.entries()) {
        const price = prices[holding.symbol] || holding.purchasePrice;
        const yesterdayPrice = await fetchYesterdayPrice(holding.symbol);
        const value = holding.amount * price;
        const profitLossPercent = price !== holding.purchasePrice
            ? ((price - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(2)
            : 0;
        const profitLossAmount = (price - holding.purchasePrice) * holding.amount;
        const change24h = (yesterdayPrice && price !== holding.purchasePrice)
            ? ((price - yesterdayPrice) / yesterdayPrice * 100).toFixed(2)
            : 0;

        const coinImg = coinImages[holding.symbol];
        const imgHtml = coinImg
            ? `<img src="${coinImg}" alt="${holding.ticker}" class="coin-logo" onerror="this.outerHTML='<div class=coin-logo-fallback>${holding.ticker.charAt(0)}</div>'">`
            : `<div class="coin-logo-fallback">${holding.ticker.charAt(0)}</div>`;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-4 px-4">
                <div class="flex items-center">
                    <div class="mr-3">
                        ${imgHtml}
                    </div>
                    <div>
                        <div class="font-semibold">${holding.name}</div>
                        <div class="text-gray-500 text-sm">${holding.ticker}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-4 text-right">${holding.amount.toFixed(8)}</td>
            <td class="py-4 px-4 text-right">${formatCurrency(price)}</td>
            <td class="py-4 px-4 text-right font-medium">${formatCurrency(value)}</td>
            <td class="py-4 px-4 text-right ${change24h >= 0 ? 'text-accent' : 'text-red-400'}">${change24h >= 0 ? '+' : ''}${change24h}%</td>
            <td class="py-4 px-4 text-right">
                <span class="${profitLossPercent >= 0 ? 'text-accent' : 'text-red-400'}"
                      title="${formatCurrency(profitLossAmount)}">
                    ${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent}%
                </span>
            </td>
            <td class="py-4 px-4 text-center">
                <button class="text-blue-400 mr-2 hover:text-blue-500" onclick="editHolding(${index})"><i class="fas fa-edit"></i></button>
                <button class="text-red-400 hover:text-red-500" onclick="removeHolding(${index})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    }
    console.log("Portfolio updated");
}

async function updateSummary(prices) {
    console.log("Updating summary...");
    let totalValue = 0;
    let totalValueYesterday = 0;
    let totalPurchaseValue = 0;
    const changes24h = [];
    let bestCoin = '--';
    let bestChange = 0;
    let worstCoin = '--';
    let worstChange = 0;

    for (const holding of portfolio) {
        const price = prices[holding.symbol] || holding.purchasePrice;
        const yesterdayPrice = await fetchYesterdayPrice(holding.symbol);
        const value = holding.amount * price;
        const purchaseValue = holding.amount * holding.purchasePrice;
        totalValue += value;
        totalPurchaseValue += purchaseValue;

        if (yesterdayPrice) {
            totalValueYesterday += holding.amount * yesterdayPrice;
            const change24h = ((price - yesterdayPrice) / yesterdayPrice * 100).toFixed(2);
            changes24h.push({ name: holding.name, change: parseFloat(change24h) });
        } else {
            changes24h.push({ name: holding.name, change: 0 });
        }
    }

    if (changes24h.length > 0) {
        const best = changes24h.reduce((max, item) => item.change > max.change ? item : max, changes24h[0]);
        const worst = changes24h.reduce((min, item) => item.change < min.change ? item : min, changes24h[0]);
        bestCoin = best.name;
        bestChange = best.change;
        worstCoin = worst.name;
        worstChange = worst.change;
    }

    const change24h = totalValue - totalValueYesterday;
    const change24hPercent = totalValueYesterday > 0 ? (change24h / totalValueYesterday * 100).toFixed(2) : 0;
    const totalProfitPercent = totalPurchaseValue > 0 ? ((totalValue - totalPurchaseValue) / totalPurchaseValue * 100).toFixed(2) : 0;

    document.getElementById('portfolio-value').textContent = formatCurrency(totalValue);
    document.getElementById('portfolio-value').classList.remove('skeleton', 'text-transparent');

    document.getElementById('portfolio-change').innerHTML = `
        <i class="fas fa-caret-${totalProfitPercent >= 0 ? 'up' : 'down'} mr-1"></i>
        ${totalProfitPercent >= 0 ? '+' : ''}${totalProfitPercent}% overall
    `;
    document.getElementById('change-value').textContent = formatCurrency(change24h);
    document.getElementById('change-value').classList.remove('skeleton', 'text-transparent');

    document.getElementById('change-percent').innerHTML = `
        <i class="fas fa-caret-${change24h >= 0 ? 'up' : 'down'} mr-1"></i>
        ${change24hPercent >= 0 ? '+' : ''}${change24hPercent}% today
    `;
    document.getElementById('change-percent').classList.remove('skeleton', 'text-transparent');
    document.getElementById('change-percent').classList.remove('text-accent', 'text-red-400');
    document.getElementById('change-percent').classList.add(`text-${change24h >= 0 ? 'accent' : 'red-400'}`);

    // Best & Worst Performer
    const bestEl = document.getElementById('best-performer');
    const worstEl = document.getElementById('worst-performer');
    if (bestEl) bestEl.textContent = bestCoin !== '--' ? `${bestCoin} (${bestChange >= 0 ? '+' : ''}${bestChange.toFixed(2)}%)` : '--';
    if (worstEl) worstEl.textContent = worstCoin !== '--' ? `${worstCoin} (${worstChange >= 0 ? '+' : ''}${worstChange.toFixed(2)}%)` : '--';

    // Total Assets count
    const totalHoldingsEl = document.getElementById('total-holdings');
    if (totalHoldingsEl) totalHoldingsEl.textContent = portfolio.length;

    console.log("Summary updated");
}

async function initPerformanceChart(timeframe = '1M') {
    console.log("Initializing performance chart with timeframe:", timeframe);
    let interval, limit;
    switch (timeframe) {
        case '1D': interval = '5m'; limit = 288; break;
        case '7D': interval = '1h'; limit = 168; break;
        case '1M': interval = '1h'; limit = 24 * 15; break;
        case '3M': interval = '4h'; limit = 24 * 90 / 4; break;
        case '6M': interval = '12h'; limit = 24 * 180 / 12; break;
        case '1Y': interval = '1d'; limit = 365; break;
        case 'All': interval = '1w'; limit = 104; break;
        default: interval = '1h'; limit = 24 * 30;
    }
    try {
        const totalValues = [];
        const labels = [];
        for (const holding of portfolio) {
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: holding.symbol, interval, limit }
            });
            const klines = response.data;
            const values = klines.map(kline => holding.amount * parseFloat(kline[4]));
            if (labels.length === 0) {
                totalValues.push(...values);
                labels.push(...klines.map((_, i) => {
                    const date = new Date();
                    date.setHours(date.getHours() - i * (interval === '1h' ? 1 : interval === '4h' ? 4 : interval === '12h' ? 12 : interval === '1d' ? 24 : 168));
                    return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
                }));
            } else {
                totalValues.forEach((val, i) => totalValues[i] += values[i]);
            }
        }
        const perfCtx = document.getElementById('performanceChart').getContext('2d');
        const gradient = perfCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(158, 240, 26, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        if (perfChart) perfChart.destroy();
        perfChart = new Chart(perfCtx, {
            type: 'line',
            data: {
                labels: labels.reverse(),
                datasets: [{
                    label: `Portfolio Value (${selectedCurrency})`,
                    data: totalValues.reverse(),
                    borderColor: '#9EF01A',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#9EF01A',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: value => `${currencySymbols[selectedCurrency] || selectedCurrency}${value.toFixed(0)}`
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 45, 0.8)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#e2e8f0',
                        borderColor: '#4b5e6e',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 4
                    }
                }
            }
        });
        const returns = totalValues.length > 1 ? ((totalValues[totalValues.length - 1] - totalValues[0]) / totalValues[0] * 100).toFixed(2) : 0;
        document.getElementById('return-30d').textContent = `${returns >= 0 ? '+' : ''}${returns}%`;
        document.getElementById('return-30d').classList.remove('text-accent', 'text-red-400');
        document.getElementById('return-30d').classList.add(`text-${returns >= 0 ? 'accent' : 'red-400'}`);
        document.getElementById('max-drawdown').textContent = '0.0%'; // Placeholder, requires actual calculation
        document.getElementById('volatility').textContent = Math.abs(parseFloat(returns)) > 10 ? 'High' : Math.abs(parseFloat(returns)) > 5 ? 'Medium' : 'Low';
        console.log("Performance chart initialized");
    } catch (error) {
        console.error('Error initializing performance chart:', error);
    }
}

async function removeHolding(index) {
    console.log("Removing holding at index:", index);
    portfolio.splice(index, 1);
    await fetchPrices();
    await initPerformanceChart();
}

async function editHolding(index) {
    console.log("Editing holding at index:", index);
    const holding = portfolio[index];
    document.getElementById('coin-name').value = holding.symbol;
    document.getElementById('coin-amount').value = holding.amount;
    document.getElementById('purchase-price').value = holding.purchasePrice.toFixed(2);
    document.getElementById('date-acquired').value = new Date().toISOString().split('T')[0];
    await removeHolding(index);
    updatePurchasePrice();
}

const updatePurchasePrice = debounce(async () => {
    const symbol = document.getElementById('coin-name').value;
    const date = document.getElementById('date-acquired').value;
    if (symbol && date) {
        const price = await fetchHistoricalPrice(symbol, date);
        if (price !== null) {
            document.getElementById('purchase-price').value = price.toFixed(2);
            console.log("Purchase price updated:", price);
        } else {
            document.getElementById('purchase-price').value = '';
            alert('Historical price not available for the selected date.');
            console.log("Historical price not available");
        }
    }
}, 500);

// Smart Trend Calculation (RSI + SMA) — Pure JS, no external library
function calculateSmartTrend(prices) {
    console.log("📊 calculateSmartTrend called, data points:", prices.length);

    if (prices.length < 20) {
        console.warn("⚠️ Not enough data for indicators, need 20+ got", prices.length);
        return { trendFactor: 1, lastRSI: 50 };
    }

    // --- Pure JS RSI (Wilder's smoothing, period=14) ---
    const period = 14;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) gains += change;
        else losses -= change;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const lastRSI = 100 - (100 / (1 + rs));

    // --- Pure JS SMA (period=14) ---
    const smaSlice = prices.slice(-period);
    const lastSMA = smaSlice.reduce((a, b) => a + b, 0) / period;
    const prevSlice = prices.slice(-(period + 1), -1);
    const prevSMA = prevSlice.reduce((a, b) => a + b, 0) / period;

    let trendFactor;

    // RSI Logic (Reversal detection)
    if (lastRSI < 30) trendFactor = 1.02; // Oversold -> Expect Pump
    else if (lastRSI > 70) trendFactor = 0.98; // Overbought -> Expect Drop
    else {
        // Follow SMA Trend
        const smaSlope = (lastSMA - prevSMA) / prevSMA;
        trendFactor = 1 + smaSlope;
    }

    console.log("📈 RSI:", lastRSI.toFixed(1), "| SMA:", lastSMA.toFixed(2), "| Trend:", trendFactor.toFixed(4));
    return { trendFactor, lastRSI };
}

async function updatePredictionChart(symbol) {
    console.log(`Updating prediction chart for ${symbol}...`);
    try {
        // Fetch 60 days of history (Need more for RSI/SMA calculation)
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol, interval: '1d', limit: 60 }
        });
        const history = response.data.map(k => parseFloat(k[4])); // Close prices
        const { trendFactor, lastRSI } = calculateSmartTrend(history); // Use smart trend logic

        // Project next 7 days
        const labels = [];
        const data = [];
        const today = new Date();
        const lastPrice = history[history.length - 1];

        // Add last historical point
        labels.push('Today');
        data.push(lastPrice);

        let currentPrice = lastPrice;
        for (let i = 1; i <= 7; i++) {
            currentPrice = currentPrice * trendFactor;
            data.push(currentPrice);

            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            labels.push(futureDate.toLocaleString('en-US', { weekday: 'short' }));
        }

        // Update Chart
        if (predChart) {
            predChart.data.labels = labels;
            predChart.data.datasets[0].data = data;
            predChart.data.datasets[0].label = `Smart Forecast (${symbol})`;
            const signalColor = lastRSI > 70 ? '#ef4444' : lastRSI < 30 ? '#9ef01a' : '#3b82f6';
            predChart.data.datasets[0].borderColor = signalColor;
            predChart.data.datasets[0].pointBackgroundColor = signalColor;
            predChart.update();
        }

        // Update Title & Tooltip
        document.getElementById('prediction-title').textContent = `${symbol.replace('USDT', '')} Smart Forecast`;
        const rsiStatus = lastRSI > 70 ? 'Overbought ⚠️' : lastRSI < 30 ? 'Oversold 🟢' : 'Neutral';
        const rsiColor = lastRSI > 70 ? 'text-red-400' : lastRSI < 30 ? 'text-accent' : 'text-blue-400';
        const tooltipContent = document.querySelector('.cursor-help .absolute');
        if (tooltipContent) {
            tooltipContent.innerHTML = `
                <p class="mb-1 font-bold text-white">Smart Analysis:</p>
                <p>RSI(14): <span class="${rsiColor} font-bold">${lastRSI.toFixed(1)} (${rsiStatus})</span></p>
                <p class="mt-1">Combines RSI + SMA for trend detection.</p>
            `;
        }

    } catch (error) {
        console.error("Error updating prediction chart:", error);
    }
}

async function fetchCryptoNews() {
    try {
        const newsFeed = document.getElementById('news-feed');
        // Show Skeletons if empty or refreshing
        newsFeed.innerHTML = Array(6).fill(0).map(() => `
            <div class="news-card-enhanced animate-pulse">
                <div class="news-card-img skeleton" style="height:160px;border-radius:12px 12px 0 0"></div>
                <div class="p-4 space-y-3">
                    <div class="skeleton skeleton-text w-3/4"></div>
                    <div class="skeleton skeleton-text w-full"></div>
                    <div class="skeleton skeleton-text w-1/2"></div>
                </div>
            </div>
        `).join('');

        const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
        console.log("Crypto News: ", response);
        const articles = response.data.Data.slice(0, 12);
        newsFeed.innerHTML = '';

        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'news-card-enhanced';

            // Time ago
            const published = new Date(article.published_on * 1000);
            const diffMs = Date.now() - published;
            const diffMins = Math.floor(diffMs / 60000);
            let timeString;
            if (diffMins < 1) timeString = 'Just now';
            else if (diffMins < 60) timeString = `${diffMins}m ago`;
            else if (diffMins < 1440) timeString = `${Math.floor(diffMins / 60)}h ago`;
            else timeString = `${Math.floor(diffMins / 1440)}d ago`;

            const imageUrl = article.imageurl || '';
            const categories = (article.categories || '').split('|').slice(0, 2);

            card.innerHTML = `
                <a href="${article.url}" target="_blank" rel="noopener" class="news-card-link">
                    ${imageUrl ? `<div class="news-card-img" style="background-image: url('${imageUrl}')">
                        <div class="news-card-img-overlay"></div>
                        <div class="news-card-badges">
                            ${categories.map(c => c.trim() ? `<span class="news-badge">${c.trim()}</span>` : '').join('')}
                        </div>
                    </div>` : `<div class="news-card-img news-card-img-placeholder">
                        <i class="fas fa-newspaper text-3xl text-gray-600"></i>
                        <div class="news-card-badges">
                            ${categories.map(c => c.trim() ? `<span class="news-badge">${c.trim()}</span>` : '').join('')}
                        </div>
                    </div>`}
                    <div class="news-card-body">
                        <h3 class="news-card-title">${article.title}</h3>
                        <p class="news-card-excerpt">${(article.body || '').substring(0, 100)}${(article.body || '').length > 100 ? '...' : ''}</p>
                        <div class="news-card-footer">
                            <span class="news-source-badge">
                                <i class="fas fa-rss text-accent text-[10px]"></i>
                                ${article.source}
                            </span>
                            <span class="news-time-badge">
                                <i class="far fa-clock"></i>
                                ${timeString}
                            </span>
                        </div>
                    </div>
                </a>
            `;
            newsFeed.appendChild(card);
        });

        document.getElementById('news-section').classList.remove('hidden');
    } catch (error) {
        console.error("Error fetching crypto news:", error);
        const newsFeed = document.getElementById('news-feed');
        newsFeed.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-3xl text-gray-600 mb-3"></i>
                <p class="text-gray-400">Unable to load news. <button onclick="fetchCryptoNews()" class="text-accent hover:underline">Try again</button></p>
            </div>
        `;
    }
}

// =============================================
// Theme Toggle (Dark / Light)
// =============================================
function getTheme() {
    const saved = localStorage.getItem('ct_theme');
    if (saved) return saved;
    // System-based default
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
}

// Apply theme immediately to prevent flash
applyTheme(getTheme());

// ============================================
// Price Animation Helper — per-digit rolling
// ============================================
function animatePrice(element, oldVal, newVal) {
    if (!element || oldVal === newVal) return;
    const direction = newVal > oldVal ? 'up' : 'down';
    const oldStr = element.textContent;
    const newStr = typeof newVal === 'string' ? newVal : formatCurrency(newVal);
    if (oldStr === newStr) return;

    // Pad to same length
    const maxLen = Math.max(oldStr.length, newStr.length);
    const oldPad = oldStr.padStart(maxLen);
    const newPad = newStr.padStart(maxLen);

    let html = '';
    for (let i = 0; i < maxLen; i++) {
        if (oldPad[i] !== newPad[i]) {
            html += `<span class="price-tick-${direction}" style="display:inline-block">${newPad[i]}</span>`;
        } else {
            html += newPad[i];
        }
    }
    element.innerHTML = html;
}

// ============================================
// Binance WebSocket — Live Prices
// ============================================
let binanceWs = null;
const livePrices = {};

function initBinanceWebSocket() {
    if (binanceWs) binanceWs.close();
    const symbols = portfolio.map(h => h.symbol.toLowerCase());
    if (symbols.length === 0) return;

    binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

    binanceWs.onmessage = (event) => {
        const tickers = JSON.parse(event.data);
        let updated = false;
        for (const ticker of tickers) {
            const sym = ticker.s; // e.g. 'ETHUSDT'
            if (!symbols.includes(sym.toLowerCase())) continue;
            const newPrice = parseFloat(ticker.c);
            const oldPrice = livePrices[sym] || newPrice;
            livePrices[sym] = newPrice;

            // Update table row
            const rows = document.querySelectorAll('#portfolio-body tr');
            portfolio.forEach((holding, idx) => {
                if (holding.symbol !== sym || !rows[idx]) return;
                const cells = rows[idx].querySelectorAll('td');
                if (!cells[2] || !cells[3]) return;

                // Price cell
                animatePrice(cells[2], oldPrice, newPrice);
                cells[2].textContent = formatCurrency(newPrice);

                // Value cell
                const newValue = holding.amount * newPrice;
                cells[3].textContent = formatCurrency(newValue);

                updated = true;
            });
        }

        // Debounce summary updates
        if (updated && !window._wsSummaryPending) {
            window._wsSummaryPending = true;
            setTimeout(() => {
                updateSummaryFromLive();
                window._wsSummaryPending = false;
            }, 2000);
        }
    };

    binanceWs.onclose = () => {
        console.log('🔌 Binance WS closed, reconnecting in 3s...');
        setTimeout(initBinanceWebSocket, 3000);
    };

    binanceWs.onerror = (err) => {
        console.error('Binance WS error:', err);
        binanceWs.close();
    };

    binanceWs.onopen = () => console.log('✅ Binance WebSocket connected');
}

function updateSummaryFromLive() {
    let totalValue = 0;
    for (const holding of portfolio) {
        const price = livePrices[holding.symbol] || holding.purchasePrice;
        totalValue += holding.amount * price;
    }
    const el = document.getElementById('portfolio-value');
    if (el) {
        const oldVal = parseFloat(el.textContent.replace(/[^0-9.-]/g, ''));
        animatePrice(el, oldVal, totalValue);
        el.textContent = formatCurrency(totalValue);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded");

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const current = getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('ct_theme', next);
        applyTheme(next);
        console.log("🎨 Theme changed to:", next);
    });

    const predChartContext = document.getElementById('predictionChart').getContext('2d');
    predChart = new Chart(predChartContext, {
        type: 'line',
        data: {
            labels: ['Now', '1D', '3D', '7D', '15D', '30D'],
            datasets: [{
                label: 'Predicted Price',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#9EF01A',
                borderWidth: 2,
                pointBackgroundColor: '#9EF01A',
                pointRadius: 4,
                pointHoverRadius: 7,
                tension: 0.3,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: value => `${currencySymbols[selectedCurrency] || selectedCurrency}${value.toFixed(2)}`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
    console.log("Prediction chart initialized");

    // Settings Modal Logic
    const settingsModal = document.getElementById('settings-modal');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsClose = document.getElementById('settings-close');
    const saveSettingsvBtn = document.getElementById('save-settings');
    const chatSettingsBtn = document.getElementById('chat-settings-btn'); // From Chat Modal

    function openSettings() {
        settingsModal?.classList.remove('hidden');
    }

    function closeSettings() {
        settingsModal?.classList.add('hidden');
    }

    settingsToggle?.addEventListener('click', openSettings);
    settingsClose?.addEventListener('click', closeSettings);
    saveSettingsvBtn?.addEventListener('click', () => {
        // Delegate saving to AI client
        if (window.aiClient) {
            window.aiClient.saveSettings();
            console.log("✅ Settings saved via AIClient");
        }
        closeSettings();
    });

    chatSettingsBtn?.addEventListener('click', () => {
        document.getElementById('ai-chat-modal').classList.add('hidden');
        openSettings();
    });

    // Close on outside click
    settingsModal?.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    document.getElementById('menu-toggle')?.addEventListener('click', function () {
        console.log("Sidebar toggle clicked");
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (event) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menu-toggle');

        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('open') &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    });

    document.getElementById('ai-chat-toggle')?.addEventListener('click', function () {
        console.log("Opening AI chat modal");
        document.getElementById('ai-chat-modal').classList.remove('hidden');
    });

    document.getElementById('ai-chat-close')?.addEventListener('click', function () {
        console.log("Closing AI chat modal");
        document.getElementById('ai-chat-modal').classList.add('hidden');
    });

    document.getElementById('ai-chat-modal')?.addEventListener('click', function (event) {
        if (event.target === this) {
            console.log("Closing AI chat modal via overlay click");
            this.classList.add('hidden');
        }
    });

    const updateCurrency = async () => {
        selectedCurrency = document.getElementById('currency-selector')?.value || document.getElementById('currency-selector-mobile')?.value || 'USD';
        console.log("Currency changed to:", selectedCurrency);
        await fetchPrices();
        await initPerformanceChart();
        updatePurchasePrice();
    };

    document.getElementById('currency-selector')?.addEventListener('change', updateCurrency);
    document.getElementById('currency-selector-mobile')?.addEventListener('change', updateCurrency);

    document.getElementById('add-holding-form')?.addEventListener('submit', async function (event) {
        event.preventDefault();
        const symbol = document.getElementById('coin-name').value;
        const amount = parseFloat(document.getElementById('coin-amount').value);
        const purchasePrice = parseFloat(document.getElementById('purchase-price').value);
        const dateAcquired = document.getElementById('date-acquired').value;
        if (symbol && !isNaN(amount) && amount > 0 && !isNaN(purchasePrice) && purchasePrice > 0) {
            const name = tradingPairs.find(p => p.symbol === symbol)?.name || symbol.replace('USDT', '');
            const ticker = tradingPairs.find(p => p.symbol === symbol)?.ticker || name.substring(0, 3).toUpperCase();
            portfolio.push({ symbol, name, ticker, amount, purchasePrice });
            await fetchPrices();
            await initPerformanceChart();
            this.reset();
            console.log("Holding added:", { symbol, name, ticker, amount, purchasePrice });
        } else {
            alert('Please enter valid values for coin, amount, and price.');
            console.log("Invalid holding data");
        }
    });

    document.getElementById('coin-name')?.addEventListener('change', updatePurchasePrice);
    document.getElementById('date-acquired')?.addEventListener('change', updatePurchasePrice);

    document.getElementById('refresh-data')?.addEventListener('click', async function () {
        console.log("Fetching...");
        this.innerHTML = '<div class="loading-spinner mr-2"></div> Refreshing...';
        this.disabled = true;
        await fetchPrices();
        await initPerformanceChart();
        this.innerHTML = '<i class="fas fa-sync mr-2"></i> Refresh Data';
        this.disabled = false;
        console.log("Data refreshed");
    });

    document.getElementById('export-csv')?.addEventListener('click', function () {
        console.log("Exporting portfolio...");
        const csv = ['Symbol,Name,Ticker,Amount,PurchasePrice'];
        portfolio.forEach(holding => {
            csv.push(`${holding.symbol},${holding.name},${holding.ticker},${holding.amount.toFixed(8)},${holding.purchasePrice.toFixed(2)}`);
        });
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolio.csv';
        a.click();
        URL.revokeObjectURL(url);
        console.log("Portfolio exported");
    });

    document.getElementById('runPrediction')?.addEventListener('click', async function () {
        const coin = document.getElementById('predict-coin').value;
        const aiKey = document.getElementById('ai-key').value;
        if (!aiKey) {
            alert('Please enter an AI key.');
            console.log("AI key missing");
            return;
        }
        console.log("Running prediction for:", coin);
        this.innerHTML = '<div class="loading-spinner mr-2"></div> Running prediction...';
        this.disabled = true;
        try {
            const response = await axios.get('https://api.binance.com/api/v3/ticker/price', { params: { symbol: coin } });
            const currentPrice = parseFloat(response.data.price);
            const predictedData = [currentPrice, currentPrice * 1.01, currentPrice * 1.03, currentPrice * 1.07, currentPrice * 1.10, currentPrice * 1.15];
            predChart.data.datasets[0].data = predictedData;
            predChart.data.datasets[0].borderDash = [];
            predChart.update();
            const coinName = tradingPairs.find(p => p.symbol === coin)?.name || coin.replace('USDT', '');
            document.getElementById('prediction-title').textContent = `${coinName} Prediction`;
            this.innerHTML = '<i class="fas fa-check mr-2"></i> Prediction Complete';
            console.log("Prediction completed successfully");
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-bolt mr-2"></i> Run Prediction';
                this.disabled = false;
            }, 1000);
        } catch (e) {
            console.error('Prediction failed:', e);
            this.innerHTML = '<i class="fas fa-times mr-2"></i> Error';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-bolt mr-2"></i> Run Prediction';
                this.disabled = false;
            }, 1000);
        }
    });

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('csvFile');
    dropzone?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', async function () {
        if (this.files.length > 0) {
            const fileName = this.files[0].name;
            dropzone.innerHTML = `
                <i class="fas fa-file-csv text-accent text-3xl mb-4"></i>
                <p class="text-gray-300 mb-2">${fileName}</p>
                <p class="text-gray-600 text-sm">Click to select another file</p>
            `;
            const reader = new FileReader();
            reader.onload = async function (e) {
                const text = e.target.result;
                const lines = text.split('\n').slice(1).filter(line => line.trim());
                for (const line of lines) {
                    const [symbol, name, ticker, amount, purchasePrice] = line.split(',').map(s => s.trim());
                    if (symbol && amount && purchasePrice) {
                        portfolio.push({ symbol, name, ticker, amount: parseFloat(amount), purchasePrice: parseFloat(purchasePrice) });
                    }
                }
                await fetchPrices();
                await initPerformanceChart();
                dropzone.innerHTML = `
                    <i class="fas fa-check-circle text-accent text-3xl mb-4"></i>
                    <p class="text-gray-300 mb-2">Processed Successfully!</p>
                    <p class="text-gray-600 text-sm">${lines.length} holdings imported</p>
                `;
                console.log(`${lines.length} holdings imported`);
            };
            reader.readAsText(this.files[0]);
        }
    });

    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            console.log("Timeframe changed to:", this.dataset.timeframe);
            document.querySelectorAll('.timeframe-btn').forEach(b => {
                b.classList.remove('border-accent', 'text-accent', 'border-b-2');
                b.classList.add('text-gray-400');
            });
            this.classList.add('border-b-2', 'border-accent', 'text-accent');
            this.classList.remove('text-gray-400');
            initPerformanceChart(this.dataset.timeframe);
        });
    });

    fetchTradingPairs().then(() => {
        fetchPrices().then(() => {
            initPerformanceChart();
            initBinanceWebSocket();
        });
        console.log("Initial data loaded");
    });

    fetchCryptoNews();
});