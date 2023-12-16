// Updated function to fetch Bitcoin historical data from CoinGecko API
async function fetchBitcoinHistoricalData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7');
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        const data = await response.json();
        return data.prices; // Assuming the 'prices' field contains the historical data
    } catch (error) {
        console.error('There was a problem fetching Bitcoin historical data:', error);
        return null;
    }
}

// Updated function to update chart area with historical Bitcoin data using ID
async function updateChartWithBitcoinData() {
    const chartCanvas = document.getElementById('bitcoin-chart');
    const bitcoinData = await fetchBitcoinHistoricalData();

    if (bitcoinData && chartCanvas) {
        const chart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: bitcoinData.map(entry => new Date(entry[0]).toLocaleDateString()), // Assuming timestamp is in milliseconds
                datasets: [{
                    label: 'Bitcoin Price (USD)',
                    fill: true,
                    data: bitcoinData.map(entry => entry[1]),
                    backgroundColor: 'rgba(247, 202, 24, 0.3)', // Yellowish background color
                    borderColor: 'rgba(247, 202, 24, 1)', // Yellowish border color
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

// Call the function to update the chart when the page loads or wherever needed
updateChartWithBitcoinData();
