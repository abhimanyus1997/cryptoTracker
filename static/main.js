let selectedCurrency = 'USD';
const currencySymbols = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
let portfolio = [
    { symbol: 'ETHUSDT', name: 'Ethereum', ticker: 'ETH', amount: 0.035, purchasePrice: 2197.02 },
    { symbol: 'AVAXUSDT', name: 'Avalanche', ticker: 'AVAX', amount: 0.816, purchasePrice: 22.08 },
    { symbol: 'SCRUSDT', name: 'Scroll', ticker: 'SCR', amount: 49.096, purchasePrice: 1.21 }
];
let tradingPairs = [];
const coinIcons = {
    'ETHUSDT': 'fa-ethereum text-blue-500',
    'AVAXUSDT': 'fa-circle text-blue-400',
    'SCRUSDT': 'fa-fire text-orange-400'
};
let availableCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
let perfChart = null;
let predChart = null;

console.log("Portfolio initialized:", portfolio);

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
    predictSelect.value = 'ETHUSDT';
    document.getElementById('prediction-title').textContent = 'ETH Prediction';
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

        const iconClass = coinIcons[holding.symbol] || 'fa-circle text-gray-400';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-4 px-4">
                <div class="flex items-center">
                    <div class="bg-gray-600 rounded-full p-2 mr-3">
                        <i class="fas ${iconClass} text-lg"></i>
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
    document.getElementById('portfolio-change').innerHTML = `
        <i class="fas fa-caret-${totalProfitPercent >= 0 ? 'up' : 'down'} mr-1"></i>
        ${totalProfitPercent >= 0 ? '+' : ''}${totalProfitPercent}% overall
    `;
    document.getElementById('portfolio-change').classList.remove('text-accent', 'text-red-400');
    document.getElementById('portfolio-change').classList.add(`text-${totalProfitPercent >= 0 ? 'accent' : 'red-400'}`);
    document.getElementById('total-holdings').textContent = `${portfolio.length} Assets`;
    document.getElementById('best-performer').textContent = `${bestCoin} ${bestChange >= 0 ? '+' : ''}${bestChange}%`;
    document.getElementById('best-performer').classList.remove('text-accent', 'text-red-400');
    document.getElementById('best-performer').classList.add(`text-${bestChange >= 0 ? 'accent' : 'red-400'}`);
    document.getElementById('worst-performer').textContent = `${worstCoin} ${worstChange >= 0 ? '+' : ''}${worstChange}%`;
    document.getElementById('worst-performer').classList.remove('text-accent', 'text-red-400');
    document.getElementById('worst-performer').classList.add(`text-${worstChange >= 0 ? 'accent' : 'red-400'}`);
    document.getElementById('change-value').textContent = formatCurrency(change24h);
    document.getElementById('change-value').classList.remove('text-accent', 'text-red-400');
    document.getElementById('change-value').classList.add(`text-${change24h >= 0 ? 'accent' : 'red-400'}`);
    document.getElementById('change-percent').innerHTML = `
        <i class="fas fa-caret-${change24h >= 0 ? 'up' : 'down'} mr-1"></i>
        ${change24hPercent >= 0 ? '+' : ''}${change24hPercent}% today
    `;
    document.getElementById('change-percent').classList.remove('text-accent', 'text-red-400');
    document.getElementById('change-percent').classList.add(`text-${change24h >= 0 ? 'accent' : 'red-400'}`);
    console.log("Summary updated");
}

async function initPerformanceChart(timeframe = '1M') {
    console.log("Initializing performance chart with timeframe:", timeframe);
    let interval, limit;
    switch (timeframe) {
        case '1M': interval = '1h'; limit = 24 * 30; break;
        case '3M': interval = '4h'; limit = 24 * 30 * 3 / 4; break;
        case '6M': interval = '12h'; limit = 24 * 30 * 6 / 12; break;
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
                    pointBackgroundColor: '#9EF01A',
                    pointRadius: 4,
                    pointHoverRadius: 7,
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

async function fetchCryptoNews() {
    try {
        const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
        console.log("Crypto News: ", response);
        const articles = response.data.Data.slice(0, 6);
        const newsFeed = document.getElementById('news-feed');
        newsFeed.innerHTML = '';

        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'news-card';

            const imageUrl = article.imageurl || 'https://via.placeholder.com/300x160.png?text=No+Image';
            card.innerHTML = `
                <div class="news-thumbnail" style="background-image: url('${imageUrl}')"></div>
                <div class="p-4">
                    <h3 class="news-title">${article.title}</h3>
                    <p class="news-source">Source: ${article.source}</p>
                    <p class="news-excerpt">${article.body.substring(0, 150)}...</p>
                    <a href="${article.url}" target="_blank" class="mt-2 inline-block text-accent hover:underline">Read more</a>
                </div>
            `;
            newsFeed.appendChild(card);
        });

        document.getElementById('news-section').classList.remove('hidden');
    } catch (error) {
        console.error("Error fetching crypto news:", error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded");

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

    document.getElementById('menu-toggle')?.addEventListener('click', function () {
        console.log("Hamburger menu clicked");
        const mobileMenu = document.getElementById('mobile-menu');
        mobileMenu.classList.toggle('hidden');
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
        fetchPrices().then(() => initPerformanceChart());
        console.log("Initial data loaded");
    });

    fetchCryptoNews();
});