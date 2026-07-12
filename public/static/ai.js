/* CryptoTracker AI — local-first LiteRT-LM chat with retrieval over dashboard data. */
const LOCAL_MODELS = {
    e2b: {
        id: 'e2b',
        name: 'Gemma 4 E2B (recommended)',
        url: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm',
        download: '≈2.6 GB'
    },
    e4b: {
        id: 'e4b',
        name: 'Gemma 4 E4B (higher quality)',
        url: 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.litertlm',
        download: '≈3.7 GB'
    },
    qwen35_08b: {
        id: 'qwen35_08b',
        name: 'Qwen 3.5 0.8B LiteRT (beta)',
        url: 'https://huggingface.co/GabrieleConte/Qwen3.5-0.8B-LiteRT/resolve/main/qwen35_mm_q8_ekv2048.litertlm',
        download: '≈1.2 GB',
        maxTokens: 2048
    }
};

const AI_CONFIG = {
    keys: { provider: 'ct_ai_provider', localModel: 'ct_local_model', webllmModel: 'ct_webllm_model', gemini: 'gemini_api_key', groq: 'groq_api_key' },
    geminiModel: 'gemini-2.5-flash',
    groqModel: 'openai/gpt-oss-120b',
    litellm: {
        apiBase: 'http://13.126.102.204:4000',
        apiKey: '',
        model: 'nvidia.nemotron-nano-9b-v2',
        showThinking: true // Enable thinking display
    },
    rateLimit: { maxPerSession: 50, windowMs: 60 * 60 * 1000 },
    superAdmin: (window.ENV_SUPERUSER_WALLET || '').toLowerCase(),
    subscriptionWallet: window.ENV_SUPERUSER_WALLET || '0xd7e9d18153de624713C18b1cA18A238C42033EA5',
    subscriptionAmount: '0.001' // ETH to unlock unlimited
};

class LocalRetriever {
    tokenize(value) {
        return String(value || '').toLowerCase().match(/[a-z0-9$%.+-]+/g) || [];
    }

    documents() {
        const prices = window.currentPrices || {};
        const holdings = [...(window.portfolio || []), ...(window.dexPortfolio || [])];
        const docs = holdings.map((holding) => {
            const price = prices[holding.symbol] || holding.purchasePrice || 0;
            const value = holding.amount * price;
            const roi = holding.purchasePrice ? ((price - holding.purchasePrice) / holding.purchasePrice * 100) : 0;
            return {
                title: `${holding.name} (${holding.ticker}) holding`,
                text: `${holding.name} ${holding.ticker} ${holding.symbol}. Amount ${holding.amount}. Purchase price $${holding.purchasePrice}. Current price $${price}. Current value $${value.toFixed(2)}. ROI ${roi.toFixed(2)} percent.`,
            };
        });
        const total = holdings.reduce((sum, h) => sum + h.amount * (prices[h.symbol] || h.purchasePrice || 0), 0);
        docs.push({
            title: 'Portfolio summary',
            text: `Portfolio has ${holdings.length} tracked holdings with an estimated current value of $${total.toFixed(2)}. Prices are fetched from Binance when available.`
        });
        const walletSummary = window.walletPortfolioSummary;
        if (walletSummary && Number.isFinite(Number(walletSummary.totalValue))) {
            docs.push({
                title: 'Connected wallet portfolio value',
                text: `Connected wallet currently holds approximately $${Number(walletSummary.totalValue).toFixed(2)} across ${walletSummary.holdingCount || 'multiple'} assets. This value comes from the connected wallet balance feed.`
            });
        }
        docs.push({
            title: 'CryptoTracker scope',
            text: 'CryptoTracker is a client-side crypto portfolio dashboard. Forecasts are technical projections only and are not financial advice. The assistant should distinguish live dashboard data from general knowledge.'
        });
        return docs;
    }

