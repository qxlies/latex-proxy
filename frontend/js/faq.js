// FAQ Module - handles FAQ copyable elements

import { getState } from './state.js';

/**
 * Initialize FAQ functionality
 */
export function initFAQ() {
    // Set up copyable code elements
    setupCopyableElements();
    
    // Update API key in FAQ when user data is available
    updateFAQApiKey();
}

/**
 * Set up click handlers for copyable code elements
 */
function setupCopyableElements() {
    const copyableElements = document.querySelectorAll('.copyable-faq-code');
    
    copyableElements.forEach(element => {
        element.addEventListener('click', async () => {
            const textToCopy = element.dataset.copyText || element.textContent;
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Visual feedback
                element.classList.add('copied');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    element.classList.remove('copied');
                }, 2000);
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        });
    });
}

/**
 * Update the API key element in FAQ with actual user API key
 */
export function updateFAQApiKey() {
    const state = getState();
    const faqApiKeyElement = document.getElementById('faqApiKey');
    
    if (faqApiKeyElement && state.user && state.user.apiKey) {
        faqApiKeyElement.dataset.copyText = state.user.apiKey;
        faqApiKeyElement.textContent = maskApiKey(state.user.apiKey);
    }
}

/**
 * Mask API key for display
 * @param {string} key - The API key to mask
 * @returns {string} Masked API key
 */
function maskApiKey(key) {
    if (!key || key.length < 12) {
        return key;
    }
    const prefix = key.substring(0, 5);
    const suffix = key.substring(key.length - 4);
    return `${prefix}****...****${suffix}`;
}