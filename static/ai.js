import * as webllm from "https://esm.run/@mlc-ai/web-llm";

console.log("🧠 ai.js loaded");

/*************** WebLLM logic ***************/
const messages = [
    {
        content: `You are a crypto financial AI analyst created by Abhimanyu Singh, specializing in cryptocurrency markets.
You provide data-driven insights on crypto prices, market trends, portfolio optimization,
risk management, and technical analysis. You explain concepts clearly, back up opinions
with data when possible, and avoid giving direct financial advice. Always remind users
that crypto is volatile and they should do their own research.`,
        role: "system",
    },
];

const availableModels = webllm.prebuiltAppConfig.model_list.map((m) => m.model_id);
let selectedModel = "SmolLM2-135M-lnstruct-qOf16-ML";

// Callback function for initializing progress
function updateEngineInitProgressCallback(report) {
    console.log("Initializing model:", report.progress);
    document.getElementById("download-status").textContent = report.text;
}

// Create engine instance
const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
    document.getElementById("download-status").classList.remove("hidden");
    selectedModel = document.getElementById("model-selection").value;
    const config = {
        temperature: 0.8,
        top_p: 0.9,
        max_tokens: 512,
    };
    await engine.reload(selectedModel, config);
    document.getElementById("send").disabled = false;
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
    try {
        let curMessage = "";
        let usage;

        const completion = await engine.chat.completions.create({
            stream: true,
            messages,
            stream_options: { include_usage: true },
        });

        for await (const chunk of completion) {
            const curDelta = chunk.choices[0]?.delta.content;
            if (curDelta) {
                curMessage += curDelta;
            }
            if (chunk.usage) {
                usage = chunk.usage;
            }
            onUpdate(curMessage);
        }

        const finalMessage = curMessage; // Final message from stream
        onFinish(finalMessage, usage);
    } catch (err) {
        onError(err);
    }
}

/*************** Portfolio Formatting Logic ***************/
document.addEventListener("DOMContentLoaded", function () {
    // Wait for the portfolio to be available
    const checkPortfolio = setInterval(() => {
        if (window.portfolio && window.portfolio.length > 0) {
            clearInterval(checkPortfolio);
            console.log("✅ Portfolio is ready:", window.portfolio);

            // Now initialize AI UI bindings
            availableModels.forEach((modelId) => {
                const option = document.createElement("option");
                option.value = modelId;
                option.textContent = modelId;
                document.getElementById("model-selection").appendChild(option);
            });

            document.getElementById("model-selection").value = selectedModel;

            document.getElementById("download").addEventListener("click", function () {
                initializeWebLLMEngine().then(() => {
                    document.getElementById("send").disabled = false;
                });
            });

            document.getElementById("ai-chat-toggle")?.addEventListener("click", openModal);
            document.getElementById("ai-chat-toggle-mobile")?.addEventListener("click", openModal);
            document.getElementById("ai-chat-close")?.addEventListener("click", () =>
                document.getElementById("ai-chat-modal").classList.add("hidden")
            );
            document.getElementById("send").addEventListener("click", onMessageSend);
        }
    }, 500); // Check every 500ms
});

