/**
 * Loading Module
 * Handles loading states and transitions
 */

const loadingOverlay = document.getElementById('loadingOverlay');

/**
 * Show global loading overlay
 */
export function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

/**
 * Hide global loading overlay
 */
export function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Add loading state to a specific element
 * @param {HTMLElement|string} element - Element or selector
 */
export function addElementLoading(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) {
        el.classList.add('element-loading');
    }
}

/**
 * Remove loading state from a specific element
 * @param {HTMLElement|string} element - Element or selector
 */
export function removeElementLoading(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) {
        el.classList.remove('element-loading');
    }
}

/**
 * Add loading state to a panel
 * @param {HTMLElement|string} panel - Panel element or selector
 */
export function addPanelLoading(panel) {
    const el = typeof panel === 'string' ? document.querySelector(panel) : panel;
    if (el) {
        el.classList.add('loading');
    }
}

/**
 * Remove loading state from a panel
 * @param {HTMLElement|string} panel - Panel element or selector
 */
export function removePanelLoading(panel) {
    const el = typeof panel === 'string' ? document.querySelector(panel) : panel;
    if (el) {
        el.classList.remove('loading');
    }
}

/**
 * Wrap an async function with loading state
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Options for loading display
 * @returns {Function} Wrapped function
 */
export function withLoading(fn, options = {}) {
    return async function(...args) {
        const { 
            global = false, 
            element = null, 
            panel = null 
        } = options;

        try {
            if (global) showLoading();
            if (element) addElementLoading(element);
            if (panel) addPanelLoading(panel);

            return await fn.apply(this, args);
        } finally {
            if (global) hideLoading();
            if (element) removeElementLoading(element);
            if (panel) removePanelLoading(panel);
        }
    };
}