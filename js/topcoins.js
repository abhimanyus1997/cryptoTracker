// Function to fetch data from the CoinGecko API
async function fetchTrendingCoins() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/search/trending');
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('There was a problem fetching the data:', error);
    }
}

// Function to replace HTML content with dynamically generated elements
async function replaceCoinListContent() {
    const trendingCoins = await fetchTrendingCoins();
    const coinList = document.getElementById('coin-list');

    if (trendingCoins && trendingCoins.coins) {
        for (let i = 0; i < 7 && i < trendingCoins.coins.length; i++) {
            const coin = trendingCoins.coins[i].item;

            // Create an image tag for each coin's SVG snapshot
            const coinChart = document.createElement('img');
            coinChart.setAttribute('src', coin.data.sparkline);
            coinChart.setAttribute('alt', `${coin.name} Chart`);

            // Create a container div for the coin details and the chart snapshot
            const coinContainer = document.createElement('div');
            coinContainer.classList.add('coin-container');

            // Create HTML for each coin details
            const coinDetails = `
                <h4 class="small fw-bold" id="coin-${i + 1}">
                    ${coin.name} (${coin.symbol})<span class="float-end">${coin.data.price}</span>
                </h4>
            `;

            // Append the coin details and chart snapshot to the container div
            coinContainer.innerHTML = coinDetails;
            coinContainer.appendChild(coinChart);

            // Append the container div to the coinList
            coinList.appendChild(coinContainer);
        }
    }
}

// Call the function to replace content when the page loads
replaceCoinListContent();