    search(query, limit = 4) {
        const terms = this.tokenize(query);
        return this.documents()
            .map((doc) => {
                const tokens = this.tokenize(`${doc.title} ${doc.text}`);
                const score = terms.reduce((total, term) => total + tokens.filter((token) => token === term).length, 0);
                return { ...doc, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    context(query) {
        const matches = this.search(query);
        const walletValueDoc = this.documents().find(doc => doc.title === 'Connected wallet portfolio value');
        if (walletValueDoc && !matches.some(doc => doc.title === walletValueDoc.title)) {
            matches.push(walletValueDoc);
        }
        return matches.map((doc, index) => `[${index + 1}] ${doc.title}\n${doc.text}`).join('\n\n');
    }
}

class AIClient {
    constructor() {
        this.provider = localStorage.getItem(AI_CONFIG.keys.provider) || 'litellm';
        this.localModel = localStorage.getItem(AI_CONFIG.keys.localModel) || 'e2b';
        this.webllmModel = localStorage.getItem(AI_CONFIG.keys.webllmModel) || 'Qwen2-0.5B-Instruct-q4f16_1-MLC';
        this.geminiKey = localStorage.getItem(AI_CONFIG.keys.gemini) || '';
        this.groqKey = localStorage.getItem(AI_CONFIG.keys.groq) || '';
        this.engine = null;
        this.conversation = null;
        this.webllm = null;
        this.webllmEngine = null;
        this.retriever = new LocalRetriever();
        this.isGenerating = false;
        this.messageCount = parseInt(sessionStorage.getItem('ct_msg_count') || '0', 10);
        this.sessionStart = parseInt(sessionStorage.getItem('ct_session_start') || Date.now().toString(), 10);
        if (!sessionStorage.getItem('ct_session_start')) sessionStorage.setItem('ct_session_start', this.sessionStart.toString());
        this.initUI();
    }

    isSuperAdmin() {
        const addr = document.getElementById('wallet-address')?.title || '';
        return addr.toLowerCase() === AI_CONFIG.superAdmin;
    }

    isSubscribed() {
        return localStorage.getItem('ct_subscription_active') === 'true' || this.isSuperAdmin();
    }

    checkRateLimit() {
        if (this.isSuperAdmin() || this.isSubscribed()) return;
        if (Date.now() - this.sessionStart > AI_CONFIG.rateLimit.windowMs) {
            this.messageCount = 0; this.sessionStart = Date.now();
            sessionStorage.setItem('ct_session_start', this.sessionStart.toString());
            sessionStorage.setItem('ct_msg_count', '0');
        }
        if (this.messageCount >= AI_CONFIG.rateLimit.maxPerSession) {
            throw new Error(`Rate limit reached (${AI_CONFIG.rateLimit.maxPerSession} messages/hour). Upgrade to unlimited by clicking "Unlock Unlimited" below, or wait.`);
        }
    }

    requireAuth() {
        if (this.isSuperAdmin()) return;
        const walletState = document.getElementById('wallet-state')?.textContent;
        const isConnected = walletState === 'Connected' || walletState === 'Viewing';
        if (!isConnected && this.provider === 'litellm') {
            throw new Error('Connect your wallet or open Wallet Profile to use the AI assistant. This prevents abuse of the shared endpoint.');
        }
    }

    incrementMessageCount() {
        if (this.isSuperAdmin() || this.isSubscribed()) return;
        this.messageCount++;
        sessionStorage.setItem('ct_msg_count', this.messageCount.toString());
    }

    async unlockSubscription() {
        if (!window.ethereum) throw new Error('MetaMask required to process payment.');
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const amountWei = '0x' + BigInt(Math.floor(parseFloat(AI_CONFIG.subscriptionAmount) * 1e18)).toString(16);
        try {
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: account,
                    to: AI_CONFIG.subscriptionWallet,
                    value: amountWei
                }]
            });
            localStorage.setItem('ct_subscription_active', 'true');
            localStorage.setItem('ct_subscription_tx', txHash);
            return txHash;
        } catch (e) {
            if (e.code === 4001) throw new Error('Transaction cancelled by user.');
            throw e;
        }
    }

