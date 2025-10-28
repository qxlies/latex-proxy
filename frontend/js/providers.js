/**
 * Providers Module
 * Handles provider management (OpenRouter, GoRouter, AI Studio, Free, Custom)
 */

import { fetchAPI } from './api.js';
import { currentProfile } from './state.js';

// DOM Elements
const providerCards = document.querySelectorAll('.provider-card');
const gorouterSettings = document.getElementById('gorouterSettings');
const openrouterSettings = document.getElementById('openrouterSettings');
const freeSettings = document.getElementById('freeSettings');
const customSettings = document.getElementById('customSettings');
const aistudioSettings = document.getElementById('aistudioSettings');
const gorouterApiKeyInput = document.getElementById('gorouterApiKey');
const gorouterModelInput = document.getElementById('gorouterModel');
const gorouterModelDropdown = document.getElementById('gorouterModelDropdown');
const gorouterThinkingEnabled = document.getElementById('gorouterThinkingEnabled');
const gorouterEffort = document.getElementById('gorouterEffort');
const gorouterProvider = document.getElementById('gorouterProvider');
const gorouterEffortField = document.getElementById('gorouterEffortField');
const gorouterProviderField = document.getElementById('gorouterProviderField');
const openrouterApiKeyInput = document.getElementById('openrouterApiKey');
const modelSearchInput = document.getElementById('openrouterModel');
const modelDropdown = document.getElementById('openrouterModelDropdown');
const customEndpointInput = document.getElementById('customEndpoint');
const customApiKeyInput = document.getElementById('customApiKey');
const customModelInput = document.getElementById('customModel');
const freeModelSelect = document.getElementById('freeModel');
const aistudioApiKeyInput = document.getElementById('aistudioApiKey');
const aistudioModelInput = document.getElementById('aistudioModel');
const extraParamsInput = document.getElementById('extraParams');

let openrouterModels = [];
let gorouterModels = [];
let providerSettingsTimeout;
let isSettingExtraParams = false;

// OpenRouter Models
export async function fetchOpenRouterModels() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        const data = await response.json();
        openrouterModels = data.data || [];
        return openrouterModels;
    } catch (error) {
        console.error('Failed to fetch OpenRouter models:', error);
        return [];
    }
}

function filterModels(query) {
    if (!query) return openrouterModels;
    const lowerQuery = query.toLowerCase();
    return openrouterModels.filter(model =>
        model.id.toLowerCase().includes(lowerQuery) ||
        model.name.toLowerCase().includes(lowerQuery)
    );
}

function renderModelDropdown(models) {
    modelDropdown.innerHTML = '';
    if (models.length === 0) {
        modelDropdown.innerHTML = '<div class="model-option"><div class="model-option-name">No models found</div></div>';
        return;
    }
    
    models.slice(0, 50).forEach(model => {
        const option = document.createElement('div');
        option.className = 'model-option';
        option.innerHTML = `
            <div class="model-option-name">${model.name}</div>
            <div class="model-option-id">${model.id}</div>
        `;
        option.onclick = () => selectModel(model);
        modelDropdown.appendChild(option);
    });
}

function selectModel(model) {
    modelSearchInput.value = model.id;
    modelDropdown.classList.remove('active');
    saveProviderSettings();
}

// GoRouter Models
export async function fetchGorouterModels() {
    try {
        const response = await fetch('https://gorouter.bobots.me/api/v1/models/global');
        const data = await response.json();
        gorouterModels = (data.models || []).filter(model => model.globally_allowed === true);
        return gorouterModels;
    } catch (error) {
        console.error('Failed to fetch GoRouter models:', error);
        return [];
    }
}

function filterGorouterModels(query) {
    if (!query) return gorouterModels;
    const lowerQuery = query.toLowerCase();
    return gorouterModels.filter(model =>
        model.id.toLowerCase().includes(lowerQuery) ||
        model.name.toLowerCase().includes(lowerQuery)
    );
}

