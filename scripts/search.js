// Search Engine - Main Search Controller with Multi-Worker Fallback System
class SearchController {
    constructor() {
        // Multi-worker configuration
        this.workers = {
            primary: 'https://proxy.yoohoo.workers.dev',
            fallbacks: [
                'https://proxy1.yoohoo.workers.dev',
                'https://proxy2.yoohoo.workers.dev',
                'https://proxy3.yoohoo.workers.dev',
                'https://proxy4.yoohoo.workers.dev',
                'https://proxy5.yoohoo.workers.dev'
            ],
            currentIndex: 0
        };

        this.config = {
            safeSearch: 'moderate',
            language: 'en',
            aiEnabled: true,
            resultsPerPage: 10,
            searchProvider: 'all',
            useWorkerFallback: true,
            maxRetries: 3,
            requestTimeout: 15000
        };

        this.currentQuery = '';
        this.currentCategory = 'web';
        this.currentPage = 1;
        this.searchHistory = [];
        this.isSearching = false;
        this.abortController = null;

        // Worker health tracking
        this.workerHealth = new Map();
        this.initializeWorkerHealth();

        // DOM elements
        this.elements = {
            searchInput: null,
            searchForm: null,
            resultsContainer: null,
            resultsStats: null,
            imagesContainer: null,
            videosContainer: null,
            newsContainer: null,
            heroSection: null,
            resultsSection: null,
            imagesSection: null,
            videosSection: null,
            newsSection: null
        };

        this.init();
    }

    init() {
        this.cacheDOM();
        this.loadConfig();
        this.bindEvents();
        this.restoreSearch();
        this.attachKeyboardShortcuts();
        
        // Don't auto health check - it causes CORS errors
        // this.healthCheckAllWorkers();

        console.log('🔍 Search Controller initialized with', this.workers.fallbacks.length + 1, 'workers');
    }

    initializeWorkerHealth() {
        // Initialize health status for all workers
        [this.workers.primary, ...this.workers.fallbacks].forEach(worker => {
            this.workerHealth.set(worker, {
                healthy: true,
                lastCheck: 0,
                responseTime: 0,
                errorCount: 0,
                successCount: 0
            });
        });
    }

    cacheDOM() {
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.searchForm = document.getElementById('searchForm');
        this.elements.resultsContainer = document.getElementById('resultsContainer');
        this.elements.resultsStats = document.getElementById('resultsStats');
        this.elements.imagesContainer = document.getElementById('imagesContainer');
        this.elements.videosContainer = document.getElementById('videosContainer');
        this.elements.newsContainer = document.getElementById('newsContainer');
        this.elements.heroSection = document.getElementById('heroSection');
        this.elements.resultsSection = document.getElementById('resultsSection');
        this.elements.imagesSection = document.getElementById('imagesSection');
        this.elements.videosSection = document.getElementById('videosSection');
        this.elements.newsSection = document.getElementById('newsSection');
    }

    loadConfig() {
        const saved = localStorage.getItem('searchConfig');
        if (saved) {
            try {
                const loadedConfig = JSON.parse(saved);
                Object.assign(this.config, loadedConfig);
                
                // Update workers from settings if available
                if (loadedConfig.workerUrl) {
                    this.workers.primary = loadedConfig.workerUrl;
                    this.updateWorkerHealth();
                }
            } catch (e) {
                console.warn('Failed to load config:', e);
            }
        }
    }

    saveConfig() {
        localStorage.setItem('searchConfig', JSON.stringify(this.config));
    }

