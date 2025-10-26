/**
 * UI Module
 * Handles UI interactions and elements
 */

import { buildEndpointUrl, copyToClipboard, maskApiKey } from './utils.js';
import { state } from './state.js';
import { updateFAQApiKey } from './faq.js';

// DOM Elements
const endpointUrlEl = document.getElementById('endpointUrl');
const copyEndpointBtn = document.getElementById('copyEndpoint');
const userApiKeyEl = document.getElementById('userApiKey');
const copyUserApiKeyBtn = document.getElementById('copyUserApiKey');
const copySetupTextEl = document.getElementById('copySetupText');
const textarea = document.getElementById('tabContent');
const tabs = document.getElementById('tabs');

export function updateEndpointUrl() {
    const url = buildEndpointUrl();
    endpointUrlEl.textContent = url;
    endpointUrlEl.title = url;
}

export async function copyEndpoint() {
    const url = endpointUrlEl.textContent || buildEndpointUrl();
    await copyToClipboard(url, copyEndpointBtn);
}

export async function copyUserApiKey() {
    if (!state.user || !state.user.apiKey) return;
    const key = state.user.apiKey;
    await copyToClipboard(key, copyUserApiKeyBtn);
}

export function updateUserApiKeyDisplay() {
    if (state.user && state.user.apiKey) {
        userApiKeyEl.textContent = maskApiKey(state.user.apiKey);
        updateFAQApiKey();
    }
}

export function initUIListeners() {
    copyEndpointBtn.addEventListener('click', copyEndpoint);
    copyUserApiKeyBtn.addEventListener('click', copyUserApiKey);
    
    copySetupTextEl.addEventListener('click', () => {
        const text = copySetupTextEl.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copySetupTextEl.innerHTML;
            copySetupTextEl.innerHTML = 'Copied!';
            setTimeout(() => {
                copySetupTextEl.innerHTML = originalText;
            }, 1000);
        });
    });

    // Resize observer for tabs
    const resizeObserver = new ResizeObserver(() => {
        const editorGrid = document.querySelector('.editor .grid');
        const gridHeight = editorGrid ? editorGrid.offsetHeight : 60;
        tabs.style.maxHeight = (textarea.offsetHeight + gridHeight + 12) + 'px';
    });
    
    resizeObserver.observe(textarea);
    
    // Initial height
    const editorGrid = document.querySelector('.editor .grid');
    const gridHeight = editorGrid ? editorGrid.offsetHeight : 60;
    tabs.style.maxHeight = (textarea.offsetHeight + gridHeight + 12) + 'px';
}