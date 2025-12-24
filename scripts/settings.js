// Settings Manager Module

class SettingsManager {
    constructor() {
        this.defaultSettings = {
            // General
            workerUrl: '',
            language: 'en',
            region: 'us',
            timezone: 'auto',
            
            // Search
            safeSearch: 'moderate',
            resultsPerPage: 10,
            instantResults: true,
            aiEnabled: true,
            searchEngine: 'worker',
            
            // Privacy
            doNotTrack: true,
            clearCookies: false,
            saveHistory: true,
            essentialCookies: true,
            analyticsCookies: false,
            
            // Appearance
            theme: 'light',
            fontSize: 'medium',
            animations: true,
            compactMode: false,
            customTheme: null,
            
            // Advanced
            developerMode: false,
            requestTimeout: 30,
            cacheResults: true,
            cacheDuration: 300,
            
            // Features
            voiceSearch: true,
            imageSearch: true,
            newsAlerts: false,
            weatherAlerts: false,
            keyboardShortcuts: true
        };
        
        this.currentSettings = {};
        this.load();
    }

    /**
     * Load settings from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem('searchSettings');
            if (saved) {
                this.currentSettings = JSON.parse(saved);
            } else {
                this.currentSettings = { ...this.defaultSettings };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.currentSettings = { ...this.defaultSettings };
        }
        
        this.applySettings();
    }

    /**
     * Save settings to localStorage
     */
    save() {
        try {
            localStorage.setItem('searchSettings', JSON.stringify(this.currentSettings));
            this.applySettings();
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Apply current settings
     */
    applySettings() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.currentSettings.theme);
        
        // Apply font size
        const fontSizes = {
            'small': '12px',
            'medium': '14px',
            'large': '16px',
            'xlarge': '18px'
        };
        document.documentElement.style.setProperty('--font-size', fontSizes[this.currentSettings.fontSize] || '14px');
        
        // Apply animations
        if (!this.currentSettings.animations) {
            document.documentElement.style.setProperty('--transition-fast', '0s');
            document.documentElement.style.setProperty('--transition-normal', '0s');
            document.documentElement.style.setProperty('--transition-slow', '0s');
        }
        
        // Apply compact mode
        if (this.currentSettings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
        
        // Apply custom theme
        if (this.currentSettings.customTheme) {
            this.applyCustomTheme(this.currentSettings.customTheme);
        }
        
        // Dispatch settings changed event
        window.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: this.currentSettings
        }));
    }

    /**
     * Get setting value
     */
    get(key) {
        return this.currentSettings[key] !== undefined ? this.currentSettings[key] : this.defaultSettings[key];
    }

    /**
     * Set setting value
     */
    set(key, value) {
        this.currentSettings[key] = value;
        this.save();
    }

    /**
     * Reset to default settings
     */
    reset() {
        this.currentSettings = { ...this.defaultSettings };
        this.save();
        return true;
    }

    /**
     * Export settings as JSON
     */
    export() {
        const data = {
            settings: this.currentSettings,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        Utils.exportAsJSON(data, 'search-settings.json');
        return data;
    }

    /**
     * Import settings from JSON
     */
    import(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.settings && data.version) {
                this.currentSettings = { ...this.defaultSettings, ...data.settings };
                this.save();
                return true;
            }
            
            throw new Error('Invalid settings format');
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Get all settings as object
     */
    getAll() {
        return { ...this.currentSettings };
    }

    /**
     * Set multiple settings at once
     */
    setMultiple(settings) {
        this.currentSettings = { ...this.currentSettings, ...settings };
        this.save();
    }

    /**
     * Validate settings
     */
    validate() {
        const errors = [];
        
        // Validate worker URL
        if (this.currentSettings.workerUrl && !Utils.validateURL(this.currentSettings.workerUrl)) {
            errors.push('Invalid worker URL');
        }
        
        // Validate timeout
        if (this.currentSettings.requestTimeout < 5 || this.currentSettings.requestTimeout > 120) {
            errors.push('Request timeout must be between 5 and 120 seconds');
        }
        
        // Validate cache duration
        if (this.currentSettings.cacheDuration < 60 || this.currentSettings.cacheDuration > 3600) {
            errors.push('Cache duration must be between 60 and 3600 seconds');
        }
        
        return errors;
    }

    /**
     * Get settings summary
     */
    getSummary() {
        return {
            general: {
                workerUrl: this.currentSettings.workerUrl ? 'Configured' : 'Not configured',
                language: this.currentSettings.language,
                region: this.currentSettings.region
            },
            search: {
                safeSearch: this.currentSettings.safeSearch,
                resultsPerPage: this.currentSettings.resultsPerPage,
                aiEnabled: this.currentSettings.aiEnabled
            },
            privacy: {
                doNotTrack: this.currentSettings.doNotTrack,
                saveHistory: this.currentSettings.saveHistory
            },
            appearance: {
                theme: this.currentSettings.theme,
                fontSize: this.currentSettings.fontSize
            }
        };
    }

    /**
     * Clear all settings
     */
    clear() {
        localStorage.removeItem('searchSettings');
        this.currentSettings = { ...this.defaultSettings };
        this.applySettings();
    }

    /**
     * Apply custom theme
     */
    applyCustomTheme(themeConfig) {
        if (!themeConfig || typeof themeConfig !== 'object') return;
        
        const root = document.documentElement;
        
        // Apply color variables
        if (themeConfig.colors) {
            Object.entries(themeConfig.colors).forEach(([key, value]) => {
                root.style.setProperty(`--theme-${key}`, value);
            });
        }
        
        // Apply custom CSS
        if (themeConfig.customCSS) {
            let styleElement = document.getElementById('custom-theme-style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'custom-theme-style';
                document.head.appendChild(styleElement);
            }
            styleElement.textContent = themeConfig.customCSS;
        }
    }

    /**
     * Create custom theme
     */
    createCustomTheme(name, colors, customCSS = '') {
        const theme = {
            name,
            colors: {
                primary: colors.primary || '#4285f4',
                secondary: colors.secondary || '#34a853',
                accent: colors.accent || '#ea4335',
                background: colors.background || '#ffffff',
                surface: colors.surface || '#f8f9fa',
                text: colors.text || '#202124',
                border: colors.border || '#dadce0'
            },
            customCSS
        };
        
        return theme;
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return [
            { id: 'light', name: 'Light', colors: { primary: '#4285f4', secondary: '#34a853', accent: '#ea4335' } },
            { id: 'dark', name: 'Dark', colors: { primary: '#8ab4f8', secondary: '#81c995', accent: '#f28b82' } },
            { id: 'blue', name: 'Blue', colors: { primary: '#1a73e8', secondary: '#0d652d', accent: '#d93025' } },
            { id: 'midnight', name: 'Midnight', colors: { primary: '#3b82f6', secondary: '#10b981', accent: '#ef4444' } },
            { id: 'sunset', name: 'Sunset', colors: { primary: '#ff6b6b', secondary: '#4ecdc4', accent: '#ffd166' } },
            { id: 'forest', name: 'Forest', colors: { primary: '#2d6a4f', secondary: '#40916c', accent: '#d8f3dc' } },
            { id: 'ocean', name: 'Ocean', colors: { primary: '#0077b6', secondary: '#00b4d8', accent: '#90e0ef' } },
            { id: 'violet', name: 'Violet', colors: { primary: '#7b2cbf', secondary: '#9d4edd', accent: '#c77dff' } }
        ];
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'es', name: 'Spanish', native: 'Español' },
            { code: 'fr', name: 'French', native: 'Français' },
            { code: 'de', name: 'German', native: 'Deutsch' },
            { code: 'ja', name: 'Japanese', native: '日本語' },
            { code: 'zh', name: 'Chinese', native: '中文' },
            { code: 'ko', name: 'Korean', native: '한국어' },
            { code: 'ru', name: 'Russian', native: 'Русский' },
            { code: 'ar', name: 'Arabic', native: 'العربية' },
            { code: 'pt', name: 'Portuguese', native: 'Português' }
        ];
    }

    /**
     * Get available regions
     */
    getAvailableRegions() {
        return [
            { code: 'us', name: 'United States', flag: '🇺🇸' },
            { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
            { code: 'ca', name: 'Canada', flag: '🇨🇦' },
            { code: 'au', name: 'Australia', flag: '🇦🇺' },
            { code: 'de', name: 'Germany', flag: '🇩🇪' },
            { code: 'fr', name: 'France', flag: '🇫🇷' },
            { code: 'jp', name: 'Japan', flag: '🇯🇵' },
            { code: 'cn', name: 'China', flag: '🇨🇳' },
            { code: 'in', name: 'India', flag: '🇮🇳' },
            { code: 'br', name: 'Brazil', flag: '🇧🇷' },
            { code: 'global', name: 'Global', flag: '🌍' }
        ];
    }

    /**
     * Get available search engines
     */
    getAvailableSearchEngines() {
        return [
            { id: 'worker', name: 'Search Engine', url: this.currentSettings.workerUrl },
            { id: 'google', name: 'Google', url: 'https://www.google.com/search' },
            { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/' },
            { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search' },
            { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search' },
            { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/' },
            { id: 'searx', name: 'Searx', url: 'https://searx.be/' }
        ];
    }

    /**
     * Get keyboard shortcuts
     */
    getKeyboardShortcuts() {
        return [
            { key: '/', action: 'Focus search box', global: true },
            { key: 'Esc', action: 'Clear search / Close dialogs', global: true },
            { key: 'Ctrl+K / Cmd+K', action: 'Open search box', global: true },
            { key: 'Ctrl+Enter / Cmd+Enter', action: 'Open first result', global: true },
            { key: 'j / k', action: 'Navigate results', context: 'results' },
            { key: 'o', action: 'Open selected result', context: 'results' },
            { key: 's', action: 'Share selected result', context: 'results' },
            { key: 't', action: 'Open in new tab', context: 'results' },
            { key: '?', action: 'Show help', global: true },
            { key: 'Ctrl+, / Cmd+,', action: 'Open settings', global: true }
        ];
    }

    /**
     * Get privacy policy summary
     */
    getPrivacyPolicy() {
        return {
            dataCollection: {
                searchHistory: this.currentSettings.saveHistory,
                cookies: this.currentSettings.essentialCookies || this.currentSettings.analyticsCookies,
                analytics: this.currentSettings.analyticsCookies,
                location: false,
                personalInfo: false
            },
            dataUsage: {
                improveResults: true,
                personalization: this.currentSettings.saveHistory,
                analytics: this.currentSettings.analyticsCookies,
                marketing: false,
                thirdParty: false
            },
            dataRetention: {
                searchHistory: '30 days',
                cookies: 'Session',
                analytics: '1 year',
                backups: '90 days'
            },
            userRights: {
                export: true,
                delete: true,
                optOut: true,
                access: true
            }
        };
    }

    /**
     * Generate settings report
     */
    generateReport() {
        const summary = this.getSummary();
        const privacy = this.getPrivacyPolicy();
        const validation = this.validate();
        
        return {
            timestamp: new Date().toISOString(),
            summary,
            privacy,
            validation: {
                isValid: validation.length === 0,
                errors: validation
            },
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * Generate recommendations based on settings
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (!this.currentSettings.workerUrl) {
            recommendations.push('Configure your worker URL to start searching');
        }
        
        if (this.currentSettings.safeSearch === 'off') {
            recommendations.push('Consider enabling SafeSearch for family-friendly results');
        }
        
        if (!this.currentSettings.aiEnabled) {
            recommendations.push('Enable AI summaries for better search insights');
        }
        
        if (!this.currentSettings.saveHistory) {
            recommendations.push('Enable search history for personalized results');
        }
        
        if (this.currentSettings.resultsPerPage < 10) {
            recommendations.push('Increase results per page for better browsing');
        }
        
        return recommendations;
    }

    /**
     * Migrate settings from older versions
     */
    migrate() {
        // Check version and migrate if needed
        const version = localStorage.getItem('settingsVersion') || '1.0.0';
        
        if (version === '1.0.0') {
            // Migration from v1.0.0 to v1.1.0
            if (!this.currentSettings.searchEngine) {
                this.currentSettings.searchEngine = 'worker';
            }
            
            if (!this.currentSettings.keyboardShortcuts) {
                this.currentSettings.keyboardShortcuts = true;
            }
            
            localStorage.setItem('settingsVersion', '1.1.0');
        }
        
        return true;
    }

    /**
     * Backup settings
     */
    backup() {
        const backup = {
            settings: this.currentSettings,
            timestamp: new Date().toISOString(),
            version: '1.1.0',
            checksum: this.generateChecksum()
        };
        
        localStorage.setItem('settingsBackup', JSON.stringify(backup));
        return backup;
    }

    /**
     * Restore from backup
     */
    restore() {
        try {
            const backup = localStorage.getItem('settingsBackup');
            if (!backup) return false;
            
            const data = JSON.parse(backup);
            if (this.validateChecksum(data)) {
                this.currentSettings = data.settings;
                this.save();
                return true;
            }
        } catch (error) {
            console.error('Failed to restore backup:', error);
        }
        
        return false;
    }

    /**
     * Generate checksum for settings
     */
    generateChecksum() {
        const str = JSON.stringify(this.currentSettings);
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(16);
    }

    /**
     * Validate checksum
     */
    validateChecksum(data) {
        const expected = this.generateChecksum();
        return data.checksum === expected;
    }

    /**
     * Clear cache
     */
    clearCache() {
        // Clear search cache
        if (window.searchService) {
            window.searchService.clearCache();
        }
        
        // Clear localStorage items with search prefix
        Utils.clearLocalStorageByPrefix('search_');
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        return true;
    }

    /**
     * Clear all data
     */
    clearAllData() {
        this.clearCache();
        this.clear();
        localStorage.clear();
        return true;
    }

    /**
     * Get storage usage
     */
    getStorageUsage() {
        const settingsSize = JSON.stringify(this.currentSettings).length * 2;
        const totalSize = Utils.getLocalStorageSize();
        
        return {
            settings: Utils.formatFileSize(settingsSize),
            total: totalSize,
            items: Object.keys(localStorage).length
        };
    }

    /**
     * Optimize settings
     */
    optimize() {
        const recommendations = [];
        
        // Check for unused settings
        if (this.currentSettings.resultsPerPage > 50) {
            recommendations.push('Consider reducing results per page for better performance');
        }
        
        if (this.currentSettings.cacheDuration > 600) {
            recommendations.push('Consider reducing cache duration to free up memory');
        }
        
        if (this.currentSettings.animations && Utils.isMobile()) {
            recommendations.push('Consider disabling animations on mobile for better performance');
        }
        
        return recommendations;
    }

    /**
     * Create settings UI
     */
    createSettingsUI() {
        const themes = this.getAvailableThemes();
        const languages = this.getAvailableLanguages();
        const regions = this.getAvailableRegions();
        const searchEngines = this.getAvailableSearchEngines();
        const shortcuts = this.getKeyboardShortcuts();
        
        return {
            general: this.createGeneralSettingsUI(languages, regions),
            search: this.createSearchSettingsUI(searchEngines),
            privacy: this.createPrivacySettingsUI(),
            appearance: this.createAppearanceSettingsUI(themes),
            advanced: this.createAdvancedSettingsUI(),
            shortcuts: this.createShortcutsUI(shortcuts),
            about: this.createAboutUI()
        };
    }

    /**
     * Create general settings UI
     */
    createGeneralSettingsUI(languages, regions) {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-globe"></i> General</h4>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Worker URL</span>
                        <span>Your Cloudflare Worker endpoint</span>
                    </div>
                    <div class="setting-control">
                        <div class="input-wrapper">
                            <input type="url" 
                                   id="settingWorkerUrl" 
                                   value="${this.currentSettings.workerUrl || ''}"
                                   placeholder="https://your-worker.workers.dev">
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Language</span>
                        <span>Interface language</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingLanguage">
                                ${languages.map(lang => `
                                    <option value="${lang.code}" ${this.currentSettings.language === lang.code ? 'selected' : ''}>
                                        ${lang.name} (${lang.native})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Region</span>
                        <span>Search region preference</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingRegion">
                                ${regions.map(region => `
                                    <option value="${region.code}" ${this.currentSettings.region === region.code ? 'selected' : ''}>
                                        ${region.flag} ${region.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Timezone</span>
                        <span>Time display preference</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingTimezone">
                                <option value="auto" ${this.currentSettings.timezone === 'auto' ? 'selected' : ''}>Auto-detect</option>
                                <option value="utc" ${this.currentSettings.timezone === 'utc' ? 'selected' : ''}>UTC</option>
                                <option value="local" ${this.currentSettings.timezone === 'local' ? 'selected' : ''}>Local Time</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create search settings UI
     */
    createSearchSettingsUI(searchEngines) {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-search"></i> Search</h4>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Default Search Engine</span>
                        <span>Primary search provider</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingSearchEngine">
                                ${searchEngines.map(engine => `
                                    <option value="${engine.id}" ${this.currentSettings.searchEngine === engine.id ? 'selected' : ''}>
                                        ${engine.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Safe Search</span>
                        <span>Filter explicit content</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingSafeSearch">
                                <option value="moderate" ${this.currentSettings.safeSearch === 'moderate' ? 'selected' : ''}>Moderate</option>
                                <option value="strict" ${this.currentSettings.safeSearch === 'strict' ? 'selected' : ''}>Strict</option>
                                <option value="off" ${this.currentSettings.safeSearch === 'off' ? 'selected' : ''}>Off</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Results per page</span>
                        <span>Number of results to display</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingResultsPerPage">
                                <option value="10" ${this.currentSettings.resultsPerPage === 10 ? 'selected' : ''}>10</option>
                                <option value="25" ${this.currentSettings.resultsPerPage === 25 ? 'selected' : ''}>25</option>
                                <option value="50" ${this.currentSettings.resultsPerPage === 50 ? 'selected' : ''}>50</option>
                                <option value="100" ${this.currentSettings.resultsPerPage === 100 ? 'selected' : ''}>100</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Instant Results</span>
                        <span>Show results as you type</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingInstantResults" ${this.currentSettings.instantResults ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>AI Summaries</span>
                        <span>Enable AI-generated summaries</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingAIEnabled" ${this.currentSettings.aiEnabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create privacy settings UI
     */
    createPrivacySettingsUI() {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-shield-alt"></i> Privacy</h4>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Do Not Track</span>
                        <span>Send Do Not Track request</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingDoNotTrack" ${this.currentSettings.doNotTrack ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Clear cookies on exit</span>
                        <span>Automatically clear cookies</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingClearCookies" ${this.currentSettings.clearCookies ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Search History</span>
                        <span>Save your search history</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingSaveHistory" ${this.currentSettings.saveHistory ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="setting-group">
                <h4><i class="fas fa-cookie-bite"></i> Cookies</h4>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Essential Cookies</span>
                        <span>Required for basic functionality</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingEssentialCookies" ${this.currentSettings.essentialCookies ? 'checked' : ''} disabled>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Analytics Cookies</span>
                        <span>Help improve the service</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingAnalyticsCookies" ${this.currentSettings.analyticsCookies ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create appearance settings UI
     */
    createAppearanceSettingsUI(themes) {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-palette"></i> Appearance</h4>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Theme</span>
                        <span>Choose interface theme</span>
                    </div>
                    <div class="setting-control">
                        <div class="theme-selector">
                            ${themes.map(theme => `
                                <div class="theme-option ${this.currentSettings.theme === theme.id ? 'active' : ''}" 
                                     data-theme="${theme.id}">
                                    <div class="theme-preview ${theme.id}" style="background: ${theme.colors.primary}"></div>
                                    <span>${theme.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Font Size</span>
                        <span>Adjust text size</span>
                    </div>
                    <div class="setting-control">
                        <div class="select-wrapper">
                            <select id="settingFontSize">
                                <option value="small" ${this.currentSettings.fontSize === 'small' ? 'selected' : ''}>Small</option>
                                <option value="medium" ${this.currentSettings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="large" ${this.currentSettings.fontSize === 'large' ? 'selected' : ''}>Large</option>
                                <option value="xlarge" ${this.currentSettings.fontSize === 'xlarge' ? 'selected' : ''}>Extra Large</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Animations</span>
                        <span>Enable interface animations</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingAnimations" ${this.currentSettings.animations ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Compact Mode</span>
                        <span>Show more content per page</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingCompactMode" ${this.currentSettings.compactMode ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create advanced settings UI
     */
    createAdvancedSettingsUI() {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-sliders-h"></i> Advanced</h4>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Developer Mode</span>
                        <span>Show additional options</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingDeveloperMode" ${this.currentSettings.developerMode ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Request Timeout (seconds)</span>
                        <span>Request timeout duration</span>
                    </div>
                    <div class="setting-control">
                        <div class="input-wrapper">
                            <input type="number" 
                                   id="settingRequestTimeout" 
                                   value="${this.currentSettings.requestTimeout}"
                                   min="5" max="120" step="5">
                        </div>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Cache Results</span>
                        <span>Cache search results locally</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="settingCacheResults" ${this.currentSettings.cacheResults ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span>Cache Duration (seconds)</span>
                        <span>How long to cache results</span>
                    </div>
                    <div class="setting-control">
                        <div class="input-wrapper">
                            <input type="number" 
                                   id="settingCacheDuration" 
                                   value="${this.currentSettings.cacheDuration}"
                                   min="60" max="3600" step="60">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create shortcuts UI
     */
    createShortcutsUI(shortcuts) {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h4>
                
                <div class="shortcuts-list">
                    ${shortcuts.map(shortcut => `
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>${shortcut.key}</kbd>
                            </div>
                            <div class="shortcut-action">
                                <span>${shortcut.action}</span>
                                <span class="shortcut-context">${shortcut.global ? 'Global' : shortcut.context}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create about UI
     */
    createAboutUI() {
        return `
            <div class="setting-group">
                <h4><i class="fas fa-info-circle"></i> About</h4>
                
                <div class="about-content">
                    <div class="about-section">
                        <h5>Search Engine</h5>
                        <p>Version: 1.1.0</p>
                        <p>Build: 2024.01.15</p>
                        <p>Powered by Cloudflare Workers</p>
                    </div>
                    
                    <div class="about-section">
                        <h5>Features</h5>
                        <ul>
                            <li>Privacy-focused search</li>
                            <li>AI-powered summaries</li>
                            <li>Multiple search providers</li>
                            <li>Customizable interface</li>
                            <li>Keyboard shortcuts</li>
                        </ul>
                    </div>
                    
                    <div class="about-section">
                        <h5>Links</h5>
                        <div class="about-links">
                            <a href="#" class="about-link"><i class="fas fa-question-circle"></i> Help</a>
                            <a href="#" class="about-link"><i class="fas fa-file-alt"></i> Privacy Policy</a>
                            <a href="#" class="about-link"><i class="fas fa-file-contract"></i> Terms of Service</a>
                            <a href="#" class="about-link"><i class="fab fa-github"></i> GitHub</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Export for global use
window.SettingsManager = SettingsManager;