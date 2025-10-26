/**
 * API Module
 * Handles all API requests to the backend
 */

import { showLoading, hideLoading } from './loading.js';

export async function fetchAPI(url, options = {}) {
    const { showLoader = false, ...fetchOptions } = options;
    
    try {
        if (showLoader) showLoading();
        
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, { ...fetchOptions, headers });
        
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.msg || 'API request failed');
            } catch (e) {
                throw new Error(errorText || 'API request failed');
            }
        }
        
        if (response.status === 204 || response.status === 200 && response.headers.get('content-length') === '0') {
            return null;
        }
        
        return response.json();
    } finally {
        if (showLoader) hideLoading();
    }
}