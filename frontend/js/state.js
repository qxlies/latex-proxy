/**
 * State Module
 * Manages application state
 */

export const state = {
    profiles: [],
    selectedProfileId: null,
    user: null,
};

export function getState() {
    return state;
}

export function setState(newState) {
    Object.assign(state, newState);
}

export function currentProfile() {
    if (!state.selectedProfileId) return null;
    return state.profiles.find(p => p._id === state.selectedProfileId);
}

export function currentTab() {
    const p = currentProfile();
    if (!p || !p.activeTabId) return null;
    return p.tabs.find(t => t.id === p.activeTabId);
}