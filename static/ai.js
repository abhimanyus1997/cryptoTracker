import * as webllm from "https://esm.run/@mlc-ai/web-llm";

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
let selectedModel = "Llama-3.1-8B-Instruct-q4f32_1-1k";

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

/*************** UI logic ***************/
function onMessageSend() {
    const input = document.getElementById("user-input").value.trim();
    const message = {
        content: input,
        role: "user",
    };
    if (!input) return;

    document.getElementById("send").disabled = true;

    messages.push(message);
    appendMessage(message);

    document.getElementById("user-input").value = "";
    document.getElementById("user-input").setAttribute("placeholder", "Generating...");

    const aiMessage = {
        content: "typing...",
        role: "assistant",
    };
    appendMessage(aiMessage);

    const onFinishGenerating = (finalMessage, usage) => {
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
    };

    streamingGenerating(
        messages,
        updateLastMessage,
        onFinishGenerating,
        console.error
    );
}

function escapeMarkdown(text) {
    return text.replace(/([_*\[\]()`~>#+\-=|{}!])/g, "\\$1");
}

function renderMarkdown(text) {
    // Escape HTML to prevent injection
    const escapedText = escapeMarkdown(text);

    // Bold: **text**
    let html = escapedText.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Code block: ```lang\n...\n```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code class='language-$1'>$2</code></pre>");

    // Inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

    // Unordered list: - item
    html = html.replace(/^-\s(.+)$/gm, "<ul><li>$1</li></ul>");

    // Links: [text](url)
    html = html.replace(/$$([^$$]+)$$$([^$$]+)$$/g, "<a href='$2' target='_blank'>$1</a>");

    return html;
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
    document.getElementById("ai-chat-modal").classList.remove("hidden");
}

document.getElementById("ai-chat-close")?.addEventListener("click", () =>
    document.getElementById("ai-chat-modal").classList.add("hidden")
);

document.getElementById("send").addEventListener("click", onMessageSend);