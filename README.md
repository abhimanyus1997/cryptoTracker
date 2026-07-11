# CryptoTracker

A privacy-minded, static cryptocurrency portfolio dashboard with live market data, technical forecasts, CSV import, and an on-device AI analyst.

Live site: [cryptotracker.abhimanyu.fyi](https://cryptotracker.abhimanyu.fyi)

## Highlights

- Portfolio and DEX holding views with live Binance prices
- Performance charts, basic technical projections, CSV import, and CSV export
- Local WebGPU RAG: choose LiteRT Gemma or Qwen 3.5 models while retrieving relevant holdings, prices, ROI, and dashboard scope before answering
- Optional Gemini and Groq providers for users who prefer an API-backed assistant
- Static deployment on Vercel; no application backend or server-side database

## Local AI and RAG

The default AI provider is **Local WebGPU RAG**. It offers LiteRT-LM Gemma models and the [Qwen 3.5 0.8B LiteRT bundle](https://huggingface.co/GabrieleConte/Qwen3.5-0.8B-LiteRT) through WebGPU.

At query time, CryptoTracker builds small local documents from the holdings and the latest loaded prices. A lightweight lexical retriever selects the most relevant snippets, adds them to the model prompt, and the response cites them as `[1]`, `[2]`, and so on. The portfolio context and model inference remain in the browser.

Users can choose one of these local models in the chat panel:

| Model | First download | Use case |
| --- | ---: | --- |
| Gemma 4 E2B | about 2.6 GB | Default; best balance for most devices |
| Gemma 4 E4B | about 3.7 GB | Higher quality on high-memory devices |
| Qwen 3.5 0.8B LiteRT | about 1.2 GB | Multimodal LiteRT bundle; currently offered as a text-chat beta in the browser |

Use a recent Chrome or Edge build with hardware acceleration and WebGPU enabled. The first model load can take time; subsequent use may reuse browser-cached assets. These models are best suited to desktop or capable laptop devices.

The assistant is informational only and is not financial advice. It can explain the dashboard data, but it cannot guarantee price movements or execute trades.

## Run locally

CryptoTracker uses Vite for local development and production builds.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, then open the dashboard. Serve over `localhost` or HTTPS so WebGPU is available.

## Deploy to Vercel

```bash
vercel --prod
```

For `cryptotracker.abhimanyu.fyi`, attach the subdomain to the Vercel project and create the CNAME record Vercel provides. Make it the project’s primary domain if the `*.vercel.app` URL should redirect to it.

### Future GitHub Pages deployment

Vercel is the primary deployment target. If you later deploy to GitHub Pages, build with the repository base path and publish `dist/`:

```bash
VITE_BASE_PATH=/cryptoTracker/ npm run build
```

Set `VITE_BASE_PATH=/` for Vercel or a custom domain. The project does not include a GitHub Actions workflow, so GitHub Pages remains opt-in.

## Technology

- HTML, CSS, JavaScript, Tailwind CSS, Chart.js
- Binance public market-data API
- [LiteRT-LM](https://github.com/google-ai-edge/LiteRT) Web SDK (`@litert-lm/core`) and WebGPU
- [LiteRT Community web models](https://huggingface.co/collections/litert-community/web-llm-models) and [Qwen 3.5 0.8B LiteRT](https://huggingface.co/GabrieleConte/Qwen3.5-0.8B-LiteRT)
- Vercel static hosting

## Privacy

Local WebGPU RAG does not require an API key and does not send prompts or retrieved portfolio context to an application server. Optional Gemini and Groq modes send their prompts to the provider selected by the user; their API keys are stored in that browser’s local storage.

## License

MIT
