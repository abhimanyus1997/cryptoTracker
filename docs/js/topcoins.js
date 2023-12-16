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

// Function to display the fetched data in the HTML
async function displayTrendingCoins() {
    const trendingCoins = await fetchTrendingCoins();
    const coinList = d3.select('#d3');

    if (trendingCoins && trendingCoins.coins) {
        coinList.append('h2').text('Trending Coins');
        const ul = coinList.append('ul');
        trendingCoins.coins.forEach((coin) => {
            ul.append('li').text(`${coin.item.name} - ${coin.item.symbol}`);
        });
    }
}

// Call the function to display trending coins when the page loads
displayTrendingCoins();