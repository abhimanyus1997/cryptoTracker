let selectedCurrency = 'USD';
const currencySymbols = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
let portfolio = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', ticker: 'BTC', amount: 0.573, purchasePrice: 35000 },
    { symbol: 'ETHUSDT', name: 'Ethereum', ticker: 'ETH', amount: 5.24, purchasePrice: 1900 },
    { symbol: 'ADAUSDT', name: 'Cardano', ticker: 'ADA', amount: 1840, purchasePrice: 0.35 },
    { symbol: 'SOLUSDT', name: 'Solana', ticker: 'SOL', amount: 15.2, purchasePrice: 22 }
];
let exchangeRates = { USD: 1 };
let tradingPairs = [];
const coinIcons = {
    'BTCUSDT': 'fa-bitcoin text-yellow-400',
    'ETHUSDT': 'fa-ethereum text-blue-500',
    'ADAUSDT': 'fa-circle text-blue-400',
    'SOLUSDT': 'fa-fire text-orange-400'
};
let availableCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
let perfChart = null;
let predChart = null;

console.log("Portfolio initialized", portfolio);

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

async function fetchExchangeRates(date = 'latest') {
    console.log("Fetching exchange rates...");
    try {
        const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/inr.json`;
        const response = await axios.get(url);
        const inrRates = response.data.inr;
        exchangeRates = Object.keys(inrRates).reduce((acc, curr) => {
            acc[curr.toUpperCase()] = 1 / inrRates[curr];
            return acc;
        }, {});
        const usdRate = exchangeRates.USD || 1;
        for (let curr of Object.keys(exchangeRates)) {
            exchangeRates[curr] = exchangeRates[curr] / usdRate;
        }
        availableCurrencies = Object.keys(exchangeRates).sort();
        populateCurrencySelector();
        console.log("Exchange rates fetched:", exchangeRates);
        return exchangeRates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return exchangeRates;
    }
}

function populateCurrencySelector() {
    const selector = document.getElementById('currency-selector');
    selector.innerHTML = '';
    const priorityCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
    priorityCurrencies.forEach(curr => {
        if (availableCurrencies.includes(curr)) {
            selector.innerHTML += `<option value="${curr}">${curr} (${currencySymbols[curr] || curr})</option>`;
        }
    });
    availableCurrencies.forEach(curr => {
        if (!priorityCurrencies.includes(curr)) {
            selector.innerHTML += `<option value="${curr}">${curr}</option>`;
        }
    });
    selector.value = availableCurrencies.includes(selectedCurrency) ? selectedCurrency : 'USD';
    selectedCurrency = selector.value;
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
        const priceUSD = response.data[0] ? parseFloat(response.data[0][4]) : null;
        if (priceUSD && selectedCurrency !== 'USD') {
            const rates = await fetchExchangeRates(date.split('T')[0]);
            return priceUSD * (rates[selectedCurrency] || 1);
        }
        console.log(`Historical price for ${symbol} on ${date}: ${priceUSD}`);
        return priceUSD;
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
        await fetchExchangeRates();
        updatePortfolio(prices);
        updateSummary(prices);
        console.log("Prices fetched successfully");
    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

function formatCurrency(value, currency) {
    const rate = exchangeRates[currency] || 1;
    const converted = value * rate;
    return `${currencySymbols[currency] || ''}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function updatePortfolio(prices) {
    console.log("Updating portfolio...");
    const tbody = document.getElementById('portfolio-body');
    tbody.innerHTML = '';
    portfolio.forEach((holding, index) => {
        const priceUSD = prices[holding.symbol] || holding.purchasePrice;
        const valueUSD = holding.amount * priceUSD;
        const change24h = prices[holding.symbol] ? ((priceUSD - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(2) : 0;
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
            <td class="py-4 px-4 text-right">${formatCurrency(priceUSD, selectedCurrency)}</td>
            <td class="py-4 px-4 text-right font-medium">${formatCurrency(valueUSD, selectedCurrency)}</td>
            <td class="py-4 px-4 text-right ${change24h >= 0 ? 'text-accent' : 'text-red-400'}">${change24h >= 0 ? '+' : ''}${change24h}%</td>
            <td class="py-4 px-4 text-center">
                <button class="text-blue-400 mr-2 hover:text-blue-500" onclick="editHolding(${index})"><i class="fas fa-edit"></i></button>
                <button class="text-red-400 hover:text-red-500" onclick="removeHolding(${index})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
    console.log("Portfolio updated");
}

function updateSummary(prices) {
    console.log("Updating summary...");
    const totalValueUSD = portfolio.reduce((sum, holding) => sum + holding.amount * (prices[holding.symbol] || holding.purchasePrice), 0);
    const changes = portfolio.map(holding => {
        const priceUSD = prices[holding.symbol] || holding.purchasePrice;
        return ((priceUSD - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(2);
    });
    const bestValue = Math.max(...changes);
    const worstValue = Math.min(...changes);
    const bestCoin = portfolio[changes.indexOf(bestValue.toString())]?.name || '--';
    const worstCoin = portfolio[changes.indexOf(worstValue.toString())]?.name || '--';
    const totalChangeUSD = portfolio.reduce((sum, holding) => {
        const priceUSD = prices[holding.symbol] || holding.purchasePrice;
        return sum + (priceUSD - holding.purchasePrice) * holding.amount;
    }, 0);
    document.getElementById('portfolio-value').textContent = formatCurrency(totalValueUSD, selectedCurrency);
    document.getElementById('portfolio-change').innerHTML = `
        <i class="fas fa-caret-${totalChangeUSD >= 0 ? 'up' : 'down'} mr-1"></i>
        ${(totalChangeUSD / totalValueUSD * 100).toFixed(2)}% today
    `;
    document.getElementById('portfolio-change').className = `mt-3 text-${totalChangeUSD >= 0 ? 'accent' : 'red-400'} text-sm`;
    document.getElementById('total-holdings').textContent = `${portfolio.length} assets`;
    document.getElementById('best-performer').textContent = `${bestCoin} ${bestValue >= 0 ? '+' : ''}${bestValue}%`;
    document.getElementById('worst-performer').textContent = `${worstCoin} ${worstValue >= 0 ? '+' : ''}${worstValue}%`;
    document.getElementById('change-value').textContent = `${totalChangeUSD >= 0 ? '+' : '-'}${formatCurrency(Math.abs(totalChangeUSD), selectedCurrency)}`;
    document.getElementById('change-percent').innerHTML = `
        <i class="fas fa-caret-${totalChangeUSD >= 0 ? 'up' : 'down'} mr-1"></i>
        ${(totalChangeUSD / totalValueUSD * 100).toFixed(2)}% gain
    `;
    document.getElementById('change-percent').className = `mt-3 text-${totalChangeUSD >= 0 ? 'accent' : 'red-400'} text-sm`;
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
        const totalValuesUSD = [];
        const labels = [];
        for (const holding of portfolio) {
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: holding.symbol, interval, limit }
            });
            const klines = response.data;
            const valuesUSD = klines.map(kline => holding.amount * parseFloat(kline[4]));
            if (labels.length === 0) {
                totalValuesUSD.push(...valuesUSD);
                labels.push(...klines.map((_, i) => {
                    const date = new Date();
                    date.setHours(date.getHours() - i * (interval === '1h' ? 1 : interval === '4h' ? 4 : interval === '12h' ? 12 : interval === '1d' ? 24 : 168));
                    return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
                }));
            } else {
                totalValuesUSD.forEach((val, i) => totalValuesUSD[i] += valuesUSD[i]);
            }
        }
        const totalValues = totalValuesUSD.map(value => value * (exchangeRates[selectedCurrency] || 1));
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
        const returns = ((totalValues[totalValues.length - 1] - totalValues[0]) / totalValues[0] * 100).toFixed(2);
        const maxDrawdown = Math.min(...totalValues.map((val, i) => i > 0 ? (val - totalValues[i - 1]) / totalValues[i - 1] * 100 : 0)).toFixed(2);
        document.getElementById('return-30d').textContent = `${returns >= 0 ? '+' : ''}${returns}%`;
        document.getElementById('return-30d').className = `font-bold text-${returns >= 0 ? 'accent' : 'red-400'}`;
        document.getElementById('max-drawdown').textContent = `${maxDrawdown}%`;
        document.getElementById('volatility').textContent = Math.abs(parseFloat(returns)) > 10 ? 'High' : Math.abs(parseFloat(returns)) > 5 ? 'Medium' : 'Low';
        console.log("Performance chart initialized");
    } catch (error) {
        console.error('Error fetching historical data:', error);
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
    document.getElementById('purchase-price').value = (holding.purchasePrice * (exchangeRates[selectedCurrency] || 1)).toFixed(2);
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

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded");

    // Initialize prediction chart
    const predChartContext = document.getElementById('predictionChart').getContext('2d');
    predChart = new Chart(predChartContext, {
        type: 'line',
        data: {
            labels: ['Now', '1D', '3D', '7D', '15D', '30D'],
            datasets: [{
                label: 'Predicted Price',
                data: [0, null, null, null, null, null],
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

    // Event listeners
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

    document.getElementById('currency-selector')?.addEventListener('change', async function () {
        selectedCurrency = this.value;
        console.log("Currency changed to:", selectedCurrency);
        await fetchPrices();
        await initPerformanceChart();
        updatePurchasePrice();
    });

    document.getElementById('add-holding-form')?.addEventListener('submit', async function (event) {
        event.preventDefault();
        const symbol = document.getElementById('coin-name').value;
        const amount = parseFloat(document.getElementById('coin-amount').value);
        let purchasePrice = parseFloat(document.getElementById('purchase-price').value);
        const dateAcquired = document.getElementById('date-acquired').value;
        if (symbol && !isNaN(amount) && amount > 0 && !isNaN(purchasePrice) && purchasePrice > 0) {
            if (selectedCurrency !== 'USD') {
                purchasePrice /= (exchangeRates[selectedCurrency] || 1);
            }
            const name = tradingPairs.find(p => p.symbol === symbol)?.name || symbol.replace('USDT', '');
            const ticker = tradingPairs.find(p => p.symbol === symbol)?.ticker || name.substring(0, 3).toUpperCase();
            portfolio.push({ symbol, name, ticker, amount, purchasePrice });
            await fetchPrices();
            await initPerformanceChart();
            this.reset();
            console.log("Holding added:", { symbol, name, ticker, amount, purchasePrice });
        } else {
            alert('Please enter valid values for coin, amount, and purchase price.');
            console.log("Invalid holding data");
        }
    });

    document.getElementById('coin-name')?.addEventListener('change', updatePurchasePrice);
    document.getElementById('date-acquired')?.addEventListener('change', updatePurchasePrice);

    document.getElementById('refresh-data')?.addEventListener('click', async function () {
        console.log("Refreshing data...");
        this.innerHTML = '<div class="loading-spinner mr-2"></div> Refreshing...';
        this.disabled = true;
        await fetchPrices();
        await initPerformanceChart();
        this.innerHTML = '<i class="fas fa-sync mr-2"></i> Refresh Data';
        this.disabled = false;
        console.log("Data refreshed");
    });

    document.getElementById('export-csv')?.addEventListener('click', function () {
        console.log("Exporting portfolio to CSV...");
        const csv = ['Symbol,Name,Ticker,Amount,Purchase Price'];
        portfolio.forEach(holding => {
            csv.push(`${holding.symbol},${holding.name},${holding.ticker},${holding.amount.toFixed(8)},${holding.purchasePrice.toFixed(2)}`);
        });
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolio-data.csv';
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
            const currentPriceUSD = parseFloat(response.data.price);
            const predictedDataUSD = [currentPriceUSD, currentPriceUSD * 1.01, currentPriceUSD * 1.03, currentPriceUSD * 1.07, currentPriceUSD * 1.10, currentPriceUSD * 1.15];
            const predictedData = predictedDataUSD.map(pUSD => pUSD * (exchangeRates[selectedCurrency] || 1));
            predChart.data.datasets[0].data = predictedData;
            predChart.data.datasets[0].borderDash = [];
            predChart.update();
            const coinName = tradingPairs.find(p => p.symbol === coin)?.name || coin.replace('USDT', '');
            document.getElementById('prediction-title').textContent = `${coinName} Prediction`;
            this.innerHTML = '<i class="fas fa-check mr-2"></i> Prediction Complete';
            console.log("Prediction completed for:", coinName);
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-bolt mr-2"></i> Run Prediction';
                this.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Error fetching prediction data:', error);
            this.innerHTML = '<i class="fas fa-times mr-2"></i> Error';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-bolt mr-2"></i> Run Prediction';
                this.disabled = false;
            }, 2000);
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
});

