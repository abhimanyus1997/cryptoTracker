/**
 * ai.js
 * Handles AI features for CryptoTracker Lite.
 * Includes: Persistence (localStorage/sessionStorage), API Clients (Gemini/Groq), and UI Interaction.
 */

const AI_CONFIG = {
    keys: {
        gemini: 'ct_gemini_key',
        groq: 'ct_groq_key'
    },
    settings: {
        provider: 'ct_ai_provider', // 'gemini' or 'groq'
        model: 'ct_ai_model'
    }
};

class AIClient {
    constructor() {
        this.geminiKey = localStorage.getItem(AI_CONFIG.keys.gemini) || '';
        this.groqKey = localStorage.getItem(AI_CONFIG.keys.groq) || '';
        this.provider = localStorage.getItem(AI_CONFIG.settings.provider) || 'gemini';
        console.log("AI Client Initialized. Provider:", this.provider);
    }

    saveSettings(geminiKey, groqKey, provider) {
        if (geminiKey) localStorage.setItem(AI_CONFIG.keys.gemini, geminiKey);
        if (groqKey) localStorage.setItem(AI_CONFIG.keys.groq, groqKey);
        if (provider) localStorage.setItem(AI_CONFIG.settings.provider, provider);

        this.geminiKey = geminiKey || this.geminiKey;
        this.groqKey = groqKey || this.groqKey;
        this.provider = provider || this.provider;

        alert("Settings Saved!");
        return true;
    }

    async analyzeMarket(data) {
        if (this.provider === 'gemini') {
            return this.callGemini(data);
        } else {
            return this.callGroq(data);
        }
    }

    async chat(message) {
        // 1. Add user message to history
        this.addToHistory('user', message);

        // 2. Prepare context (market data)
        const marketData = {
            bitcoin: document.getElementById('valuesBitcoin')?.innerText || "N/A",
            ethereum: document.getElementById('valuesEthereum')?.innerText || "N/A",
        };
        const contextPrompt = `Current Market Data: ${JSON.stringify(marketData)}. User Question: ${message}`;

        // 3. Call API
        let responseText = "";
        if (this.provider === 'gemini') {
            responseText = await this.callGeminiChat(contextPrompt);
        } else {
            responseText = await this.callGroqChat(contextPrompt);
        }

        // 4. Add AI response to history
        this.addToHistory('ai', responseText);
        return responseText;
    }

    addToHistory(role, text) {
        const history = JSON.parse(sessionStorage.getItem('chatHistory') || '[]');
        history.push({ role, text, timestamp: new Date().toISOString() });
        sessionStorage.setItem('chatHistory', JSON.stringify(history));
    }

    getHistory() {
        return JSON.parse(sessionStorage.getItem('chatHistory') || '[]');
    }

    clearHistory() {
        sessionStorage.removeItem('chatHistory');
    }

    // specific chat endpoints (could reuse analyze ones but keeping separate for context handling improvements)
    async callGeminiChat(prompt) {
        return this.callGemini({ customPrompt: prompt });
    }

    async callGroqChat(prompt) {
        return this.callGroq({ customPrompt: prompt });
    }

    // Updated generic calls to handle objects or strings
    async callGemini(data) {
        if (!this.geminiKey) return "Error: Gemini API Key not found. Please set it in Settings.";

        let prompt;
        if (data.customPrompt) {
            prompt = data.customPrompt;
        } else {
            prompt = `Analyze this crypto market data and provide a short market summary and prediction: ${JSON.stringify(data)}`;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const result = await response.json();
            if (result.error) return "API Error: " + result.error.message;
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response found.";
        } catch (error) {
            console.error(error);
            return "Error calling Gemini API: " + error.message;
        }
    }

    async callGroq(data) {
        if (!this.groqKey) return "Error: Groq API Key not found. Please set it in Settings.";

        let prompt;
        if (data.customPrompt) {
            prompt = data.customPrompt;
        } else {
            prompt = `Analyze this crypto market data and provide a short market summary and prediction: ${JSON.stringify(data)}`;
        }

        const url = 'https://api.groq.com/openai/v1/chat/completions';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "mixtral-8x7b-32768"
                })
            });
            const result = await response.json();
            if (result.error) return "API Error: " + result.error.message;
            return result.choices?.[0]?.message?.content || "No response found.";
        } catch (error) {
            console.error(error);
            return "Error calling Groq API: " + error.message;
        }
    }
}

const aiClient = new AIClient();

// Expose to window for UI interaction
window.saveAISettings = () => {
    const geminiKey = document.getElementById('geminiKeyInput').value;
    const groqKey = document.getElementById('groqKeyInput').value;
    const provider = document.getElementById('aiProviderSelect').value;
    if (aiClient.saveSettings(geminiKey, groqKey, provider)) {
        // populate inputs again to show saved state (optional, but good UX to verify)
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
};

window.runAIAnalysis = async () => {
    const outputDiv = document.getElementById('aiOutput');
    outputDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div> Analyzing market data...';

    const data = {
        bitcoin: document.getElementById('valuesBitcoin')?.innerText || "N/A",
        ethereum: document.getElementById('valuesEthereum')?.innerText || "N/A",
        bnb: document.getElementById('valuesBNB')?.innerText || "N/A",
        solana: document.getElementById('valuesSOL')?.innerText || "N/A",
    };

    const result = await aiClient.analyzeMarket(data);
    // basic markdown to html conversion for bolding
    outputDiv.innerHTML = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
};

// Chat UI Logic
window.toggleChat = () => {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        renderChatHistory();
    } else {
        chatWindow.style.display = 'none';
    }
};

window.sendChatMessage = async () => {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Display user message immediately
    appendChatMessage('user', message);
    input.value = '';

    // Show typing indicator
    const typingId = appendChatMessage('ai', '...');

    // Call AI
    const response = await aiClient.chat(message);

    // Remove typing indicator and show response
    document.getElementById(typingId).remove();
    appendChatMessage('ai', response);
};

function appendChatMessage(role, text) {
    const chatBody = document.getElementById('chatBody');
    const msgDiv = document.createElement('div');
    const msgId = 'msg-' + Date.now();
    msgDiv.id = msgId;
    msgDiv.className = `p-2 mb-2 rounded ${role === 'user' ? 'bg-primary text-white ms-auto' : 'bg-light text-dark me-auto'}`;
    msgDiv.style.maxWidth = '80%';
    msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); // Basic formatting
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msgId;
}

function renderChatHistory() {
    const history = aiClient.getHistory();
    const chatBody = document.getElementById('chatBody');
    chatBody.innerHTML = ''; // Clear current view
    history.forEach(msg => appendChatMessage(msg.role, msg.text));
}
