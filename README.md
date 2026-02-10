# 🪙 CryptoTracker Lite

> A modern, lightweight, and serverless cryptocurrency tracking dashboard powered by **PyScript** and **D3.js**.

[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://abhimanyus1997.github.io/cryptoTracker/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.x-blue.svg)](https://www.python.org/)
[![PyScript](https://img.shields.io/badge/PyScript-2023.11.1-orange)](https://pyscript.net/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## 🚀 Overview

**CryptoTracker** is a fully client-side web application designed to provide real-time cryptocurrency market data and portfolio management tools. By leveraging **PyScript**, it runs Python code directly in the browser, eliminating the need for a dedicated backend server for core logic.

The dashboard offers an intuitive interface to track live prices, visualize historical trends, and analyze market movements using interactive charts.

## ✨ Features

-   **Real-time Data Fetching**:
    -   Live prices for top cryptocurrencies (Bitcoin, Ethereum, BNB, Solana, etc.).
    -   Data sourced from robust APIs like **Coingecko** and **CoinCap**.
-   **Interactive Dashboard**:
    -   Clean and responsive UI built with **Bootstrap**.
    -   Dynamic charts powered by **D3.js** and **Chart.js**.
-   **Client-Side Python**:
    -   Complex data processing handled directly in the browser using **PyScript**.
    -   No server-side Python installation required for the end user.
-   **Serverless Architecture**:
    -   Hosted entirely on GitHub Pages.
    -   Zero backend maintenance.

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat-square&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat-square&logo=javascript&logoColor=%23F7DF1E) | Core structure and styling. |
| **Logic** | ![Python](https://img.shields.io/badge/python-3670A0?style=flat-square&logo=python&logoColor=ffdd54) ![PyScript](https://img.shields.io/badge/PyScript-000000?style=flat-square&logo=pyscript&logoColor=white) | Browser-based Python execution. |
| **Visualization** | ![D3.js](https://img.shields.io/badge/d3.js-F9A03C?style=flat-square&logo=d3.js&logoColor=white) ![Chart.js](https://img.shields.io/badge/chart.js-F5788D?style=flat-square&logo=chart.js&logoColor=white) | Interactive data visualization. |
| **Framework** | ![Bootstrap](https://img.shields.io/badge/bootstrap-%23563D7C.svg?style=flat-square&logo=bootstrap&logoColor=white) | Responsive design system. |

## 🏁 Getting Started

Since this is a client-side application, you can run it using any static file server.

### Prerequisites

-   A modern web browser (Chrome, Firefox, Edge, Safari).
-   Python 3 (optional, for local serving).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/abhimanyus1997/cryptoTracker.git
    cd cryptoTracker
    ```

2.  **Run a local server**:
    You can use Python's built-in HTTP server:
    ```bash
    python -m http.server 8000
    ```

3.  **Access the App**:
    Open your browser and navigate to `http://localhost:8000`.

## 💡 Usage

1.  **Dashboard**: View live prices of top coins immediately upon loading.
2.  **Charts**: Interact with the graphs to see historical price movements.
3.  **Python Logic**: Observe real-time computations performed by PyScript in the browser console or specific UI elements.

## 📂 Project Structure

```
cryptoTracker/
├── assets/             # Images and static assets
├── css/                # Stylesheets (Bootstrap, custom CSS)
├── js/                 # JavaScript files (Charts, Logic)
├── python/             # Python scripts run by PyScript
│   ├── main.py         # Core Python logic
│   └── pyscript.json   # PyScript configuration
├── index.html          # Main entry point
└── README.md           # Documentation
```

## 🗺 Roadmap

- [ ] Add portfolio management features.
- [ ] Implement user settings (currency preference, theme).
- [ ] Add more advanced technical indicators.
- [ ] optimize PyScript loading time.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

**Abhimanyu** - [GitHub Profile](https://github.com/abhimanyus1997)

Project Link: [https://github.com/abhimanyus1997/cryptoTracker](https://github.com/abhimanyus1997/cryptoTracker)