    bindEvents() {
        // Search form
        this.elements.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // Clear search button
        document.querySelector('.search-tool .fa-times').closest('button').addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.elements.searchInput.focus();
        });

        // Voice search button
        document.querySelector('.search-tool .fa-microphone').closest('button').addEventListener('click', () => {
            this.startVoiceSearch();
        });

        // Image search button
        document.querySelector('.search-tool .fa-camera').closest('button').addEventListener('click', () => {
            this.switchCategory('images');
            this.elements.searchInput.focus();
        });

        // I'm Feeling Lucky
        document.getElementById('luckyBtn').addEventListener('click', () => {
            this.feelingLucky();
        });

        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const category = btn.dataset.category;
                this.switchCategory(category);
                
                if (this.currentQuery) {
                    this.performSearch();
                }
            });
        });

        // Settings integration
        if (window.settingsManager) {
            document.addEventListener('settingsChanged', (e) => {
                this.applySettings(e.detail);
            });
        }

        // Handle back/forward navigation
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.query) {
                this.restoreSearchFromState(e.state);
            }
        });
    }

    attachKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Focus search with /
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.elements.searchInput.focus();
            }

            // Escape to clear search
            if (e.key === 'Escape' && document.activeElement === this.elements.searchInput) {
                this.elements.searchInput.value = '';
            }

            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
        });

        // Real-time suggestions
        let suggestionTimeout;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(suggestionTimeout);
            suggestionTimeout = setTimeout(() => {
                this.showSuggestions(e.target.value);
            }, 300);
        });
    }

    async performSearch(query = null) {
        const searchQuery = query || this.elements.searchInput.value.trim();
        
        if (!searchQuery) {
            this.showEmptyState('Please enter a search query');
            return;
        }

        // Cancel any ongoing search
        if (this.abortController) {
            this.abortController.abort();
        }

        this.isSearching = true;
        this.currentQuery = searchQuery;
        this.currentPage = 1;
        this.abortController = new AbortController();

        // Update UI
        this.showLoading();
        this.updateURL();
        this.addToHistory(searchQuery);

        try {
            await this.executeSearch(searchQuery);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Search was cancelled');
                return;
            }
            this.showError(`Search failed: ${error.message}`);
        } finally {
            this.isSearching = false;
            this.hideLoading();
        }
    }

    async executeSearch(query) {
        const endpoints = {
            web: '/search',
            images: '/images',
            videos: '/videos',
            news: '/news',
            all: '/all',
            massive: '/massive',
            weather: '/weather',
            github: '/github'
        };

        const endpoint = endpoints[this.currentCategory] || '/search';
        const params = new URLSearchParams({
            q: query,
            safe: this.config.safeSearch,
            page: this.currentPage
        });

        if (this.config.aiEnabled && (endpoint === '/search' || endpoint === '/all')) {
            params.append('ai', 'true');
        }

        this.showSection(this.currentCategory);

        try {
            const response = await this.fetchWithFallback(endpoint, params);
            
            if (response.error) {
                throw new Error(response.error);
            }

            this.processResponse(response);
            
        } catch (error) {
            console.error(`${this.currentCategory} search error:`, error);
            
            // Show error and provide alternative methods
            if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
                this.showCorsError();
            } else {
                this.showError('Search failed. Please try again.');
            }
        }
    }

    async fetchWithFallback(endpoint, params, retries = 0) {
        const maxRetries = this.config.maxRetries;
        
        try {
            // Try all workers
            const workers = [this.workers.primary, ...this.workers.fallbacks];
            
            for (const worker of workers) {
                try {
                    const startTime = performance.now();
                    const response = await this.fetchFromWorker(worker, endpoint, params);
                    const responseTime = performance.now() - startTime;
                    
                    // Update worker health
                    this.updateWorkerStatus(worker, true, responseTime);
                    
                    return response;
                } catch (error) {
                    this.updateWorkerStatus(worker, false);
                    console.warn(`Worker ${worker} failed:`, error.message);
                    continue; // Try next worker
                }
            }
            
            throw new Error('All workers failed');
            
        } catch (error) {
            if (retries < maxRetries) {
                console.log(`Retrying... (${retries + 1}/${maxRetries})`);
                await this.delay(1000 * (retries + 1)); // Exponential backoff
                return this.fetchWithFallback(endpoint, params, retries + 1);
            }
            throw error;
        }
    }

    async fetchFromWorker(workerUrl, endpoint, params) {
        const url = `${workerUrl}${endpoint}?${params.toString()}`;
        
        console.log('🌐 Fetching from:', url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

        try {
            // Use mode: 'cors' and simplified headers to avoid CORS preflight
            const response = await fetch(url, {
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                    // Don't send Content-Type for GET requests to avoid CORS preflight
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Validate response structure
            if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
                throw new Error('Empty response from worker');
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    updateWorkerStatus(workerUrl, success, responseTime = 0) {
        const health = this.workerHealth.get(workerUrl) || {
            healthy: true,
            lastCheck: Date.now(),
            responseTime: 0,
            errorCount: 0,
            successCount: 0
        };

        health.lastCheck = Date.now();
        
        if (success) {
            health.successCount++;
            health.errorCount = Math.max(0, health.errorCount - 1);
            health.responseTime = (health.responseTime * 0.7) + (responseTime * 0.3);
            
            if (health.successCount >= 3) {
                health.healthy = true;
            }
        } else {
            health.errorCount++;
            health.successCount = Math.max(0, health.successCount - 1);
            
            if (health.errorCount >= 3) {
                health.healthy = false;
                console.warn(`Worker ${workerUrl} marked as unhealthy`);
            }
            
            // Auto-recover after 5 minutes
            setTimeout(() => {
                const currentHealth = this.workerHealth.get(workerUrl);
                if (currentHealth && !currentHealth.healthy) {
                    currentHealth.healthy = true;
                    currentHealth.errorCount = 0;
                    console.log(`Worker ${workerUrl} auto-recovered`);
                }
            }, 5 * 60 * 1000);
        }

        this.workerHealth.set(workerUrl, health);
    }

    showCorsError() {
        const container = this.getCurrentResultsContainer();
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-ban"></i>
                    <h3>CORS Error</h3>
                    <p>Cannot connect to search workers due to CORS restrictions.</p>
                    <div class="error-actions">
                        <button class="retry-btn" onclick="window.searchController.retryWithProxy()">
                            <i class="fas fa-server"></i> Use CORS Proxy
                        </button>
                        <button class="fallback-btn" onclick="window.searchController.useLocalSearch()">
                            <i class="fas fa-desktop"></i> Use Local Search
                        </button>
                    </div>
                    <div class="error-tips">
                        <p><strong>Solutions:</strong></p>
                        <ul>
                            <li>Deploy this app to a proper domain (not localhost)</li>
                            <li>Use a browser extension to disable CORS (for development)</li>
                            <li>Configure your Cloudflare Workers to allow localhost</li>
                            <li>Use the CORS proxy option above</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    async retryWithProxy() {
        // Use a CORS proxy to bypass CORS restrictions
        const proxyUrl = 'https://corsproxy.io/?';
        
        if (this.currentQuery) {
            try {
                this.showLoading();
                
                // Construct the URL to fetch via proxy
                const targetUrl = `${this.workers.primary}/search?q=${encodeURIComponent(this.currentQuery)}&safe=${this.config.safeSearch}&page=${this.currentPage}&ai=${this.config.aiEnabled}`;
                const proxyTarget = proxyUrl + encodeURIComponent(targetUrl);
                
                console.log('Using CORS proxy:', proxyTarget);
                
                const response = await fetch(proxyTarget, {
                    signal: AbortSignal.timeout(10000)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.displayWebResults(data.results || data);
                    this.updateSearchStats({...data, proxy: true});
                } else {
                    throw new Error('Proxy request failed');
                }
            } catch (error) {
                this.showError(`Proxy search failed: ${error.message}`);
            } finally {
                this.hideLoading();
            }
        }
    }

    async useLocalSearch() {
        // Implement a simple local search without external APIs
        if (this.currentQuery) {
            this.showLoading();
            
            // Simulate local results (you can expand this with actual local data)
            const mockResults = [
                {
                    title: 'Search Tips',
                    url: '#',
                    snippet: 'Try deploying to a proper domain to avoid CORS issues. Localhost is restricted by browser security policies.',
                    displayUrl: 'search.tips'
                },
                {
                    title: 'CORS Documentation',
                    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
                    snippet: 'Learn about Cross-Origin Resource Sharing and how to configure it properly.',
                    displayUrl: 'developer.mozilla.org'
                },
                {
                    title: 'Cloudflare Workers CORS Guide',
                    url: 'https://developers.cloudflare.com/workers/examples/cors-header-proxy/',
                    snippet: 'Guide on configuring CORS headers in Cloudflare Workers.',
                    displayUrl: 'developers.cloudflare.com'
                }
            ];
            
            // Add more results based on query
            if (this.currentQuery.toLowerCase().includes('test') || this.currentQuery.toLowerCase().includes('hello')) {
                mockResults.push({
                    title: 'Test Result',
                    url: '#',
                    snippet: 'This is a test result from local search mode.',
                    displayUrl: 'local.test'
                });
            }
            
            setTimeout(() => {
                this.displayWebResults(mockResults);
                this.updateSearchStats({
                    results: mockResults,
                    timestamp: new Date().toISOString(),
                    local: true
                });
                this.hideLoading();
            }, 500);
        }
    }

    processResponse(response) {
        switch (this.currentCategory) {
            case 'web':
                this.displayWebResults(response.results || response);
                break;
            case 'images':
                this.displayImageResults(response.results || response);
                break;
            case 'videos':
                this.displayVideoResults(response.results || response);
                break;
            case 'news':
                this.displayNewsResults(response.results || response);
                break;
            case 'all':
                this.displayComprehensiveResults(response);
                break;
            default:
                this.displayWebResults(response.results || response);
        }

        this.updateSearchStats(response);
        
        // Show AI summaries if available
        if (response.aiSummaries) {
            this.displayAISummaries(response.aiSummaries);
        }
    }

    showSection(section) {
        // Hide all sections
        this.elements.heroSection.classList.add('hidden');
        this.elements.resultsSection.classList.add('hidden');
        this.elements.imagesSection.classList.add('hidden');
        this.elements.videosSection.classList.add('hidden');
        this.elements.newsSection.classList.add('hidden');

        // Show the requested section
        switch (section) {
            case 'results':
                this.elements.resultsSection.classList.remove('hidden');
                break;
            case 'images':
                this.elements.imagesSection.classList.remove('hidden');
                break;
            case 'videos':
                this.elements.videosSection.classList.remove('hidden');
                break;
            case 'news':
                this.elements.newsSection.classList.remove('hidden');
                break;
        }
    }

    switchCategory(category) {
        this.currentCategory = category;
        
        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Update search placeholder
        const placeholders = {
            web: 'Search the web...',
            images: 'Search for images...',
            videos: 'Search for videos...',
            news: 'Search for news...'
        };

        this.elements.searchInput.placeholder = placeholders[category] || 'Search...';
    }

    showLoading() {
        const container = this.getCurrentResultsContainer();
        if (container) {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Searching "${this.currentQuery}"...</p>
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading state is cleared when results are displayed
    }

    showError(message) {
        const container = this.getCurrentResultsContainer();
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Search Error</h3>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="window.searchController.retrySearch()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    showEmptyState(message) {
        const container = this.getCurrentResultsContainer();
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    async startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice search is not supported in your browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = this.config.language || 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.elements.searchInput.value = transcript;
            this.performSearch();
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
        };
    }

    async showSuggestions(query) {
        if (query.length < 2) return;

        // Remove existing suggestions
        this.removeSuggestions();

        try {
            const suggestions = await this.fetchSuggestions(query);
            if (suggestions.length > 0) {
                this.displaySuggestions(suggestions);
            }
        } catch (error) {
            console.log('Suggestions fetch failed:', error);
        }
    }

    async fetchSuggestions(query) {
        // Try worker first
        const workers = [this.workers.primary, ...this.workers.fallbacks];
        
        for (const worker of workers) {
            try {
                const response = await fetch(`${worker}/suggest?q=${encodeURIComponent(query)}`, {
                    signal: AbortSignal.timeout(2000),
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.suggestions) {
                        return data.suggestions.slice(0, 8);
                    }
                }
            } catch (error) {
                continue;
            }
        }

        // Local suggestions based on history
        const historySuggestions = this.searchHistory
            .filter(entry => entry.query.toLowerCase().includes(query.toLowerCase()))
            .map(entry => entry.query)
            .slice(0, 5);

        // Generate related suggestions
        const related = [
            `${query} meaning`,
            `${query} definition`,
            `${query} examples`,
            `${query} tutorial`,
            `what is ${query}`,
            `how to ${query}`
        ].slice(0, 3);

        return [...new Set([...historySuggestions, ...related])].slice(0, 8);
    }

    displaySuggestions(suggestions) {
        // Create suggestions dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'suggestions-dropdown';
        dropdown.id = 'searchSuggestions';

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <i class="fas fa-search"></i>
                <span>${suggestion}</span>
            `;
            
            item.addEventListener('click', () => {
                this.elements.searchInput.value = suggestion;
                this.performSearch();
                this.removeSuggestions();
            });
            
            dropdown.appendChild(item);
        });

        // Position below search input
        const searchBox = this.elements.searchInput.closest('.search-box');
        searchBox.appendChild(dropdown);
    }

    removeSuggestions() {
        const dropdown = document.getElementById('searchSuggestions');
        if (dropdown) {
            dropdown.remove();
        }
    }

    feelingLucky() {
        const query = this.elements.searchInput.value.trim();
        if (!query) return;

        // Quick search and redirect to first result
        this.searchWeb(query).then(() => {
            const firstResult = this.elements.resultsContainer.querySelector('.result-title a');
            if (firstResult) {
                window.open(firstResult.href, '_blank');
            } else {
                this.showError('No results found for "I\'m Feeling Lucky"');
            }
        });
    }

    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('q', this.currentQuery);
        url.searchParams.set('cat', this.currentCategory);
        url.searchParams.set('page', this.currentPage);
        
        window.history.pushState({
            query: this.currentQuery,
            category: this.currentCategory,
            page: this.currentPage
        }, '', url);
    }

    restoreSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        const category = urlParams.get('cat') || 'web';
        
        if (query) {
            this.elements.searchInput.value = query;
            this.switchCategory(category);
            this.performSearch();
        }
    }

    restoreSearchFromState(state) {
        this.elements.searchInput.value = state.query;
        this.switchCategory(state.category);
        this.currentPage = state.page || 1;
        this.performSearch(state.query);
    }

    addToHistory(query) {
        const searchEntry = {
            query,
            category: this.currentCategory,
            timestamp: new Date().toISOString(),
            worker: this.workers.currentIndex
        };

        this.searchHistory.unshift(searchEntry);
        
        // Keep only last 50 searches
        if (this.searchHistory.length > 50) {
            this.searchHistory.pop();
        }

        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }

    applySettings(settings) {
        if (settings.search) {
            this.config.workerUrl = settings.search.workerUrl || this.config.workerUrl;
            this.config.safeSearch = settings.search.safeSearch;
            this.config.resultsPerPage = settings.search.resultsPerPage;
            this.config.searchProvider = settings.search.searchProvider;
            this.config.useWorkerFallback = settings.search.useWorkerFallback !== false;
        }
        
        if (settings.general) {
            this.config.language = settings.general.language;
        }
        
        if (settings.advanced) {
            this.config.maxRetries = settings.advanced.maxRetries || 3;
            this.config.requestTimeout = settings.advanced.requestTimeout || 15000;
        }
        
        this.saveConfig();
    }

    retrySearch() {
        if (this.currentQuery) {
            this.performSearch();
        }
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCurrentResultsContainer() {
        switch (this.currentCategory) {
            case 'web': case 'all': case 'massive':
                return this.elements.resultsContainer;
            case 'images':
                return this.elements.imagesContainer;
            case 'videos':
                return this.elements.videosContainer;
            case 'news':
                return this.elements.newsContainer;
            default:
                return this.elements.resultsContainer;
        }
    }

    // Display methods
    displayWebResults(results) {
        const container = this.elements.resultsContainer;
        container.innerHTML = '';

        if (!results || results.length === 0) {
            this.showEmptyState('No results found');
            return;
        }

        results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index);
            container.appendChild(resultElement);
        });
    }

    createResultElement(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.dataset.index = index;

        const domain = result.displayUrl || this.extractDomain(result.url);
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        const aiSummary = result.aiSummary || '';
        
        div.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    <img src="${favicon}" alt="${domain}" class="result-favicon" onerror="this.src='https://www.google.com/s2/favicons?domain=google.com&sz=32'">
                    <div class="result-source">
                        <span class="result-domain">${domain}</span>
                        ${result.source ? `<span class="result-provider">${result.source}</span>` : ''}
                    </div>
                </div>
                <h3 class="result-title">
                    <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                        ${result.title || 'No title'}
                    </a>
                </h3>
                ${aiSummary ? `<div class="ai-summary">🤖 ${aiSummary}</div>` : ''}
                <p class="result-snippet">${result.snippet || result.description || ''}</p>
                <div class="result-meta">
                    <span class="result-url">${this.shortenUrl(result.url)}</span>
                    ${result.score ? `<span class="result-score">${Math.round(result.score)}%</span>` : ''}
                </div>
            </div>
        `;

        return div;
    }

    displayImageResults(images) {
        const container = this.elements.imagesContainer;
        container.innerHTML = '';

        if (!images || images.length === 0) {
            container.innerHTML = '<div class="empty-state">No images found</div>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'image-grid';

        images.slice(0, 100).forEach((image, index) => {
            const imageElement = this.createImageElement(image, index);
            grid.appendChild(imageElement);
        });

        container.appendChild(grid);
    }

    createImageElement(image, index) {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.index = index;

        const title = image.title || 'Image';
        const thumbnail = image.thumbnail || image.image || '';
        const sourceUrl = image.source || image.url || '#';
        const provider = image.provider || '';

        div.innerHTML = `
            <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="image-link">
                <div class="image-container">
                    <img src="${thumbnail}" alt="${title}" loading="lazy" class="image-thumbnail" onerror="this.style.display='none'">
                    <div class="image-overlay">
                        <div class="image-title">${this.truncateText(title, 40)}</div>
                        <div class="image-provider">${provider}</div>
                    </div>
                </div>
            </a>
        `;

        return div;
    }

    displayVideoResults(videos) {
        const container = this.elements.videosContainer;
        container.innerHTML = '';

        if (!videos || videos.length === 0) {
            container.innerHTML = '<div class="empty-state">No videos found</div>';
            return;
        }

        videos.slice(0, 50).forEach((video, index) => {
            const videoElement = this.createVideoElement(video, index);
            container.appendChild(videoElement);
        });
    }

    createVideoElement(video, index) {
        const div = document.createElement('div');
        div.className = 'video-item';
        div.dataset.index = index;

        const thumbnail = video.thumbnail || '';
        const duration = video.durationFormatted || this.formatDuration(video.duration);
        const views = video.viewsFormatted || this.formatNumber(video.views);
        const published = video.publishedFormatted || this.formatRelativeTime(video.publishedAt);

        div.innerHTML = `
            <div class="video-content">
                <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="video-thumbnail-link">
                    <div class="video-thumbnail-container">
                        <img src="${thumbnail}" alt="${video.title}" class="video-thumbnail" onerror="this.style.display='none'">
                        ${duration ? `<span class="video-duration">${duration}</span>` : ''}
                        <div class="video-play-button">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                </a>
                <div class="video-details">
                    <h3 class="video-title">
                        <a href="${video.url}" target="_blank" rel="noopener noreferrer">
                            ${video.title || 'No title'}
                        </a>
                    </h3>
                    <div class="video-meta">
                        ${views ? `<span class="video-views"><i class="fas fa-eye"></i> ${views}</span>` : ''}
                        ${published ? `<span class="video-date"><i class="far fa-clock"></i> ${published}</span>` : ''}
                    </div>
                    ${video.author ? `<div class="video-author"><i class="fas fa-user"></i> ${video.author}</div>` : ''}
                    ${video.description ? `<p class="video-description">${this.truncateText(video.description, 120)}</p>` : ''}
                </div>
            </div>
        `;

        return div;
    }

    displayNewsResults(news) {
        const container = this.elements.newsContainer;
        container.innerHTML = '';

        if (!news || news.length === 0) {
            container.innerHTML = '<div class="empty-state">No news found</div>';
            return;
        }

        news.slice(0, 30).forEach((article, index) => {
            const articleElement = this.createNewsElement(article, index);
            container.appendChild(articleElement);
        });
    }

    createNewsElement(article, index) {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.dataset.index = index;

        const source = article.source || this.extractDomain(article.url);
        const published = article.publishedFormatted || this.formatRelativeTime(article.publishedAt);
        const image = article.image || article.thumbnail || '';
        const aiSummary = article.aiSummary || '';

        div.innerHTML = `
            <div class="news-content">
                ${image ? `
                    <div class="news-image">
                        <img src="${image}" alt="${article.title}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                ` : ''}
                <div class="news-text">
                    <div class="news-source">${source}</div>
                    <h3 class="news-title">
                        <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                            ${article.title || 'No title'}
                        </a>
                    </h3>
                    ${aiSummary ? `<div class="news-ai-summary">🤖 ${aiSummary}</div>` : ''}
                    <p class="news-description">${article.description || article.snippet || ''}</p>
                    <div class="news-meta">
                        ${published ? `<span class="news-date"><i class="far fa-calendar"></i> ${published}</span>` : ''}
                        ${article.author ? `<span class="news-author"><i class="fas fa-user-edit"></i> ${article.author}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        return div;
    }

    displayComprehensiveResults(response) {
        // Simple implementation for comprehensive results
        if (response.results && response.results.web) {
            this.displayWebResults(response.results.web);
        }
    }

    displayAISummaries(summaries) {
        const container = this.elements.resultsContainer;
        
        // Insert AI summaries at the top
        Object.entries(summaries).forEach(([section, summary]) => {
            if (summary && section !== 'overall') {
                const summaryDiv = document.createElement('div');
                summaryDiv.className = 'ai-section-summary';
                summaryDiv.innerHTML = `
                    <div class="ai-summary-header">
                        <i class="fas fa-robot"></i>
                        <h4>AI Summary: ${section.charAt(0).toUpperCase() + section.slice(1)}</h4>
                    </div>
                    <div class="ai-summary-content">${summary}</div>
                `;
                
                // Insert at the beginning of the container
                if (container.firstChild) {
                    container.insertBefore(summaryDiv, container.firstChild);
                } else {
                    container.appendChild(summaryDiv);
                }
            }
        });
    }

    updateSearchStats(response) {
        if (!this.elements.resultsStats) return;

        const stats = response.stats || {};
        const total = stats.total || (Array.isArray(response.results) ? response.results.length : 
                                   (response.results && typeof response.results === 'object' ? 
                                    Object.values(response.results).flat().length : 0));
        
        const time = response.timestamp ? this.formatRelativeTime(response.timestamp) : 'Just now';
        const source = response.proxy ? ' (Proxy)' : response.local ? ' (Local)' : '';

        this.elements.resultsStats.innerHTML = `
            ${this.formatNumber(total)} results${source} · ${time}
            ${stats.aiEnabled ? ' · 🤖 AI' : ''}
        `;
    }

    // Helper methods
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    shortenUrl(url, maxLength = 50) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    }

    formatDuration(seconds) {
        if (!seconds) return '';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatRelativeTime(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffDay > 30) {
            return date.toLocaleDateString();
        } else if (diffDay > 0) {
            return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        } else if (diffHour > 0) {
            return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffMin > 0) {
            return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.searchController = new SearchController();
    
    // Export for global use
    window.performSearch = (query, options = {}) => {
        if (query) {
            window.searchController.elements.searchInput.value = query;
        }
        window.searchController.performSearch(query);
    };
});