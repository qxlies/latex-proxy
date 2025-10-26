/**
 * Main Application Entry Point
 * Imports and initializes all modules
 */

import { checkAuth, initAuthListeners } from './auth.js';
import { initProfilesListeners } from './profiles.js';
import { initTabsListeners } from './tabs.js';
import { initProvidersListeners } from './providers.js';
import { initLogsListeners } from './logs.js';
import { initUIListeners } from './ui.js';

// Initialize all event listeners
function initApp() {
    initAuthListeners();
    initProfilesListeners();
    initTabsListeners();
    initProvidersListeners();
    initLogsListeners();
    initUIListeners();
    
    // Check authentication and start app
    checkAuth();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}