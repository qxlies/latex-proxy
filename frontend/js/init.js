/**
 * Init Module
 * Handles application initialization
 */

import { fetchAPI } from './api.js';
import { state, setState } from './state.js';
import { uid } from './utils.js';
import { renderProfiles, setActiveProfile, setApiActiveProfile, saveProfileOrder, createDefaultProfile } from './profiles.js';
import { renderTabs, fillEditor, loadMergeRolesState } from './tabs.js';
import { fillProfileSettings, initCodeMirror } from './providers.js';
import { fetchLogs } from './logs.js';
import { updateEndpointUrl, updateUserApiKeyDisplay } from './ui.js';
import { showLoading, hideLoading } from './loading.js';
import { initFAQ, updateFAQApiKey } from './faq.js';

export async function initApp() {
    initCodeMirror();
    
    try {
        showLoading();
        
        const [{ profiles }, { user }] = await Promise.all([
            fetchAPI('/api/profiles'),
            fetchAPI('/api/users/me')
        ]);
        
        setState({ profiles, user });

        // Update profiles with missing tabs
        for (const profile of profiles) {
            let needsUpdate = false;
            
            if (!profile.tabs.some(t => t.content === '{chat_history}')) {
                const newTab = { id: uid(), role: 'system', title: 'chat history', content: '{chat_history}', enabled: true, isPinned: true };
                profile.tabs.push(newTab);
                needsUpdate = true;
            }
            
            if (!profile.tabs.some(t => t.content.includes('{lorebooks}'))) {
                const chatHistoryIndex = profile.tabs.findIndex(t => t.content.includes('{chat_history}'));
                const newLorebooksTab = { id: uid(), role: 'system', title: 'lorebooks', content: '{lorebooks}', enabled: true };
                
                if (chatHistoryIndex !== -1) {
                    profile.tabs.splice(chatHistoryIndex, 0, newLorebooksTab);
                } else {
                    profile.tabs.push(newLorebooksTab);
                }
                needsUpdate = true;
            }

            if (!profile.tabs.some(t => t.content.includes('{example_dialogs}'))) {
                const chatHistoryIndex = profile.tabs.findIndex(t => t.content.includes('{chat_history}'));
                const newExampleDialogsTab = { id: uid(), role: 'system', title: 'example dialogs', content: '<example_dialogs>{example_dialogs}</example_dialogs>', enabled: true };
                
                if (chatHistoryIndex !== -1) {
                    profile.tabs.splice(chatHistoryIndex, 0, newExampleDialogsTab);
                } else {
                    profile.tabs.push(newExampleDialogsTab);
                }
                needsUpdate = true;
            }
                    
            if (needsUpdate) {
                await fetchAPI(`/api/profiles/${profile._id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ tabs: profile.tabs }),
                });
            }
        }

        if (!user.profileOrder || user.profileOrder.length === 0) {
            const initialOrder = profiles.map(p => p._id);
            await saveProfileOrder(initialOrder);
        }

        if (profiles.length > 0) {
            if (user.activeProfileId && profiles.some(p => p._id === user.activeProfileId)) {
                setState({ selectedProfileId: user.activeProfileId });
            } else {
                setState({ selectedProfileId: profiles[0]._id });
            }
        } else {
            await createDefaultProfile();
            return;
        }
        
        updateEndpointUrl();
        updateUserApiKeyDisplay();
        renderProfiles();
        renderTabs();
        fillEditor();
        loadMergeRolesState();
        fillProfileSettings();
        fetchLogs();
        initFAQ();
        updateFAQApiKey();
        
        const loggingToggle = document.getElementById('loggingToggle');
        if (loggingToggle) {
            loggingToggle.checked = user.isLoggingEnabled;
        }
    } catch (error) {
        alert(error.message);
        localStorage.removeItem('token');
        const { checkAuth } = await import('./auth.js');
        checkAuth();
    } finally {
        hideLoading();
    }
}