console.log("🧠 ai.js loaded");

/**
 * CONFIGURATION & CONSTANTS
 */
let webllm = null; // Lazy loaded

const AI_CONFIG = {
    keys: {
        gemini: 'gemini_api_key',
        groq: 'groq_api_key',
        provider: 'ai_provider',
        model: 'webllm_model',
        geminiModel: 'gemini_model'
    },
    geminiModels: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (Fast)' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    groqModels: [
        { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (Powerful)' },
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Fast)' },
    ],
    newsKeywords: ['news', 'latest', 'headlines', 'happening', 'update', 'recent'],
    newsAPI: 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN'
};

class AIClient {
    constructor() {
        this.provider = localStorage.getItem(AI_CONFIG.keys.provider) || 'gemini';
        this.geminiKey = localStorage.getItem(AI_CONFIG.keys.gemini) || '';
        // API keys are loaded from local storage to avoid exposing them in the code.
        this.groqKey = localStorage.getItem(AI_CONFIG.keys.groq) || '';
        this.webllmModel = localStorage.getItem(AI_CONFIG.keys.model) || "SmolLM2-135M-Instruct-q0f16-MLC";
        this.geminiModel = localStorage.getItem(AI_CONFIG.keys.geminiModel) || 'gemini-2.5-flash';
        this.groqModel = localStorage.getItem('groq_model');
        if (!this.groqModel || this.groqModel === 'gemma2-9b-it' || this.groqModel === 'llama-3.3-70b-versatile') {
            this.groqModel = 'openai/gpt-oss-120b';
            localStorage.setItem('groq_model', this.groqModel);
        }

        this.webllmEngine = null;
        this.chatHistory = [];
        this.isGenerating = false;

        console.log("🤖 AIClient init | Provider:", this.provider, "| Gemini model:", this.geminiModel);
        this.initUI();
    }