function getPortfolioSummaryWithPrices(prices) {
    let summary = `Here is your updated portfolio:\n\n`;
    summary += "| Symbol   | Name         | Ticker | Amount      | Purchase | Current | P/L (%) |\n";
    summary += "|----------|--------------|--------|-------------|----------|---------|---------|\n";

    portfolio.forEach(holding => {
        const price = prices[holding.symbol] || holding.purchasePrice;
        const roi = ((price - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(2);
        summary += `| ${holding.symbol.padEnd(8)} | ${holding.name.padEnd(12)} | ${holding.ticker.padEnd(6)} | ${holding.amount.toFixed(8).padEnd(11)} | $${holding.purchasePrice.toFixed(2).padEnd(8)} | $${price.toFixed(2).padEnd(7)} | ${roi.padStart(6)}% |\n`;
    });

    return summary;
}

/*************** UI logic ***************/
function onMessageSend() {
    const input = document.getElementById("user-input").value.trim();
    if (!input) return;

    console.log("📥 User Input:", input);
    console.log("📊 Current Portfolio:", window.portfolio);

    let messageContent = input;

    // Always include portfolio data in the prompt
    const portfolioData = formatPortfolioData();  // This returns the Markdown-style table
    console.log("📊 Sending full portfolio data:\n", portfolioData);

    // Build the final prompt with clear instructions
    messageContent = `
You are a crypto financial analyst AI created by Abhimanyu Singh.
Below is the user's current cryptocurrency portfolio:

${portfolioData}

User Query: ${input}

Please analyze the query and use the portfolio data as needed.
If the query involves calculations (e.g., ROI, profit/loss, performance), make sure to compute those using the provided values.
`;

    const message = {
        content: messageContent,
        role: "user",
    };

    messages.push(message);
    appendMessage(message);

    document.getElementById("user-input").value = "";
    document.getElementById("user-input").setAttribute("placeholder", "Generating...");

    const aiMessage = {
        content: "typing...",
        role: "assistant",
    };
    appendMessage(aiMessage);

    document.getElementById("send").disabled = true;

    streamingGenerating(
        messages,
        updateLastMessage,
        onFinishGenerating,
        console.error
    );
}

function onFinishGenerating(finalMessage, usage) {
    const signedMessage = `${finalMessage}\n\n— Abhimanyu's Bot | AI Crypto Financial Analyst\n*For informational purposes only.*`;
    updateLastMessage(signedMessage);
    document.getElementById("send").disabled = false;
    const usageText =
        `prompt_tokens: ${usage.prompt_tokens}, ` +
        `completion_tokens: ${usage.completion_tokens}, ` +
        `prefill: ${usage.extra.prefill_tokens_per_s.toFixed(4)} tokens/sec, ` +
        `decoding: ${usage.extra.decode_tokens_per_s.toFixed(4)} tokens/sec`;
    document.getElementById("chat-stats").classList.remove("hidden");
    document.getElementById("chat-stats").textContent = usageText;
}

function renderMarkdown(text) {
    return marked.parse(text); // Marked safely converts Markdown to HTML
}


function appendMessage(message) {
    const chatBox = document.getElementById("chat-box");
    const container = document.createElement("div");
    container.classList.add("message-container");

    const newMessage = document.createElement("div");
    newMessage.classList.add("message");

    if (message.role === "user") {
        container.classList.add("user");
    } else {
        container.classList.add("assistant");
    }

    // Render markdown into HTML
    newMessage.innerHTML = renderMarkdown(message.content);
    container.appendChild(newMessage);
    chatBox.appendChild(container);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
}

function updateLastMessage(content) {
    const chatBox = document.getElementById("chat-box");
    const messageContainers = chatBox.querySelectorAll(".message-container");
    const lastContainer = messageContainers[messageContainers.length - 1];
    const lastMessage = lastContainer.querySelector(".message");

    if (lastMessage) {
        lastMessage.innerHTML = renderMarkdown(content);
    }
}

/*************** UI binding ***************/
availableModels.forEach((modelId) => {
    const option = document.createElement("option");
    option.value = modelId;
    option.textContent = modelId;
    document.getElementById("model-selection").appendChild(option);
});

document.getElementById("model-selection").value = selectedModel;

document.getElementById("download").addEventListener("click", function () {
    initializeWebLLMEngine().then(() => {
        document.getElementById("send").disabled = false;
    });
});

document.getElementById("ai-chat-toggle")?.addEventListener("click", openModal);
document.getElementById("ai-chat-toggle-mobile")?.addEventListener("click", openModal);

function openModal() {
    initializeWebLLMEngine().then(() => {
        document.getElementById("ai-chat-modal").classList.remove("hidden");
    }).catch(err => {
        console.error("Failed to initialize WebLLM engine:", err);
    });
}

document.getElementById("ai-chat-close")?.addEventListener("click", () =>
    document.getElementById("ai-chat-modal").classList.add("hidden")
);

document.getElementById("send").addEventListener("click", onMessageSend);

document.getElementById('ai-chat-toggle-mobile').addEventListener('click', function () {
    document.getElementById('ai-chat-modal').classList.remove('hidden');
});