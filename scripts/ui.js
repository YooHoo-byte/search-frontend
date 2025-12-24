// UI Manager Module

class UIManager {
    constructor() {
        this.components = new Map();
        this.notifications = [];
        this.modals = new Map();
        this.toasts = [];
        this.tooltips = new Map();
    }

    /**
     * Initialize UI components
     */
    init() {
        this.initTheme();
        this.initNotifications();
        this.initTooltips();
        this.initModals();
        this.initKeyboardShortcuts();
    }

    /**
     * Initialize theme
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme toggle button
        const themeToggle = document.getElementById('toggleTheme');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme toggle button
        const themeToggle = document.getElementById('toggleTheme');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
        
        return newTheme;
    }

    /**
     * Initialize notifications
     */
    initNotifications() {
        // Create notifications container if it doesn't exist
        if (!document.getElementById('notifications-container')) {
            const container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const id = Utils.generateId();
        const notification = document.createElement('div');
        notification.id = `notification-${id}`;
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="window.ui.closeNotification('${id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = document.getElementById('notifications-container');
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.closeNotification(id), duration);
        }
        
        this.notifications.push({ id, element: notification });
        return id;
    }

    /**
     * Close notification
     */
    closeNotification(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
            this.notifications = this.notifications.filter(n => n.id !== id);
        }
    }

    /**
     * Close all notifications
     */
    closeAllNotifications() {
        this.notifications.forEach(notification => {
            notification.element.classList.remove('show');
            setTimeout(() => notification.element.remove(), 300);
        });
        this.notifications = [];
    }

    /**
     * Initialize tooltips
     */
    initTooltips() {
        // Add event listeners for tooltips
        document.addEventListener('mouseover', (e) => {
            const target = e.target;
            const tooltipText = target.getAttribute('data-tooltip');
            
            if (tooltipText && !target.hasAttribute('data-tooltip-initialized')) {
                target.addEventListener('mouseenter', this.showTooltip.bind(this));
                target.addEventListener('mouseleave', this.hideTooltip.bind(this));
                target.setAttribute('data-tooltip-initialized', 'true');
            }
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(e) {
        const target = e.target;
        const text = target.getAttribute('data-tooltip');
        const position = target.getAttribute('data-tooltip-position') || 'top';
        
        if (!text) return;
        
        // Remove existing tooltip
        this.hideTooltip();
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        
        // Position tooltip
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        switch (position) {
            case 'top':
                tooltip.style.top = `${rect.top + scrollTop - tooltip.offsetHeight - 10}px`;
                tooltip.style.left = `${rect.left + scrollLeft + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                break;
            case 'bottom':
                tooltip.style.top = `${rect.bottom + scrollTop + 10}px`;
                tooltip.style.left = `${rect.left + scrollLeft + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                break;
            case 'left':
                tooltip.style.top = `${rect.top + scrollTop + rect.height / 2 - tooltip.offsetHeight / 2}px`;
                tooltip.style.left = `${rect.left + scrollLeft - tooltip.offsetWidth - 10}px`;
                break;
            case 'right':
                tooltip.style.top = `${rect.top + scrollTop + rect.height / 2 - tooltip.offsetHeight / 2}px`;
                tooltip.style.left = `${rect.right + scrollLeft + 10}px`;
                break;
        }
        
        // Add to DOM
        tooltip.id = 'current-tooltip';
        document.body.appendChild(tooltip);
        
        // Store reference
        this.tooltips.set('current', tooltip);
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = this.tooltips.get('current');
        if (tooltip) {
            tooltip.remove();
            this.tooltips.delete('current');
        }
    }

    /**
     * Initialize modals
     */
    initModals() {
        // Close modals on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Show modal
     */
    showModal(id, options = {}) {
        // Close any open modals first
        this.closeAllModals();
        
        const modal = document.getElementById(id);
        if (!modal) return false;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.onclick = () => this.closeModal(id);
        
        // Add overlay to modal
        modal.parentNode.insertBefore(overlay, modal);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Store reference
        this.modals.set(id, { element: modal, overlay });
        
        // Focus first focusable element
        if (options.autoFocus !== false) {
            setTimeout(() => {
                const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
            }, 100);
        }
        
        return true;
    }

    /**
     * Close modal
     */
    closeModal(id) {
        const modalData = this.modals.get(id);
        if (!modalData) return false;
        
        const { element, overlay } = modalData;
        
        // Hide modal
        element.classList.remove('active');
        
        // Remove overlay
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        
        // Restore scroll
        if (this.modals.size === 1) {
            document.body.style.overflow = '';
        }
        
        // Remove from map
        this.modals.delete(id);
        
        return true;
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.modals.forEach((modalData, id) => {
            this.closeModal(id);
        });
    }

    /**
     * Initialize keyboard shortcuts
     */
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.isContentEditable) {
                return;
            }
            
            // Global shortcuts
            switch (e.key) {
                case '/':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) searchInput.focus();
                    }
                    break;
                    
                case 'Escape':
                    this.closeAllModals();
                    this.closeAllNotifications();
                    break;
                    
                case '?':
                    if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                    }
                    break;
                    
                case ',':
                    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                        e.preventDefault();
                        const settingsBtn = document.getElementById('settingsBtn');
                        if (settingsBtn) settingsBtn.click();
                    }
                    break;
            }
        });
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        const shortcuts = [
            { key: '/', description: 'Focus search box' },
            { key: 'Esc', description: 'Clear search / Close dialogs' },
            { key: 'Ctrl+K / Cmd+K', description: 'Open search box' },
            { key: 'Ctrl+Enter / Cmd+Enter', description: 'Open first result' },
            { key: 'j / k', description: 'Navigate results' },
            { key: 'o', description: 'Open selected result' },
            { key: 's', description: 'Share selected result' },
            { key: 't', description: 'Open in new tab' },
            { key: '?', description: 'Show help' },
            { key: 'Ctrl+, / Cmd+,', description: 'Open settings' }
        ];
        
        const html = `
            <div class="modal-content">
                <h3>Keyboard Shortcuts</h3>
                <div class="shortcuts-list">
                    ${shortcuts.map(shortcut => `
                        <div class="shortcut-item">
                            <kbd>${shortcut.key}</kbd>
                            <span>${shortcut.description}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="window.ui.closeModal('keyboard-shortcuts')">Close</button>
                </div>
            </div>
        `;
        
        this.createModal('keyboard-shortcuts', html);
        this.showModal('keyboard-shortcuts');
    }

    /**
     * Create modal
     */
    createModal(id, content, options = {}) {
        // Remove existing modal
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        modal.innerHTML = content;
        
        // Add to DOM
        document.body.appendChild(modal);
        
        return modal;
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay active';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        
        overlay.id = 'loading-overlay';
        document.body.appendChild(overlay);
        
        return overlay;
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    /**
     * Show toast
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container') || this.createToastContainer();
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }
        
        this.toasts.push(toast);
        return toast;
    }

    /**
     * Create toast container
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    /**
     * Remove toast
     */
    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    /**
     * Show confirmation dialog
     */
    showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const id = 'confirm-dialog-' + Utils.generateId();
            const { title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', type = 'warning' } = options;
            
            const icons = {
                warning: 'exclamation-triangle',
                danger: 'exclamation-circle',
                info: 'info-circle',
                success: 'check-circle'
            };
            
            const html = `
                <div class="modal-content">
                    <div class="confirm-icon">
                        <i class="fas fa-${icons[type] || 'exclamation-triangle'}"></i>
                    </div>
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="window.ui.handleConfirm('${id}', false)">${cancelText}</button>
                        <button class="btn-primary" onclick="window.ui.handleConfirm('${id}', true)">${confirmText}</button>
                    </div>
                </div>
            `;
            
            this.createModal(id, html);
            this.showModal(id, { autoFocus: false });
            
            // Store resolve function
            window.ui.confirmResolve = resolve;
        });
    }

    /**
     * Handle confirmation
     */
    handleConfirm(id, result) {
        this.closeModal(id);
        if (window.ui.confirmResolve) {
            window.ui.confirmResolve(result);
            delete window.ui.confirmResolve;
        }
    }

    /**
     * Show prompt dialog
     */
    showPrompt(message, options = {}) {
        return new Promise((resolve) => {
            const id = 'prompt-dialog-' + Utils.generateId();
            const { title = 'Prompt', defaultValue = '', placeholder = '', type = 'text' } = options;
            
            const html = `
                <div class="modal-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="prompt-input">
                        <input type="${type}" 
                               id="prompt-input-${id}" 
                               value="${defaultValue}"
                               placeholder="${placeholder}"
                               autofocus>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="window.ui.handlePrompt('${id}', null)">Cancel</button>
                        <button class="btn-primary" onclick="window.ui.handlePrompt('${id}', document.getElementById('prompt-input-${id}').value)">OK</button>
                    </div>
                </div>
            `;
            
            this.createModal(id, html);
            this.showModal(id, { autoFocus: false });
            
            // Store resolve function
            window.ui.promptResolve = resolve;
            
            // Handle Enter key
            const input = document.getElementById(`prompt-input-${id}`);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handlePrompt(id, input.value);
                    }
                });
            }
        });
    }

    /**
     * Handle prompt
     */
    handlePrompt(id, result) {
        this.closeModal(id);
        if (window.ui.promptResolve) {
            window.ui.promptResolve(result);
            delete window.ui.promptResolve;
        }
    }

    /**
     * Create dropdown
     */
    createDropdown(id, items, options = {}) {
        const dropdown = document.createElement('div');
        dropdown.id = id;
        dropdown.className = 'dropdown';
        
        if (options.position) {
            dropdown.classList.add(`dropdown-${options.position}`);
        }
        
        const itemsHTML = items.map(item => {
            if (item.divider) {
                return '<div class="dropdown-divider"></div>';
            }
            
            return `
                <a href="${item.href || '#'}" 
                   class="dropdown-item ${item.className || ''}"
                   ${item.onclick ? `onclick="${item.onclick}"` : ''}
                   ${item.disabled ? 'disabled' : ''}>
                    ${item.icon ? `<i class="${item.icon}"></i>` : ''}
                    <span>${item.text}</span>
                    ${item.shortcut ? `<span class="dropdown-shortcut">${item.shortcut}</span>` : ''}
                </a>
            `;
        }).join('');
        
        dropdown.innerHTML = itemsHTML;
        
        // Add to DOM
        const container = options.container || document.body;
        container.appendChild(dropdown);
        
        // Position dropdown
        if (options.target) {
            this.positionDropdown(dropdown, options.target, options.position);
        }
        
        // Handle click outside
        if (options.autoClose !== false) {
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target) && (!options.target || !options.target.contains(e.target))) {
                        dropdown.remove();
                    }
                }, { once: true });
            }, 100);
        }
        
        return dropdown;
    }

    /**
     * Position dropdown
     */
    positionDropdown(dropdown, target, position = 'bottom') {
        const targetRect = target.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        
        let top, left;
        
        switch (position) {
            case 'bottom':
                top = targetRect.bottom + window.scrollY;
                left = targetRect.left + window.scrollX;
                break;
            case 'top':
                top = targetRect.top + window.scrollY - dropdownRect.height;
                left = targetRect.left + window.scrollX;
                break;
            case 'left':
                top = targetRect.top + window.scrollY;
                left = targetRect.left + window.scrollX - dropdownRect.width;
                break;
            case 'right':
                top = targetRect.top + window.scrollY;
                left = targetRect.right + window.scrollX;
                break;
        }
        
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
    }

    /**
     * Create context menu
     */
    createContextMenu(items, x, y) {
        const id = 'context-menu-' + Utils.generateId();
        const menu = this.createDropdown(id, items, {
            position: 'right',
            autoClose: true
        });
        
        menu.classList.add('context-menu');
        menu.style.position = 'fixed';
        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;
        
        return menu;
    }

    /**
     * Show tooltip programmatically
     */
    showTooltipAt(text, x, y, position = 'top') {
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${y}px`;
        tooltip.style.left = `${x}px`;
        tooltip.style.zIndex = '9999';
        
        tooltip.id = 'programmatic-tooltip';
        document.body.appendChild(tooltip);
        
        // Auto hide after 3 seconds
        setTimeout(() => this.hideProgrammaticTooltip(), 3000);
        
        return tooltip;
    }

    /**
     * Hide programmatic tooltip
     */
    hideProgrammaticTooltip() {
        const tooltip = document.getElementById('programmatic-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Create progress bar
     */
    createProgressBar(id, options = {}) {
        const progress = document.createElement('div');
        progress.id = id;
        progress.className = 'progress-bar';
        
        if (options.value !== undefined) {
            progress.setAttribute('data-value', options.value);
        }
        
        if (options.max !== undefined) {
            progress.setAttribute('data-max', options.max);
        }
        
        if (options.indeterminate) {
            progress.classList.add('indeterminate');
        }
        
        const bar = document.createElement('div');
        bar.className = 'progress-bar-fill';
        progress.appendChild(bar);
        
        if (options.showLabel) {
            const label = document.createElement('div');
            label.className = 'progress-bar-label';
            progress.appendChild(label);
        }
        
        return progress;
    }

    /**
     * Update progress bar
     */
    updateProgressBar(id, value, max = 100) {
        const progress = document.getElementById(id);
        if (!progress) return;
        
        const percentage = Math.min(100, Math.max(0, (value / max) * 100));
        const fill = progress.querySelector('.progress-bar-fill');
        const label = progress.querySelector('.progress-bar-label');
        
        if (fill) {
            fill.style.width = `${percentage}%`;
        }
        
        if (label) {
            label.textContent = `${Math.round(percentage)}%`;
        }
        
        progress.setAttribute('data-value', value);
        progress.setAttribute('data-max', max);
    }

    /**
     * Create tabs
     */
    createTabs(id, tabs, options = {}) {
        const container = document.createElement('div');
        container.id = id;
        container.className = 'tabs-container';
        
        const tabsHeader = document.createElement('div');
        tabsHeader.className = 'tabs-header';
        
        const tabsContent = document.createElement('div');
        tabsContent.className = 'tabs-content';
        
        tabs.forEach((tab, index) => {
            // Create tab button
            const tabButton = document.createElement('button');
            tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
            tabButton.textContent = tab.title;
            tabButton.setAttribute('data-tab', tab.id);
            tabButton.onclick = () => this.switchTab(id, tab.id);
            
            tabsHeader.appendChild(tabButton);
            
            // Create tab content
            const tabContent = document.createElement('div');
            tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;
            tabContent.id = `tab-${tab.id}`;
            tabContent.innerHTML = tab.content || '';
            
            tabsContent.appendChild(tabContent);
        });
        
        container.appendChild(tabsHeader);
        container.appendChild(tabsContent);
        
        return container;
    }

    /**
     * Switch tab
     */
    switchTab(containerId, tabId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Update buttons
        const buttons = container.querySelectorAll('.tab-button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tabId);
        });
        
        // Update content
        const contents = container.querySelectorAll('.tab-content');
        contents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    /**
     * Create accordion
     */
    createAccordion(id, items, options = {}) {
        const accordion = document.createElement('div');
        accordion.id = id;
        accordion.className = 'accordion';
        
        if (options.multiple) {
            accordion.classList.add('accordion-multiple');
        }
        
        items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'accordion-item';
            
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerHTML = `
                <span>${item.title}</span>
                <i class="fas fa-chevron-down"></i>
            `;
            header.onclick = () => this.toggleAccordionItem(itemElement);
            
            const content = document.createElement('div');
            content.className = 'accordion-content';
            content.innerHTML = item.content || '';
            
            if (index === 0 && options.expandFirst) {
                itemElement.classList.add('expanded');
            }
            
            itemElement.appendChild(header);
            itemElement.appendChild(content);
            accordion.appendChild(itemElement);
        });
        
        return accordion;
    }

    /**
     * Toggle accordion item
     */
    toggleAccordionItem(item) {
        const isExpanded = item.classList.contains('expanded');
        
        if (!item.closest('.accordion-multiple')) {
            // Close all other items
            const siblings = item.parentNode.querySelectorAll('.accordion-item');
            siblings.forEach(sibling => {
                if (sibling !== item) {
                    sibling.classList.remove('expanded');
                }
            });
        }
        
        item.classList.toggle('expanded', !isExpanded);
    }

    /**
     * Create carousel
     */
    createCarousel(id, items, options = {}) {
        const carousel = document.createElement('div');
        carousel.id = id;
        carousel.className = 'carousel';
        
        const track = document.createElement('div');
        track.className = 'carousel-track';
        
        items.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
            slide.setAttribute('data-index', index);
            slide.innerHTML = item;
            track.appendChild(slide);
        });
        
        carousel.appendChild(track);
        
        // Add controls if specified
        if (options.controls !== false) {
            const prevButton = document.createElement('button');
            prevButton.className = 'carousel-prev';
            prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevButton.onclick = () => this.prevSlide(id);
            
            const nextButton = document.createElement('button');
            nextButton.className = 'carousel-next';
            nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextButton.onclick = () => this.nextSlide(id);
            
            carousel.appendChild(prevButton);
            carousel.appendChild(nextButton);
        }
        
        // Add indicators if specified
        if (options.indicators) {
            const indicators = document.createElement('div');
            indicators.className = 'carousel-indicators';
            
            items.forEach((_, index) => {
                const indicator = document.createElement('button');
                indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
                indicator.setAttribute('data-index', index);
                indicator.onclick = () => this.goToSlide(id, index);
                indicators.appendChild(indicator);
            });
            
            carousel.appendChild(indicators);
        }
        
        // Auto slide if specified
        if (options.autoSlide) {
            this.startAutoSlide(id, options.autoSlideInterval || 5000);
        }
        
        return carousel;
    }

    /**
     * Go to next slide
     */
    nextSlide(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const track = carousel.querySelector('.carousel-track');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const activeSlide = carousel.querySelector('.carousel-slide.active');
        const activeIndex = parseInt(activeSlide?.getAttribute('data-index') || 0);
        const nextIndex = (activeIndex + 1) % slides.length;
        
        this.goToSlide(carouselId, nextIndex);
    }

    /**
     * Go to previous slide
     */
    prevSlide(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const slides = carousel.querySelectorAll('.carousel-slide');
        const activeSlide = carousel.querySelector('.carousel-slide.active');
        const activeIndex = parseInt(activeSlide?.getAttribute('data-index') || 0);
        const prevIndex = (activeIndex - 1 + slides.length) % slides.length;
        
        this.goToSlide(carouselId, prevIndex);
    }

    /**
     * Go to specific slide
     */
    goToSlide(carouselId, index) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        const track = carousel.querySelector('.carousel-track');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const indicators = carousel.querySelectorAll('.carousel-indicator');
        
        if (index < 0 || index >= slides.length) return;
        
        // Update active slide
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
        
        // Update indicators
        indicators.forEach(indicator => indicator.classList.remove('active'));
        const indicator = carousel.querySelector(`.carousel-indicator[data-index="${index}"]`);
        if (indicator) indicator.classList.add('active');
        
        // Move track
        track.style.transform = `translateX(-${index * 100}%)`;
        
        // Dispatch event
        carousel.dispatchEvent(new CustomEvent('slideChanged', {
            detail: { index, total: slides.length }
        }));
    }

    /**
     * Start auto slide
     */
    startAutoSlide(carouselId, interval) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        // Clear existing interval
        if (carousel.autoSlideInterval) {
            clearInterval(carousel.autoSlideInterval);
        }
        
        carousel.autoSlideInterval = setInterval(() => {
            this.nextSlide(carouselId);
        }, interval);
    }

    /**
     * Stop auto slide
     */
    stopAutoSlide(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        
        if (carousel.autoSlideInterval) {
            clearInterval(carousel.autoSlideInterval);
            delete carousel.autoSlideInterval;
        }
    }

    /**
     * Create pagination
     */
    createPagination(id, options = {}) {
        const pagination = document.createElement('div');
        pagination.id = id;
        pagination.className = 'pagination';
        
        const { current = 1, total = 1, maxVisible = 5 } = options;
        const pages = Utils.generatePagination(current, total, 2);
        
        pages.forEach(page => {
            if (page === '...') {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            } else {
                const button = document.createElement('button');
                button.className = `pagination-button ${page === current ? 'active' : ''}`;
                button.textContent = page;
                button.onclick = () => {
                    if (options.onPageChange) {
                        options.onPageChange(page);
                    }
                };
                pagination.appendChild(button);
            }
        });
        
        return pagination;
    }

    /**
     * Update pagination
     */
    updatePagination(id, current, total) {
        const pagination = document.getElementById(id);
        if (!pagination) return;
        
        const newPagination = this.createPagination(id, { current, total });
        pagination.innerHTML = newPagination.innerHTML;
    }

    /**
     * Create rating widget
     */
    createRating(id, options = {}) {
        const rating = document.createElement('div');
        rating.id = id;
        rating.className = 'rating';
        
        const { value = 0, max = 5, readOnly = false, size = 'medium' } = options;
        
        rating.classList.add(`rating-${size}`);
        
        for (let i = 1; i <= max; i++) {
            const star = document.createElement('span');
            star.className = 'rating-star';
            star.setAttribute('data-value', i);
            
            if (i <= Math.floor(value)) {
                star.classList.add('filled');
            } else if (i - 0.5 <= value) {
                star.classList.add('half-filled');
            }
            
            if (!readOnly) {
                star.addEventListener('mouseenter', () => this.highlightStars(rating, i));
                star.addEventListener('mouseleave', () => this.resetStars(rating, value));
                star.addEventListener('click', () => this.setRating(rating, i, options.onRate));
            }
            
            // Add star icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-star';
            star.appendChild(icon);
            
            rating.appendChild(star);
        }
        
        if (options.showValue) {
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'rating-value';
            valueDisplay.textContent = value.toFixed(1);
            rating.appendChild(valueDisplay);
        }
        
        return rating;
    }

    /**
     * Highlight stars on hover
     */
    highlightStars(rating, value) {
        const stars = rating.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.remove('filled', 'half-filled');
            if (index < value) {
                star.classList.add('filled');
            }
        });
    }

    /**
     * Reset stars to current value
     */
    resetStars(rating, value) {
        const stars = rating.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.remove('filled', 'half-filled');
            if (index + 1 <= Math.floor(value)) {
                star.classList.add('filled');
            } else if (index + 0.5 <= value) {
                star.classList.add('half-filled');
            }
        });
    }

    /**
     * Set rating value
     */
    setRating(rating, value, callback) {
        const stars = rating.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.remove('filled', 'half-filled');
            if (index < value) {
                star.classList.add('filled');
            }
        });
        
        if (callback) {
            callback(value);
        }
        
        // Update value display
        const valueDisplay = rating.querySelector('.rating-value');
        if (valueDisplay) {
            valueDisplay.textContent = value.toFixed(1);
        }
    }

    /**
     * Create color picker
     */
    createColorPicker(id, options = {}) {
        const picker = document.createElement('div');
        picker.id = id;
        picker.className = 'color-picker';
        
        const { value = '#4285f4', presetColors = [
            '#4285f4', '#34a853', '#ea4335', '#fbbc05',
            '#1a73e8', '#0d652d', '#d93025', '#f29900'
        ] } = options;
        
        // Color preview
        const preview = document.createElement('div');
        preview.className = 'color-preview';
        preview.style.backgroundColor = value;
        
        // Color input
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'color-input';
        input.value = value;
        input.onchange = (e) => {
            preview.style.backgroundColor = e.target.value;
            if (options.onChange) {
                options.onChange(e.target.value);
            }
        };
        
        // Preset colors
        const presets = document.createElement('div');
        presets.className = 'color-presets';
        
        presetColors.forEach(color => {
            const preset = document.createElement('button');
            preset.className = 'color-preset';
            preset.style.backgroundColor = color;
            preset.onclick = () => {
                                preview.style.backgroundColor = color;
                input.value = color;
                if (options.onChange) {
                    options.onChange(color);
                }
            };
            presets.appendChild(preset);
        });

        picker.appendChild(preview);
        picker.appendChild(input);
        picker.appendChild(presets);

        return picker;
    }

    /**
     * Register UI component
     */
    registerComponent(name, element) {
        if (!name || !element) return;
        this.components.set(name, element);
    }

    /**
     * Get registered component
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Remove component
     */
    removeComponent(name) {
        const component = this.components.get(name);
        if (component && component.remove) {
            component.remove();
        }
        this.components.delete(name);
    }

    /**
     * Destroy UI manager (cleanup)
     */
    destroy() {
        // Remove notifications
        this.closeAllNotifications();

        // Close modals
        this.closeAllModals();

        // Remove tooltips
        this.hideTooltip();
        this.hideProgrammaticTooltip();

        // Remove toast container
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) toastContainer.remove();

        // Clear maps
        this.components.clear();
        this.modals.clear();
        this.tooltips.clear();
        this.notifications = [];
        this.toasts = [];

        // Remove loading overlay
        this.hideLoading();
    }
}

/* ------------------------------
   Global UI instance
-------------------------------- */

window.ui = new UIManager();

/* ------------------------------
   Auto-init on DOM ready
-------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    window.ui.init();
});
