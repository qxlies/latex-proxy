/**
 * Utils Module
 * Utility functions used across the application
 */

const { encode } = GPTTokenizer_cl100k_base;

export function uid() {
    return Math.random().toString(36).slice(2, 10);
}

export function tokenCount(txt) {
    try {
        return encode(txt || '').length;
    } catch {
        const s = (txt || '');
        return Math.ceil(s.length / 4);
    }
}

export function buildRawProfileText(p) {
    let tabs = Array.isArray(p?.tabs) ? p.tabs.filter(t => t.enabled !== false) : [];
    if (!tabs.length && Array.isArray(p?.tabs)) tabs = p.tabs;
    return tabs.map(t => `<${t.role}>\n${t.content || ''}\n</${t.role}>`).join('\n');
}

export function buildEndpointUrl() {
    const base = (location.origin || 'http://localhost:3000').replace(/\/+$/, '');
    return base + '/v1/chat/completions';
}

export function maskApiKey(key) {
    if (!key || key.length < 12) {
        return key;
    }
    const prefix = key.substring(0, 5);
    const suffix = key.substring(key.length - 4);
    return `${prefix}************************************${suffix}`;
}

export async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        if (button) {
            const oldTitle = button.getAttribute('title') || '';
            button.setAttribute('title', 'Copied');
            button.classList.add('ok');
            setTimeout(() => {
                button.classList.remove('ok');
                button.setAttribute('title', oldTitle || 'Copy');
            }, 900);
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
    }
}