    initUI() {
        this.ui = {
            provider: document.getElementById('ai-provider'),
            badge: document.getElementById('chat-provider-badge'),
            panel: document.getElementById('chat-settings-panel'),
            panelToggle: document.getElementById('chat-settings-toggle'),
            localControls: document.getElementById('local-controls'),
            model: document.getElementById('model-selection'),
            load: document.getElementById('download'),
            status: document.getElementById('download-status'),
            progress: document.getElementById('download-progress'),
            progressBar: document.getElementById('download-progress-bar'),
            modal: document.getElementById('ai-chat-modal'),
            box: document.getElementById('chat-box'),
            stats: document.getElementById('chat-stats'),
            input: document.getElementById('user-input'),
            send: document.getElementById('send'), attach: document.getElementById('attach-image'), imageInput: document.getElementById('image-input'), attachmentStatus: document.getElementById('attachment-status')
        };
        if (!this.ui.provider || !this.ui.box || !this.ui.send) return;
        this.ui.provider.value = this.provider;
        this.populateModels();
        this.ui.provider.addEventListener('change', (event) => {
            this.provider = event.target.value;
            localStorage.setItem(AI_CONFIG.keys.provider, this.provider);
            this.populateModels();
            this.updateUIState();
        });
        this.ui.load.addEventListener('click', () => this.provider === 'webllm' ? this.initializeWebLLM() : this.initializeLocalModel());
        this.ui.send.addEventListener('click', () => this.sendMessage());
        this.ui.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendMessage(); }
        });
        this.attachment = null;
        this.ui.attach?.addEventListener('click', () => this.ui.imageInput.click());
        this.ui.imageInput?.addEventListener('change', () => this.readAttachment());
        this.ui.panelToggle?.addEventListener('click', () => this.ui.panel.classList.toggle('open'));
        document.getElementById('ai-chat-toggle')?.addEventListener('click', () => this.openModal());
        document.getElementById('ai-chat-toggle-mobile')?.addEventListener('click', () => this.openModal());
        document.getElementById('ai-chat-close')?.addEventListener('click', () => this.ui.modal.classList.add('hidden'));
        document.getElementById('chat-settings-btn')?.addEventListener('click', () => document.getElementById('settings-modal')?.classList.remove('hidden'));
        this.updateUIState();
    }

    populateModels() {
        if (this.provider === 'webllm') { this.loadWebLLMModels(); return; }
        this.ui.model.innerHTML = Object.values(LOCAL_MODELS).map((model) =>
            `<option value="${model.id}">${model.name} · ${model.download}</option>`).join('');
        this.ui.model.value = this.localModel;
        this.ui.model.addEventListener('change', (event) => {
            this.localModel = event.target.value;
            localStorage.setItem(AI_CONFIG.keys.localModel, this.localModel);
            if (this.engine) this.setStatus('Model selection changed. Click Load to switch models.');
        });
    }

    updateUIState() {
        const local = this.provider === 'litert' || this.provider === 'webllm';
        this.ui.localControls.classList.toggle('hidden', !local);
        const labels = { webllm: 'WebLLM · local RAG', litert: 'LiteRT · local RAG', gemini: 'Gemini', groq: 'Groq', litellm: 'Nemotron 9B' };
        this.ui.badge.textContent = labels[this.provider] || this.provider;
        if (this.provider === 'litellm') this.ui.send.disabled = false;
        else if (this.provider === 'webllm') this.ui.send.disabled = !this.webllmEngine;
        else if (this.provider === 'litert') this.ui.send.disabled = !this.conversation;
        else if (this.provider === 'gemini') this.ui.send.disabled = !this.geminiKey;
        else this.ui.send.disabled = !this.groqKey;
    }

    async loadWebLLMModels() {
        this.ui.model.innerHTML = '<option>Loading WebLLM models…</option>';
        try {
            this.webllm = this.webllm || await import('https://esm.run/@mlc-ai/web-llm');
            const models = this.webllm.prebuiltAppConfig.model_list;
            this.ui.model.innerHTML = models.map(model => `<option value="${model.model_id}">${model.model_id}</option>`).join('');
            const preferred = models.find(model => model.model_id === this.webllmModel) || models.find(model => /Qwen2.*0\.5B.*Instruct.*q4f16/i.test(model.model_id)) || models[0];
            this.webllmModel = preferred.model_id;
            this.ui.model.value = this.webllmModel;
            this.ui.model.onchange = (event) => { this.webllmModel = event.target.value; localStorage.setItem(AI_CONFIG.keys.webllmModel, this.webllmModel); this.updateAttachmentSupport(); };
            this.updateAttachmentSupport();
        } catch (error) { this.setStatus(`WebLLM is unavailable: ${error.message}`); }
    }

    updateAttachmentSupport() {
        const vision = this.provider === 'webllm' && /vision|llava|vlm|qwen.*vl/i.test(this.webllmModel);
        if (this.ui.attach) this.ui.attach.disabled = !vision;
        if (this.ui.attachmentStatus) this.ui.attachmentStatus.textContent = vision ? 'Vision model ready: attach a PNG, JPEG, or WebP image.' : 'Select a WebLLM vision model to attach images. LiteRT Web is text-only.';
    }
    readAttachment() { const file = this.ui.imageInput.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { this.attachment = reader.result; this.ui.attachmentStatus.textContent = `Attached: ${file.name}`; }; reader.readAsDataURL(file); }

    async initializeWebLLM() {
        if (!navigator.gpu) { this.setStatus('WebLLM also requires WebGPU. Use Gemini or Groq on this device.'); return; }
        await this.loadWebLLMModels();
        if (!this.webllm) return;
        this.ui.load.disabled = true;
        this.setStatus(`Loading ${this.webllmModel}. The first download can be large.`);
        try {
            this.webllmEngine = new this.webllm.MLCEngine({ initProgressCallback: (report) => this.setStatus(report.text, report.progress) });
            await this.webllmEngine.reload(this.webllmModel, { temperature: 0.5, top_p: 0.9 });
            this.setStatus('WebLLM is ready. Prompts and retrieved portfolio context stay in this browser.');
        } catch (error) { this.setStatus(`Could not load WebLLM: ${error.message}`); }
        finally { this.ui.load.disabled = false; this.updateUIState(); }
    }

    setStatus(message, progress = null) {
        this.ui.status.classList.remove('hidden');
        this.ui.status.textContent = message;
        const indeterminate = progress === 'indeterminate';
        const validProgress = indeterminate || (typeof progress === 'number' && Number.isFinite(progress));
        this.ui.progress?.classList.toggle('hidden', !validProgress);
        this.ui.progress?.classList.toggle('is-indeterminate', indeterminate);
        if (validProgress && this.ui.progressBar) {
            const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
            this.ui.progress.setAttribute('aria-valuenow', String(percent));
            this.ui.progressBar.style.width = `${percent}%`;
        }
    }

    async initializeLocalModel() {
        if (!navigator.gpu) {
            this.setStatus('WebGPU is unavailable. Use a current Chrome or Edge browser with hardware acceleration enabled.');
            return;
        }
        const model = LOCAL_MODELS[this.localModel];
        this.ui.load.disabled = true;
        this.setStatus(`Loading ${model.name}. First use downloads ${model.download}; this may take a while.`, 'indeterminate');
        try {
            if (this.engine) await this.engine.delete();
            this.engine = null;
            this.conversation = null;
            const { Engine } = await import('https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm');
            this.engine = await Engine.create({ model: model.url, mainExecutorSettings: { maxNumTokens: model.maxTokens || 4096 } });
            this.conversation = await this.engine.createConversation({ preface: { messages: [{ role: 'system', content: this.systemPrompt('') }] } });
            this.setStatus(model.id === 'qwen35_08b'
                ? 'Qwen LiteRT beta is ready. Text chat and local RAG stay in this browser.'
                : 'LiteRT model is ready. Your prompts and retrieved portfolio context stay in this browser.');
            this.updateUIState();
        } catch (error) {
            console.error('Local model initialization failed', error);
            this.setStatus(`Could not load ${model.name}: ${error.message}`);
        } finally {
            this.ui.load.disabled = false;
        }
    }

    systemPrompt(retrieved) {
        return `You are CryptoTracker's helpful AI analyst. Provide clear, actionable insights about cryptocurrency holdings, market trends, and portfolio management.

<thinking>
Before responding, think through:
1. What is the user asking?
2. What data is available in the context?
3. What insights can I provide?
4. Is this general chat or specific analysis?
5. What's the best way to present this?
</thinking>

When context is available:
- Cite sources using [1], [2], etc.
- Provide specific numbers and percentages
- Explain what the metrics mean for the user

When asked general questions (greetings, general crypto questions):
- Respond naturally and helpfully
- Offer to help with portfolio analysis
- Be conversational but concise

Always:
- Be helpful and engaging
- Avoid disclaimers unless discussing actual financial advice
- Keep responses under 2 paragraphs for simple questions
- Provide detailed analysis when asked about holdings

RETRIEVED DASHBOARD CONTEXT:
${retrieved || 'No holdings data available yet. User can connect wallet or add tokens.'}`;
    }

    openModal() {
        this.ui.modal.classList.remove('hidden');
        if (this.provider === 'litert' && !this.conversation) this.setStatus('Choose a model and click Load. Local models run with WebGPU.');
        setTimeout(() => this.ui.input.focus(), 50);
    }

    escapeHtml(text) { const node = document.createElement('div'); node.textContent = text; return node.innerHTML; }
    render(text) {
        // Render markdown-style formatting
        let rendered = this.escapeHtml(text);
        
        // Bold: **text** → <strong>text</strong>
        rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_ → <em>text</em>
        rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
        rendered = rendered.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Newlines to <br>
        rendered = rendered.replace(/\n/g, '<br>');
        
        return rendered;
    }
    appendMessage(role, html) {
        const row = document.createElement('div'); row.className = `chat-msg ${role}`;
        row.innerHTML = `<div class="chat-avatar"><i class="fas fa-${role === 'assistant' ? 'robot' : 'user'}"></i></div><div class="chat-msg-content"><div class="chat-bubble">${html}</div><span class="chat-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>`;
        this.ui.box.appendChild(row); this.ui.box.scrollTop = this.ui.box.scrollHeight;
        return row.querySelector('.chat-bubble');
    }

    async sendMessage() {
        const query = this.ui.input.value.trim();
        if (!query || this.isGenerating) return;
        this.isGenerating = true; this.ui.send.disabled = true; this.ui.input.value = '';
        this.appendMessage('user', this.escapeHtml(query));
        const bubble = this.appendMessage('assistant', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
        try {
            this.requireAuth();
            this.checkRateLimit();
            const context = this.retriever.context(query);
            this.ui.stats.classList.remove('hidden');
            
            // Clear typing indicator after response
            const clearTypingIndicator = () => {
                const indicator = bubble.querySelector('.typing-indicator');
                if (indicator) indicator.remove();
            };
            if (this.isSuperAdmin()) {
                this.ui.stats.innerHTML = `<span style="color:var(--accent);">⚡ Super Admin</span> · RAG: ${context ? context.split('\n\n').length : 0} context snippets · Unlimited`;
            } else if (this.isSubscribed()) {
                this.ui.stats.innerHTML = `<span style="color:var(--accent);">✓ Subscribed</span> · RAG: ${context ? context.split('\n\n').length : 0} snippets · Unlimited`;
            } else {
                this.ui.stats.innerHTML = `RAG: ${context ? context.split('\n\n').length : 0} snippets · ${AI_CONFIG.rateLimit.maxPerSession - this.messageCount} msgs left · <button id="unlock-btn" style="color:var(--accent); text-decoration:underline; background:none; border:none; cursor:pointer; font:inherit;">Unlock Unlimited (${AI_CONFIG.subscriptionAmount} ETH)</button>`;
                document.getElementById('unlock-btn')?.addEventListener('click', async () => {
                    try {
                        const tx = await this.unlockSubscription();
                        this.ui.stats.innerHTML = `<span style="color:var(--accent);">✓ Subscription active!</span> Tx: ${tx.slice(0, 10)}…`;
                    } catch (e) { this.ui.stats.textContent = e.message; }
                });
            }
            let response;
            if (this.provider === 'litellm') response = await this.callLiteLLM(query, context, bubble);
            else if (this.provider === 'webllm') response = await this.callWebLLM(query, context, bubble);
            else if (this.provider === 'litert') response = await this.callLiteRT(query, context, bubble);
            else if (this.provider === 'gemini') response = await this.callGemini(query, context);
            else response = await this.callGroq(query, context);
            if (this.provider !== 'litellm' && this.provider !== 'webllm' && this.provider !== 'litert') {
                bubble.innerHTML = this.render(response);
            }
            this.incrementMessageCount();
        } catch (error) {
            bubble.innerHTML = `<span class="text-red-400">⚠️ ${this.escapeHtml(error.message)}</span>`;
        } finally {
            this.isGenerating = false; this.updateUIState(); this.ui.input.focus();
        }
    }

    async callLiteRT(query, context, bubble) {
        if (!this.conversation) throw new Error('Load the LiteRT model before sending a message.');
        const prompt = `${this.systemPrompt(context)}\n\nUSER QUESTION: ${query}`;
        let response = '';
        for await (const chunk of this.conversation.sendMessageStreaming(prompt)) {
            for (const item of chunk.content || []) {
                if (item.type === 'text' && item.text) { response += item.text; bubble.innerHTML = this.render(response); this.ui.box.scrollTop = this.ui.box.scrollHeight; }
            }
        }
        return response || 'I could not generate a response.';
    }

    async callWebLLM(query, context, bubble) {
        if (!this.webllmEngine) throw new Error('Load a WebLLM model before sending a message.');
        let response = '';
        const content = this.attachment ? [{ type: 'text', text: query }, { type: 'image_url', image_url: { url: this.attachment } }] : query;
        const stream = await this.webllmEngine.chat.completions.create({ stream: true, messages: [{ role: 'system', content: this.systemPrompt(context) }, { role: 'user', content }] });
        for await (const chunk of stream) { const token = chunk.choices?.[0]?.delta?.content || ''; if (token) { response += token; bubble.innerHTML = this.render(response); } }
        return response || 'I could not generate a response.';
    }


    async callGemini(query, context) {
        if (!this.geminiKey) throw new Error('Add a Gemini API key in Settings first.');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.geminiModel}:generateContent?key=${this.geminiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: this.systemPrompt(context) }] }, contents: [{ parts: [{ text: query }] }] }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed.');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    }

    async callGroq(query, context) {
        if (!this.groqKey) throw new Error('Add a Groq API key in Settings first.');
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: AI_CONFIG.groqModel, messages: [{ role: 'system', content: this.systemPrompt(context) }, { role: 'user', content: query }] }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Groq request failed.');
        return data.choices?.[0]?.message?.content || 'No response.';
    }

    async callLiteLLM(query, context, bubble) {
        const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'https://cryptotracker.abhimanyu.fyi'
            : '';
        const { model } = AI_CONFIG.litellm;
        
        // Stream reasoning and the final answer as soon as LiteLLM sends tokens.
        const response = await fetch(`${host}/api/zerion?litellm=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                stream: true,
                messages: [
                    { role: 'system', content: this.systemPrompt(context) },
                    { role: 'user', content: query }
                ],
                max_tokens: 1024,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `LiteLLM proxy error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('LiteLLM returned no readable stream.');
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        const updateStreamingBubble = () => {
            const opening = fullText.search(/<(?:think|thinking)>/i);
            const closing = fullText.search(/<\/(?:think|thinking)>/i);
            if (opening >= 0 && closing < 0) {
                const liveThinking = fullText.slice(opening).replace(/<(?:think|thinking)>/i, '').trim();
                bubble.innerHTML = `<div class="ai-thinking-live"><i class="fas fa-brain"></i> Thinking…</div><div class="ai-thinking-preview">${this.render(liveThinking)}</div>`;
            } else if (closing >= 0) {
                const answer = fullText.slice(closing).replace(/<\/(?:think|thinking)>/i, '').trim();
                bubble.innerHTML = this.render(answer);
            } else {
                bubble.innerHTML = this.render(fullText);
            }
            this.ui.box.scrollTop = this.ui.box.scrollHeight;
        };

        const consume = (line) => {
            if (!line.startsWith('data:')) return;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') return;
            try {
                const chunk = JSON.parse(payload);
                const token = chunk.choices?.[0]?.delta?.content || '';
                if (token) { fullText += token; updateStreamingBubble(); }
            } catch (_) { /* Ignore incomplete SSE frames. */ }
        };

        while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            lines.forEach(consume);
            if (done) break;
        }
        if (buffer) consume(buffer);
        const data = { choices: [{ message: { content: fullText } }] };
        if (!fullText) fullText = 'No response.';
        
        // Extract thinking - look for explicit tags OR natural thinking patterns
        let thinking = null;
        let responseText = fullText;
        
        // Method 1: Check for the formats used by different reasoning models:
        // <think>...</think>, <thinking>...</thinking>, and an unpaired </think>.
        const thinkingMatch = fullText.match(/<(?:think|thinking)>\s*([\s\S]*?)\s*<\/(?:think|thinking)>/i);
        if (thinkingMatch) {
            thinking = thinkingMatch[1].trim();
            responseText = fullText.replace(thinkingMatch[0], '').trim();
        } else {
            const closingThinkIndex = fullText.search(/<\/(?:think|thinking)>/i);
            if (closingThinkIndex >= 0) {
                thinking = fullText.slice(0, closingThinkIndex).trim();
                responseText = fullText.slice(closingThinkIndex).replace(/<\/(?:think|thinking)>/i, '').trim();
            }
        }
        
        // Method 2: Detect untagged reasoning, but only split at a likely answer boundary.
        if (!thinking) {
            const lines = fullText.split('\n');
            const firstLine = lines[0] || '';
            const firstLineLower = firstLine.toLowerCase();
            const isThinking = ['user', 'let me', 'okay', 'the user', 'looking at',
                'checking', 'since', 'so,', 'also,', 'that covers']
                .some(marker => firstLineLower.includes(marker));

            if (isThinking && lines.length > 3) {
                let thinkingEndIndex = -1;
                const doubleNewline = fullText.indexOf('\n\n');
                if (doubleNewline > 0 && doubleNewline < fullText.length * 0.7) {
                    thinkingEndIndex = doubleNewline;
                }

                if (thinkingEndIndex === -1) {
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line && (/^\d+\s*[\+\-\*\/=]/.test(line) ||
                            /^(Yes|No|Correct|Sure)\b/.test(line) ||
                            line.includes('equals') ||
                            (!line.includes('user') && !line.includes('check') && !line.includes('context')))) {
                            thinkingEndIndex = fullText.indexOf(lines[i]);
                            break;
                        }
                    }
                }

                if (thinkingEndIndex > 50) {
                    thinking = fullText.substring(0, thinkingEndIndex).trim();
                    responseText = fullText.substring(thinkingEndIndex).trim();
                }
            }
        }
        
        // Display thinking in collapsible section if found
        if (thinking && AI_CONFIG.litellm.showThinking && thinking.length > 20) {
            const thinkingSection = document.createElement('div');
            thinkingSection.className = 'ai-thinking-section';
            thinkingSection.innerHTML = `
                <div class="ai-thinking-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <i class="fas fa-brain"></i>
                    <span>AI Reasoning</span>
                    <i class="fas fa-chevron-down" style="margin-left: auto; transition: transform 0.2s;"></i>
                </div>
                <div class="ai-thinking-content" style="display: none;">
                    ${this.render(thinking)}
                </div>
            `;
            bubble.appendChild(thinkingSection);
            
            // Add toggle functionality
            const header = thinkingSection.querySelector('.ai-thinking-header');
            const content = thinkingSection.querySelector('.ai-thinking-content');
            const icon = thinkingSection.querySelector('.fa-chevron-down');
            
            header.addEventListener('click', () => {
                const isExpanded = thinkingSection.classList.contains('expanded');
                content.style.display = isExpanded ? 'none' : 'block';
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        }
        
        // Clear typing indicator
        const indicator = bubble.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
        
        // Add token usage at bottom
        if (data.usage) {
            const tokenDiv = document.createElement('div');
            tokenDiv.className = 'token-usage';
            tokenDiv.innerHTML = `
                <small style="color: var(--text-muted); font-size: 0.75rem;">
                    Tokens: ${data.usage.prompt_tokens || 0} prompt + ${data.usage.completion_tokens || 0} completion = ${data.usage.total_tokens || 0} total
                </small>
            `;
            bubble.appendChild(tokenDiv);
        }
        
        // Simulate typing effect for response
        await this.simulateTyping(responseText, bubble);
        return responseText;
    }
    
    async simulateTyping(text, bubble) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bot-message';
        bubble.appendChild(messageDiv);
        
        const words = text.split(' ');
        
        // Faster typing for better UX
        for (let i = 0; i < words.length; i++) {
            messageDiv.innerHTML = this.render(words.slice(0, i + 1).join(' '));
            this.ui.box.scrollTop = this.ui.box.scrollHeight;
            
            // Variable speed: 10-30ms for natural feel
            const delay = Math.random() * 20 + 10;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    saveSettings() {
        this.geminiKey = document.getElementById('gemini-key')?.value.trim() || '';
        this.groqKey = document.getElementById('groq-key')?.value.trim() || '';
        localStorage.setItem(AI_CONFIG.keys.gemini, this.geminiKey);
        localStorage.setItem(AI_CONFIG.keys.groq, this.groqKey);
        const provider = document.getElementById('ai-provider-select')?.value;
        if (provider) { this.provider = provider; localStorage.setItem(AI_CONFIG.keys.provider, provider); this.ui.provider.value = provider; this.populateModels(); }
        this.updateUIState();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.aiClient = new AIClient();
    const provider = document.getElementById('ai-provider-select');
    if (provider) provider.value = window.aiClient.provider;
    const gemini = document.getElementById('gemini-key'); if (gemini) gemini.value = window.aiClient.geminiKey;
    const groq = document.getElementById('groq-key'); if (groq) groq.value = window.aiClient.groqKey;
});