function renderGorouterModelDropdown(models) {
    gorouterModelDropdown.innerHTML = '';
    if (models.length === 0) {
        gorouterModelDropdown.innerHTML = '<div class="model-option"><div class="model-option-name">No models found</div></div>';
        return;
    }
    
    models.forEach(model => {
        const option = document.createElement('div');
        option.className = 'model-option';
        
        let pricingInfo = '';
        if (model.pricing) {
            const tokenMultiplier = parseFloat(model.token_multiplier);
            pricingInfo = `<span class="model-price">Tok. multiplier: ${tokenMultiplier}x</span>`;
        }
        
        option.innerHTML = `
            <div class="model-option-header">
                <div class="model-option-name">${model.name}</div>
                ${pricingInfo}
            </div>
            <div class="model-option-id">${model.id}</div>
        `;
        option.onclick = () => selectGorouterModel(model);
        gorouterModelDropdown.appendChild(option);
    });
}

function selectGorouterModel(model) {
    gorouterModelInput.value = model.id;
    gorouterModelDropdown.classList.remove('active');
    updateGorouterProviderFieldVisibility();
    saveProviderSettings();
}

function updateGorouterProviderFieldVisibility() {
    if (!gorouterProviderField || !gorouterModelInput) return;
    
    const modelValue = gorouterModelInput.value.trim();
    const shouldShow = modelValue.startsWith('anthropic/');
    
    if (shouldShow) {
        gorouterProviderField.style.display = 'grid';
    } else {
        gorouterProviderField.style.display = 'none';
    }
}