    initUI() {
        console.log("🔌 AIClient.initUI() starting...");

        this.ui = {
            providerSelect: document.getElementById('ai-provider'),
            providerBadge: document.getElementById('chat-provider-badge'),
            settingsPanel: document.getElementById('chat-settings-panel'),
            settingsToggle: document.getElementById('chat-settings-toggle'),
            webllmControls: document.getElementById('webllm-controls'),
            geminiInput: document.getElementById('gemini-key'),
            groqInput: document.getElementById('groq-key'),
            modelSelect: document.getElementById('model-selection'),
            downloadBtn: document.getElementById('download'),
            statusText: document.getElementById('download-status'),
            chatModal: document.getElementById('ai-chat-modal'),
            chatBox: document.getElementById('chat-box'),
            chatStats: document.getElementById('chat-stats'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send'),
        };

        if (!this.ui.providerSelect) { console.error("❌ #ai-provider not found"); return; }
        if (!this.ui.chatBox) { console.error("❌ #chat-box not found"); return; }
        if (!this.ui.sendBtn) { console.error("❌ #send button not found"); return; }

        console.log("✅ All critical UI elements found");

        // Set initial values
        this.ui.providerSelect.value = this.provider;
        if (this.ui.geminiInput) this.ui.geminiInput.value = this.geminiKey;
        if (this.ui.groqInput) this.ui.groqInput.value = this.groqKey;
        this.updateProviderBadge();
        this.updateUIState();

        // --- Settings Toggle (collapsible) ---
        this.ui.settingsToggle?.addEventListener('click', () => {
            this.ui.settingsPanel?.classList.toggle('open');
        });

        // --- Provider Selection ---
        this.ui.providerSelect.addEventListener('change', (e) => {
            this.provider = e.target.value;
            localStorage.setItem(AI_CONFIG.keys.provider, this.provider);
            console.log("🔄 Provider changed to:", this.provider);
            this.updateProviderBadge();
            this.updateUIState();
        });


        // --- WebLLM: Lazy load models when provider is selected ---
        this.ui.downloadBtn?.addEventListener('click', () => this.initWebLLM());

        // Chat Actions
        this.ui.sendBtn.addEventListener('click', () => this.sendMessage());
        this.ui.userInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isGenerating) this.sendMessage();
        });

        // Modal Toggles
        document.getElementById("ai-chat-toggle")?.addEventListener("click", () => this.openModal());
        document.getElementById("ai-chat-toggle-mobile")?.addEventListener("click", () => this.openModal());
        document.getElementById("ai-chat-close")?.addEventListener("click", () => this.ui.chatModal.classList.add("hidden"));

        // Chat settings → open main Settings
        document.getElementById("chat-settings-btn")?.addEventListener("click", () => {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden');
        });

        console.log("✅ AIClient UI initialized successfully");
    }

    updateProviderBadge() {
        if (!this.ui.providerBadge) return;
        const labels = { gemini: 'Gemini', groq: 'Groq', webllm: 'WebLLM' };
        this.ui.providerBadge.textContent = labels[this.provider] || this.provider;
    }


    saveSettings() {
        const geminiInput = document.getElementById('gemini-key');
        const groqInput = document.getElementById('groq-key');
        const providerSelect = document.getElementById('ai-provider-select');
        const modelSelect = document.getElementById('ai-model-select');

        if (geminiInput) {
            this.geminiKey = geminiInput.value.trim();
            localStorage.setItem(AI_CONFIG.keys.gemini, this.geminiKey);
        }
        if (groqInput) {
            this.groqKey = groqInput.value.trim();
            localStorage.setItem(AI_CONFIG.keys.groq, this.groqKey);
        }
        if (providerSelect) {
            this.provider = providerSelect.value;
            localStorage.setItem(AI_CONFIG.keys.provider, this.provider);
        }
        if (modelSelect && modelSelect.value) {
            if (this.provider === 'gemini') {
                this.geminiModel = modelSelect.value;
                localStorage.setItem(AI_CONFIG.keys.geminiModel, this.geminiModel);
            } else if (this.provider === 'groq') {
                this.groqModel = modelSelect.value;
                localStorage.setItem('groq_model', this.groqModel);
            } else if (this.provider === 'webllm') {
                this.webllmModel = modelSelect.value;
                localStorage.setItem(AI_CONFIG.keys.model, this.webllmModel);
            }
        }

        this.updateUIState();
        console.log("💾 Settings saved | Provider:", this.provider,
            "| Gemini key:", this.geminiKey ? '***set***' : 'empty',
            "| Groq key:", this.groqKey ? '***set***' : 'empty',
            "| Model:", modelSelect?.value || 'N/A');
    }

    updateUIState() {
        if (this.provider === 'webllm') {
            this.ui.webllmControls?.classList.remove('hidden');
            this.ui.sendBtn.disabled = !this.webllmEngine;
        } else {
            this.ui.webllmControls?.classList.add('hidden');
            if (this.provider === 'gemini') {
                this.ui.sendBtn.disabled = !this.geminiKey;
            } else if (this.provider === 'groq') {
                this.ui.sendBtn.disabled = !this.groqKey;
            }
        }
        console.log("🔧 UI state | Provider:", this.provider, "| Send enabled:", !this.ui.sendBtn.disabled);
    }

    openModal() {
        this.ui.chatModal.classList.remove("hidden");
        if (this.provider === 'webllm') {
            this.loadWebLLMModelList();
            if (!this.webllmEngine) {
                this.ui.statusText?.classList.remove('hidden');
                if (this.ui.statusText) this.ui.statusText.textContent = "Select a model and click Load to start.";
            }
        }
        // Focus input
        setTimeout(() => this.ui.userInput?.focus(), 100);
    }

    /**
     * Lazily load WebLLM library and populate model list
     */
    async loadWebLLMModelList() {
        if (webllm) return;
        if (!this.ui.modelSelect) return;

        try {
            console.log("⬇️ Lazy-loading WebLLM library...");
            webllm = await import("https://esm.run/@mlc-ai/web-llm");
            const availableModels = webllm.prebuiltAppConfig.model_list.map((m) => m.model_id);
            console.log(`📦 WebLLM: ${availableModels.length} models available`);

            this.ui.modelSelect.innerHTML = '';
            availableModels.forEach((modelId) => {
                const option = document.createElement("option");
                option.value = modelId;
                option.textContent = modelId;
                this.ui.modelSelect.appendChild(option);
            });
            this.ui.modelSelect.value = this.webllmModel;
            this.ui.modelSelect.addEventListener('change', (e) => {
                this.webllmModel = e.target.value;
                localStorage.setItem(AI_CONFIG.keys.model, this.webllmModel);
                console.log("🔄 WebLLM model:", this.webllmModel);
            });
        } catch (err) {
            console.warn("⚠️ WebLLM library failed to load:", err.message);
            if (this.ui.statusText) {
                this.ui.statusText.classList.remove('hidden');
                this.ui.statusText.textContent = "WebLLM unavailable. Try Gemini or Groq.";
            }
        }
    }

    async initWebLLM() {
        if (this.webllmEngine) return;
        if (!webllm) {
            await this.loadWebLLMModelList();
            if (!webllm) {
                console.error("❌ Cannot init WebLLM — library not available");
                return;
            }
        }

        this.ui.statusText?.classList.remove("hidden");
        if (this.ui.downloadBtn) this.ui.downloadBtn.disabled = true;

        try {
            console.log("⬇️ Loading WebLLM model:", this.webllmModel);
            this.webllmEngine = new webllm.MLCEngine();
            this.webllmEngine.setInitProgressCallback((report) => {
                if (this.ui.statusText) this.ui.statusText.textContent = report.text;
            });

            const config = { temperature: 0.8, top_p: 0.9, max_tokens: 512 };
            await this.webllmEngine.reload(this.webllmModel, config);

            if (this.ui.statusText) this.ui.statusText.textContent = "Model ready!";
            this.ui.sendBtn.disabled = false;
            if (this.ui.downloadBtn) this.ui.downloadBtn.disabled = false;
            console.log("✅ WebLLM model loaded successfully");
        } catch (err) {
            console.error("❌ WebLLM load error:", err);
            if (this.ui.statusText) this.ui.statusText.textContent = "Error: " + err.message;
            if (this.ui.downloadBtn) this.ui.downloadBtn.disabled = false;
        }
    }

    // ========================================== 
    //  CHAT MESSAGES (ChatGPT-style DOM)
    // ========================================== 

    getTimeString() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    appendMessage(role, contentHtml, id = null) {
        const row = document.createElement('div');
        row.className = `chat-msg ${role}`;
        if (id) row.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = role === 'assistant'
            ? '<i class="fas fa-robot"></i>'
            : '<i class="fas fa-user"></i>';

        const content = document.createElement('div');
        content.className = 'chat-msg-content';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = contentHtml;

        const time = document.createElement('span');
        time.className = 'chat-timestamp';
        time.textContent = this.getTimeString();

        content.appendChild(bubble);
        content.appendChild(time);
        row.appendChild(avatar);
        row.appendChild(content);

        this.ui.chatBox.appendChild(row);
        this.ui.chatBox.scrollTop = this.ui.chatBox.scrollHeight;
        return bubble;
    }

    showTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'chat-msg assistant';
        row.id = 'typing-indicator-row';

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';

        const content = document.createElement('div');
        content.className = 'chat-msg-content';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;

        content.appendChild(bubble);
        row.appendChild(avatar);
        row.appendChild(content);

        this.ui.chatBox.appendChild(row);
        this.ui.chatBox.scrollTop = this.ui.chatBox.scrollHeight;
        return bubble;
    }

    removeTypingIndicator() {
        const el = document.getElementById('typing-indicator-row');
        if (el) el.remove();
    }

    updateBubble(bubble, html) {
        if (bubble) {
            bubble.innerHTML = html;
            this.ui.chatBox.scrollTop = this.ui.chatBox.scrollHeight;
        }
    }

    // ========================================== 
    //  NEWS TOOL
    // ========================================== 

    isNewsQuery(text) {
        const lower = text.toLowerCase();
        return AI_CONFIG.newsKeywords.some(kw => lower.includes(kw));
    }

    async fetchNewsForChat() {
        console.log("📰 Fetching crypto news for chat tool...");
        try {
            const response = await fetch(AI_CONFIG.newsAPI);
            const data = await response.json();
            const articles = data.Data?.slice(0, 5) || [];

            // Build tool card HTML
            let cardHtml = `<div class="tool-card">
                <div class="tool-card-header"><i class="fas fa-newspaper"></i> Live Crypto News</div>`;
            articles.forEach(a => {
                const published = new Date(a.published_on * 1000);
                const timeAgo = Math.floor((Date.now() - published) / 3600000);
                const timeStr = timeAgo > 0 ? `${timeAgo}h ago` : 'Just now';
                cardHtml += `<div class="tool-card-item">
                    <a href="${a.url}" target="_blank">${a.title}</a>
                    <span class="news-time">${a.source} · ${timeStr}</span>
                </div>`;
            });
            cardHtml += `</div>`;

            // Also build a text summary for AI context
            const textSummary = articles.map((a, i) =>
                `${i + 1}. "${a.title}" (${a.source})`
            ).join('\n');

            return { cardHtml, textSummary };
        } catch (err) {
            console.error("❌ News fetch error:", err);
            return { cardHtml: '', textSummary: 'Unable to fetch latest news.' };
        }
    }

    // ========================================== 
    //  PORTFOLIO CONTEXT
    // ========================================== 

    getPortfolioContext() {
        if (!window.portfolio || window.portfolio.length === 0) return "User has no current portfolio.";
        const prices = window.currentPrices || {};

        let summary = `User's Current Portfolio (Live Market Data):\n`;
        window.portfolio.forEach(holding => {
            const currentPrice = prices[holding.symbol] || holding.purchasePrice;
            const roi = ((currentPrice - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(2);
            summary += `- ${holding.name} (${holding.ticker}): ${holding.amount} units @ $${holding.purchasePrice} (Current: $${currentPrice}, ROI: ${roi}%)\n`;
        });
        return summary;
    }

    // ========================================== 
    //  SEND MESSAGE
    // ========================================== 

    async sendMessage() {
        const text = this.ui.userInput?.value.trim();
        if (!text || this.isGenerating) return;

        this.isGenerating = true;
        this.ui.sendBtn.disabled = true;
        this.ui.userInput.value = '';
        this.ui.userInput.placeholder = 'AI is thinking...';

        console.log("📤 Sending:", text.substring(0, 60));

        // Add user message
        this.appendMessage('user', this.escapeHtml(text));
        this.chatHistory.push({ role: 'user', content: text });

        // Show typing indicator
        const typingBubble = this.showTypingIndicator();

        try {
            let newsContext = '';
            let newsCardHtml = '';

            // Check if user is asking about news → tool call
            if (this.isNewsQuery(text)) {
                console.log("🔧 Tool call: fetchNews");
                const news = await this.fetchNewsForChat();
                newsCardHtml = news.cardHtml;
                newsContext = `\n\nLatest Crypto News (fetched live):\n${news.textSummary}`;
            }

            const portfolioContext = this.getPortfolioContext();

            const systemPrompt = `You are a crypto financial analyst AI assistant for CryptoTracker.
${portfolioContext}${newsContext}

Instructions:
- Provide helpful, data-driven responses using markdown formatting
- Use **bold** for key terms, bullet points for lists, and code blocks when showing numbers/data
- Keep responses concise but informative
- If news was provided, summarize and analyze it
- Disclaimer: Not financial advice.`;

            // Remove typing indicator
            this.removeTypingIndicator();

            // Create assistant message bubble for streaming
            const responseBubble = this.appendMessage('assistant', '');

            // Call the appropriate provider with streaming
            let fullResponse = '';

            if (this.provider === 'gemini') {
                fullResponse = await this.callGeminiStreaming(systemPrompt, text, responseBubble);
            } else if (this.provider === 'groq') {
                fullResponse = await this.callGroqStreaming(systemPrompt, text, responseBubble);
            } else {
                fullResponse = await this.callWebLLMStreaming(portfolioContext + newsContext, text, responseBubble);
            }

            // If there's a news card, prepend it
            if (newsCardHtml) {
                const finalHtml = newsCardHtml + marked.parse(fullResponse);
                this.updateBubble(responseBubble, finalHtml);
            } else {
                this.updateBubble(responseBubble, marked.parse(fullResponse));
            }

            this.chatHistory.push({ role: 'assistant', content: fullResponse });
            console.log("📥 Response complete, length:", fullResponse.length);

        } catch (error) {
            console.error("❌ Chat error:", error);
            this.removeTypingIndicator();
            this.appendMessage('assistant', `<span style="color: #f87171;">⚠️ ${error.message}</span>`);
        }

        this.isGenerating = false;
        this.ui.sendBtn.disabled = false;
        this.ui.userInput.placeholder = 'Ask anything about crypto...';
        this.ui.userInput.focus();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================== 
    //  API CALLS (with streaming)
    // ========================================== 

    async callGeminiStreaming(systemPrompt, userText, bubble) {
        if (!this.geminiKey) throw new Error("Missing Gemini API Key. Click ⚙️ → API Keys to set it.");

        console.log("🌐 Calling Gemini |", this.geminiModel);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userText }] }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

        // Simulate streaming by revealing progressively
        await this.simulateStreaming(text, bubble);
        return text;
    }

    async callGroqStreaming(systemPrompt, userText, bubble) {
        if (!this.groqKey) throw new Error("Missing Groq API Key. Click ⚙️ → API Keys to set it.");

        console.log("🌐 Calling Groq API (streaming)");
        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userText }
                ],
                model: this.groqModel,
                stream: true
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Groq error ${response.status}`);
        }

        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.slice(6));
                        const delta = json.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            fullText += delta;
                            this.updateBubble(bubble, marked.parse(fullText));
                        }
                    } catch (e) { /* skip malformed JSON */ }
                }
            }
        }

        return fullText || "No response.";
    }

    async callWebLLMStreaming(context, userQuery, bubble) {
        if (!this.webllmEngine) throw new Error("WebLLM not initialized. Open settings and click 'Load'.");

        console.log("🧠 Calling WebLLM (local streaming) | Model:", this.webllmModel);
        let curMessage = "";

        const messages = [
            { role: "system", content: "You are a helpful crypto assistant. " + context },
            { role: "user", content: userQuery }
        ];

        try {
            const completion = await this.webllmEngine.chat.completions.create({
                stream: true,
                messages: messages,
            });

            for await (const chunk of completion) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    curMessage += delta;
                    this.updateBubble(bubble, marked.parse(curMessage));
                }
            }

            // Show performance stats as requested by user
            if (this.ui.chatStats) {
                const statsText = await this.webllmEngine.runtimeStatsText();
                this.ui.chatStats.classList.remove('hidden');
                this.ui.chatStats.textContent = statsText;
            }

            return curMessage || "No response.";
        } catch (err) {
            console.error("❌ WebLLM streaming error:", err);
            throw err;
        }
    }

    /**
     * Progressive text reveal for non-streaming APIs (Gemini)
     */
    async simulateStreaming(text, bubble) {
        const words = text.split(' ');
        let displayed = '';
        const batchSize = 3; // words per tick

        for (let i = 0; i < words.length; i += batchSize) {
            displayed += words.slice(i, i + batchSize).join(' ') + ' ';
            this.updateBubble(bubble, marked.parse(displayed));
            await new Promise(r => setTimeout(r, 20));
        }
    }
}

/**
 * Fetch Gemini models dynamically from the API
 */
async function fetchGeminiModels(apiKey) {
    if (!apiKey) return AI_CONFIG.geminiModels; // fallback
    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const models = (data.models || [])
            .filter(m =>
                (m.supportedGenerationMethods || []).includes('generateContent') &&
                m.name?.startsWith('models/')
            )
            .map(m => ({
                id: m.name.replace('models/', ''),
                name: m.displayName || m.name.replace('models/', '')
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        console.log(`📦 Fetched ${models.length} Gemini models from API`);
        return models.length > 0 ? models : AI_CONFIG.geminiModels;
    } catch (err) {
        console.warn('⚠️ Could not fetch Gemini models:', err.message);
        return AI_CONFIG.geminiModels;
    }
}

/**
 * Fetch Groq models dynamically from the API
 */
async function fetchGroqModels(apiKey) {
    if (!apiKey) return AI_CONFIG.groqModels; // fallback
    try {
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const models = (data.data || [])
            .filter(m => m.active !== false)
            .map(m => ({
                id: m.id,
                name: m.id
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        console.log(`📦 Fetched ${models.length} Groq models from API`);
        return models.length > 0 ? models : AI_CONFIG.groqModels;
    } catch (err) {
        console.warn('⚠️ Could not fetch Groq models:', err.message);
        return AI_CONFIG.groqModels;
    }
}

/**
 * Initialize Settings Modal — populates provider & model dropdowns
 */
function initSettingsModal(client) {
    const providerSelect = document.getElementById('ai-provider-select');
    const modelSelect = document.getElementById('ai-model-select');
    if (!providerSelect || !modelSelect) return;

    // Set current provider
    providerSelect.value = client.provider;

    // Cache fetched models
    const modelCache = {};

    function showLoading() {
        modelSelect.innerHTML = '<option disabled selected>Loading models...</option>';
    }

    function populateSelect(models, currentModel) {
        modelSelect.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            if (m.id === currentModel) opt.selected = true;
            modelSelect.appendChild(opt);
        });
    }

    async function updateModelList(provider) {
        let models, currentModel;

        if (provider === 'gemini') {
            currentModel = client.geminiModel;
            if (modelCache.gemini) {
                models = modelCache.gemini;
            } else {
                showLoading();
                models = await fetchGeminiModels(client.geminiKey);
                modelCache.gemini = models;
            }
        } else if (provider === 'groq') {
            currentModel = client.groqModel || 'llama-3.3-70b-versatile';
            if (modelCache.groq) {
                models = modelCache.groq;
            } else {
                showLoading();
                models = await fetchGroqModels(client.groqKey);
                modelCache.groq = models;
            }
        } else {
            // WebLLM
            models = [{ id: client.webllmModel, name: client.webllmModel }];
            currentModel = client.webllmModel;
        }

        populateSelect(models, currentModel);
    }

    // Initial population
    updateModelList(client.provider);

    // Update models when provider changes
    providerSelect.addEventListener('change', (e) => {
        updateModelList(e.target.value);
    });

    // Re-fetch models when API key fields lose focus (user just entered a key)
    document.getElementById('gemini-key')?.addEventListener('blur', async () => {
        const key = document.getElementById('gemini-key').value.trim();
        if (key && key !== client.geminiKey) {
            delete modelCache.gemini;
            client.geminiKey = key;
            if (providerSelect.value === 'gemini') {
                await updateModelList('gemini');
            }
        }
    });

    document.getElementById('groq-key')?.addEventListener('blur', async () => {
        const key = document.getElementById('groq-key').value.trim();
        if (key && key !== client.groqKey) {
            delete modelCache.groq;
            client.groqKey = key;
            if (providerSelect.value === 'groq') {
                await updateModelList('groq');
            }
        }
    });

    // Populate API key fields with saved values
    const geminiInput = document.getElementById('gemini-key');
    const groqInput = document.getElementById('groq-key');
    if (geminiInput && client.geminiKey) geminiInput.value = client.geminiKey;
    if (groqInput && client.groqKey) groqInput.value = client.groqKey;
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initializing AIClient...");
    window.aiClient = new AIClient();
    initSettingsModal(window.aiClient);
});
