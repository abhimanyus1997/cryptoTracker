async function fetchCryptoHistoricalData(cryptoSymbol) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoSymbol}/market_chart?vs_currency=usd&days=7`);
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        const data = await response.json();
        return data.prices; // Assuming the 'prices' field contains the historical data
    } catch (error) {
        console.error(`There was a problem fetching ${cryptoSymbol} historical data:`, error);
        return null;
    }
}

async function updateChartWithCryptoData(cryptoSymbol, chartId, label, backgroundColor, borderColor) {
    const chartCanvas = document.getElementById(chartId);
    const cryptoData = await fetchCryptoHistoricalData(cryptoSymbol);

    if (cryptoData && chartCanvas) {
        const chart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: cryptoData.map(entry => new Date(entry[0]).toLocaleDateString()), // Assuming timestamp is in milliseconds
                datasets: [{
                    label: `${label} Price (USD)`,
                    fill: true,
                    data: cryptoData.map(entry => entry[1]),
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                }]
            },
            options: {
                maintainAspectRatio: false,
                legend: { display: false },
                scales: {
                    yAxes: [{
                        ticks: {
                            callback: function (value, index, values) {
                                return '$' + value.toFixed(3); // Display value till 3 decimal places
                            }
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'USD' // Label for Y-axis
                        }
                    }],
                    // Additional configurations for X-axis if needed
                }
            }
        });
    }
}

// Call the function to update the Bitcoin chart when the page loads or wherever needed
updateChartWithCryptoData('bitcoin', 'bitcoin-chart', 'Bitcoin', 'rgba(247, 202, 24, 0.3)', 'rgba(247, 202, 24, 1)');

// Call the function to update the Ethereum chart when the page loads or wherever needed
updateChartWithCryptoData('ethereum', 'ethereum-chart', 'Ethereum', 'rgba(125, 80, 247, 0.3)', 'rgba(125, 80, 247, 1)');