// Provider Switching
export async function switchProvider(providerType) {
    const p = currentProfile();
    if (!p) return;

    if (!p.providers) {
        p.providers = {};
    }

    if (!p.providers.gorouter) p.providers.gorouter = { apiKey: '', model: '', thinkingEnabled: false, effort: 'medium', provider: 'Google' };
    if (!p.providers.openrouter) p.providers.openrouter = { apiKey: '', model: '' };
    if (!p.providers.aistudio) p.providers.aistudio = { apiKey: '', model: 'gemini-2.5-pro' };
    if (!p.providers.free) p.providers.free = { model: 'gemini-2.5-pro' };
    if (!p.providers.custom) p.providers.custom = { endpoint: '', apiKey: '', model: '' };

    p.providerType = providerType;

    document.querySelectorAll('.provider-card').forEach(card => {
        const cardType = card.dataset.provider;
        if (cardType === providerType) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    if (gorouterSettings) gorouterSettings.classList.toggle('active', providerType === 'gorouter');
    if (openrouterSettings) openrouterSettings.classList.toggle('active', providerType === 'openrouter');
    if (aistudioSettings) aistudioSettings.classList.toggle('active', providerType === 'aistudio');
    if (freeSettings) freeSettings.classList.toggle('active', providerType === 'free');
    if (customSettings) customSettings.classList.toggle('active', providerType === 'custom');

    if (providerType === 'gorouter') {
        if (gorouterModels.length === 0) {
            await fetchGorouterModels();
        }
        
        if (gorouterApiKeyInput) gorouterApiKeyInput.value = p.providers.gorouter.apiKey || '';
        if (gorouterModelInput) gorouterModelInput.value = p.providers.gorouter.model || '';
        if (gorouterThinkingEnabled) {
            gorouterThinkingEnabled.checked = p.providers.gorouter.thinkingEnabled || false;
            if (gorouterEffortField) {
                gorouterEffortField.classList.toggle('enabled', gorouterThinkingEnabled.checked);
            }
        }
        if (gorouterEffort) gorouterEffort.value = p.providers.gorouter.effort || 'medium';
        if (gorouterProvider) gorouterProvider.value = p.providers.gorouter.provider || 'Google';
        
        updateGorouterProviderFieldVisibility();
    } else if (providerType === 'openrouter') {
        if (openrouterModels.length === 0) {
            await fetchOpenRouterModels();
        }
        if (openrouterApiKeyInput) openrouterApiKeyInput.value = p.providers.openrouter.apiKey || '';
        if (modelSearchInput) modelSearchInput.value = p.providers.openrouter.model || '';
    } else if (providerType === 'aistudio') {
        if (aistudioApiKeyInput) aistudioApiKeyInput.value = p.providers.aistudio.apiKey || '';
        if (aistudioModelInput) aistudioModelInput.value = p.providers.aistudio.model || 'gemini-2.5-pro';
    } else if (providerType === 'free') {
        if (freeModelSelect) freeModelSelect.value = p.providers.free.model || 'gemini-2.5-pro';
    } else if (providerType === 'custom') {
        if (customEndpointInput) customEndpointInput.value = p.providers.custom.endpoint || '';
        if (customApiKeyInput) customApiKeyInput.value = p.providers.custom.apiKey || '';
        if (customModelInput) customModelInput.value = p.providers.custom.model || '';
    }

    await saveProviderSettings();
}

export async function saveProviderSettings() {
    const p = currentProfile();
    if (!p) return;

    if (!p.providers) {
        p.providers = {};
    }

    if (!p.providers.gorouter) p.providers.gorouter = { apiKey: '', model: '', thinkingEnabled: false, effort: 'medium', provider: 'Google' };
    if (!p.providers.openrouter) p.providers.openrouter = { apiKey: '', model: '' };
    if (!p.providers.aistudio) p.providers.aistudio = { apiKey: '', model: 'gemini-2.5-pro' };
    if (!p.providers.free) p.providers.free = { model: 'gemini-2.5-pro' };
    if (!p.providers.custom) p.providers.custom = { endpoint: '', apiKey: '', model: '' };

    if (p.providerType === 'gorouter') {
        p.providers.gorouter.apiKey = gorouterApiKeyInput ? gorouterApiKeyInput.value : '';
        p.providers.gorouter.model = gorouterModelInput ? gorouterModelInput.value : '';
        p.providers.gorouter.thinkingEnabled = gorouterThinkingEnabled ? gorouterThinkingEnabled.checked : false;
        p.providers.gorouter.effort = gorouterEffort ? gorouterEffort.value : 'medium';
        p.providers.gorouter.provider = gorouterProvider ? gorouterProvider.value : 'Google';
    } else if (p.providerType === 'openrouter') {
        p.providers.openrouter.apiKey = openrouterApiKeyInput ? openrouterApiKeyInput.value : '';
        p.providers.openrouter.model = modelSearchInput ? modelSearchInput.value : '';
    } else if (p.providerType === 'aistudio') {
        p.providers.aistudio.apiKey = aistudioApiKeyInput ? aistudioApiKeyInput.value : '';
        p.providers.aistudio.model = aistudioModelInput ? aistudioModelInput.value : 'gemini-2.5-pro';
    } else if (p.providerType === 'free') {
        p.providers.free.model = freeModelSelect ? freeModelSelect.value : 'gemini-2.5-pro';
    } else if (p.providerType === 'custom') {
        p.providers.custom.endpoint = customEndpointInput ? customEndpointInput.value : '';
        p.providers.custom.apiKey = customApiKeyInput ? customApiKeyInput.value : '';
        p.providers.custom.model = customModelInput ? customModelInput.value : '';
    }

    let updatedFields = {
        providerType: p.providerType || 'custom',
        providers: p.providers
    };

    if (p.providerType === 'gorouter') {
        updatedFields.proxyEndpoint = 'https://openrouter.ai/api/v1';
        updatedFields.proxyApiKey = p.providers.gorouter.apiKey;
        updatedFields.model = p.providers.gorouter.model;
    } else if (p.providerType === 'openrouter') {
        updatedFields.proxyEndpoint = 'https://openrouter.ai/api/v1';
        updatedFields.proxyApiKey = p.providers.openrouter.apiKey;
        updatedFields.model = p.providers.openrouter.model;
    } else if (p.providerType === 'aistudio') {
        updatedFields.proxyEndpoint = 'https://generativelanguage.googleapis.com/v1beta/openai';
        updatedFields.proxyApiKey = p.providers.aistudio.apiKey;
        updatedFields.model = p.providers.aistudio.model;
    } else if (p.providerType === 'free') {
        updatedFields.proxyEndpoint = 'free';
        updatedFields.proxyApiKey = 'free';
        updatedFields.model = p.providers.free.model;
    } else {
        updatedFields.proxyEndpoint = p.providers.custom.endpoint;
        updatedFields.proxyApiKey = p.providers.custom.apiKey;
        updatedFields.model = p.providers.custom.model;
    }

    // Extra params are saved as-is, GoRouter-specific parameters are injected by backend
    updatedFields.extraParams = window.extraParamsEditor ? window.extraParamsEditor.getValue() : '{}';

    Object.assign(p, updatedFields);

    try {
        await fetchAPI(`/api/profiles/${p._id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedFields),
        });
    } catch (error) {
        console.error('Failed to save provider settings:', error);
        alert(error.message);
    }
}

export function fillProfileSettings() {
    const p = currentProfile();
    if (!p) return;

    if (!p.providers) {
        p.providers = {};
    }

    if (!p.providers.gorouter) p.providers.gorouter = { apiKey: '', model: '', thinkingEnabled: false, effort: 'medium', provider: 'Google' };
    if (!p.providers.openrouter) p.providers.openrouter = { apiKey: '', model: '' };
    if (!p.providers.aistudio) p.providers.aistudio = { apiKey: '', model: 'gemini-2.5-pro' };
    if (!p.providers.free) p.providers.free = { model: 'gemini-2.5-pro' };
    if (!p.providers.custom) p.providers.custom = { endpoint: '', apiKey: '', model: '' };

    if (!p.providerType) {
        if (p.proxyEndpoint && p.proxyEndpoint.includes('openrouter') && p.providers.gorouter && p.providers.gorouter.apiKey) {
            p.providerType = 'gorouter';
            p.providers.gorouter.apiKey = p.proxyApiKey || '';
            p.providers.gorouter.model = p.model || '';
        } else if (p.proxyEndpoint === 'free') {
            p.providerType = 'free';
            p.providers.free.model = p.model || 'gemini-2.5-pro';
        } else if (p.proxyEndpoint && p.proxyEndpoint.includes('openrouter')) {
            p.providerType = 'openrouter';
            p.providers.openrouter.apiKey = p.proxyApiKey || '';
            p.providers.openrouter.model = p.model || '';
        } else if (p.proxyEndpoint && p.proxyEndpoint.includes('generativelanguage.googleapis.com')) {
            p.providerType = 'aistudio';
            p.providers.aistudio.apiKey = p.proxyApiKey || '';
            p.providers.aistudio.model = p.model || 'gemini-2.5-pro';
        } else {
            p.providerType = 'custom';
            p.providers.custom.endpoint = p.proxyEndpoint || '';
            p.providers.custom.apiKey = p.proxyApiKey || '';
            p.providers.custom.model = p.model || '';
        }
    }
    
    if (!p.providerType) {
        p.providerType = 'custom';
    }

    if (window.extraParamsEditor) {
        isSettingExtraParams = true;
        window.extraParamsEditor.setValue(p.extraParams || '{}');
        setTimeout(() => { isSettingExtraParams = false; }, 100);
    }

    switchProvider(p.providerType);
}

async function onProfileSettingsChange() {
    const p = currentProfile();
    if (!p) return;

    const updatedFields = {
        extraParams: window.extraParamsEditor ? window.extraParamsEditor.getValue() : '{}',
    };

    p.extraParams = updatedFields.extraParams;

    try {
        await fetchAPI(`/api/profiles/${p._id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedFields),
        });
    } catch (error) {
        alert(error.message);
    }
}

const debouncedProviderSettingsChange = () => {
    clearTimeout(providerSettingsTimeout);
    providerSettingsTimeout = setTimeout(saveProviderSettings, 500);
};

const debouncedProfileSettingsChange = () => {
    clearTimeout(providerSettingsTimeout);
    providerSettingsTimeout = setTimeout(onProfileSettingsChange, 500);
};

export function initCodeMirror() {
    window.extraParamsEditor = CodeMirror.fromTextArea(extraParamsInput, {
        lineNumbers: true,
        theme: 'darcula',
        mode: {name: "javascript", json: true},
        lineWrapping: true,
    });
    window.extraParamsEditor.on('change', () => {
        if (!isSettingExtraParams) {
            debouncedProfileSettingsChange();
        }
    });
}

export function initProvidersListeners() {
    document.querySelectorAll('.provider-card').forEach(card => {
        card.addEventListener('click', () => {
            const providerType = card.dataset.provider;
            if (providerType) {
                switchProvider(providerType);
            }
        });
    });

    // OpenRouter
    if (modelSearchInput) {
        modelSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const filtered = filterModels(query);
            renderModelDropdown(filtered);
            if (query || filtered.length > 0) {
                modelDropdown && modelDropdown.classList.add('active');
            } else {
                modelDropdown && modelDropdown.classList.remove('active');
            }
        });

        modelSearchInput.addEventListener('focus', async () => {
            if (openrouterModels.length === 0) {
                await fetchOpenRouterModels();
            }
            const filtered = filterModels(modelSearchInput.value);
            renderModelDropdown(filtered);
            modelDropdown && modelDropdown.classList.add('active');
        });
    }

    // GoRouter
    if (gorouterApiKeyInput) gorouterApiKeyInput.addEventListener('input', debouncedProviderSettingsChange);
    
    if (gorouterModelInput) {
        gorouterModelInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const filtered = filterGorouterModels(query);
            renderGorouterModelDropdown(filtered);
            if (query || filtered.length > 0) {
                gorouterModelDropdown && gorouterModelDropdown.classList.add('active');
            } else {
                gorouterModelDropdown && gorouterModelDropdown.classList.remove('active');
            }
            updateGorouterProviderFieldVisibility();
            debouncedProviderSettingsChange();
        });

        gorouterModelInput.addEventListener('focus', async () => {
            if (gorouterModels.length === 0) {
                await fetchGorouterModels();
            }
            const filtered = filterGorouterModels(gorouterModelInput.value);
            renderGorouterModelDropdown(filtered);
            gorouterModelDropdown && gorouterModelDropdown.classList.add('active');
        });
    }

    if (gorouterEffort) gorouterEffort.addEventListener('change', debouncedProviderSettingsChange);
    if (gorouterProvider) gorouterProvider.addEventListener('change', debouncedProviderSettingsChange);

    if (gorouterThinkingEnabled) {
        gorouterThinkingEnabled.addEventListener('change', (e) => {
            if (gorouterEffortField) {
                gorouterEffortField.classList.toggle('enabled', e.target.checked);
            }
            debouncedProviderSettingsChange();
        });
    }

    // Other providers
    if (openrouterApiKeyInput) openrouterApiKeyInput.addEventListener('input', debouncedProviderSettingsChange);
    if (aistudioApiKeyInput) aistudioApiKeyInput.addEventListener('input', debouncedProviderSettingsChange);
    if (aistudioModelInput) aistudioModelInput.addEventListener('input', debouncedProviderSettingsChange);
    if (customEndpointInput) customEndpointInput.addEventListener('input', debouncedProviderSettingsChange);
    if (customApiKeyInput) customApiKeyInput.addEventListener('input', debouncedProviderSettingsChange);
    if (customModelInput) customModelInput.addEventListener('input', debouncedProviderSettingsChange);
    if (freeModelSelect) freeModelSelect.addEventListener('change', saveProviderSettings);

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.model-search-wrapper')) {
            modelDropdown && modelDropdown.classList.remove('active');
            gorouterModelDropdown && gorouterModelDropdown.classList.remove('active');
        }
    });
}