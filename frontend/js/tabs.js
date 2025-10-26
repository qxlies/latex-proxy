/**
 * Tabs Module
 * Handles tab management
 */

import { fetchAPI } from './api.js';
import { state, currentProfile, currentTab } from './state.js';
import { tokenCount } from './utils.js';

// DOM Elements
const tabsWrap = document.getElementById('tabs');
const addTabBtn = document.getElementById('addTab');
const tabRoleCustom = document.getElementById('tabRoleCustom');
const tabTitleEl = document.getElementById('tabTitle');
const tabContentEl = document.getElementById('tabContent');
const mergeConsecutiveRolesToggle = document.getElementById('mergeConsecutiveRoles');

let editorTimeout;

export function renderTabs() {
    const p = currentProfile();
    tabsWrap.innerHTML = '';
    if (!p || !p.tabs) return;

    p.tabs.forEach(t => {
        const el = createTabElement(t, p);
        tabsWrap.appendChild(el);
    });
}

function createTabElement(t, p) {
    const el = document.createElement('div');
    el.className = 'tab' + (t.id === p.activeTabId ? ' active' : '') + (t.enabled ? '' : ' off');
    el.dataset.id = t.id;
    const count = tokenCount(t.content || '');
    const isChatHistory = t.content === '{chat_history}';
    const isLorebooks = t.content === '{lorebooks}';
    
    let roleClass = t.role;
    let roleLabel = t.role === 'system' ? 'S' : 'U';
    
    if (isChatHistory) {
        roleClass = 'chat-history';
        roleLabel = 'C';
    } else if (isLorebooks) {
        roleClass = 'lorebooks';
        roleLabel = 'L';
    }
    
    el.innerHTML = `
        <span class="role ${roleClass}">${roleLabel}</span>
        <span class="title">${t.title || '(no name)'}</span>
        <span class="meta">${count}</span>
        <span class="icons">
            <button class="icon-btn pin-tab" title="${t.isPinned ? 'Unpin' : 'Pin'}" aria-label="pin">
                <iconify-icon icon="${t.isPinned ? 'lucide:pin-off' : 'lucide:pin'}"></iconify-icon>
            </button>
        </span>
    `;
    
    el.addEventListener('click', (e) => {
        if (e.target.closest('.icon-btn')) return;
        setActiveTab(t.id);
    });
    
    el.querySelector('.pin-tab').addEventListener('click', () => pinTab(t, p));
    return el;
}

export async function setActiveTab(tabId) {
    const p = currentProfile();
    if (!p || p.activeTabId === tabId) return;
    p.activeTabId = tabId;
    try {
        await fetchAPI(`/api/profiles/${p._id}`, {
            method: 'PUT',
            body: JSON.stringify({ activeTabId: tabId }),
        });
        renderTabs();
        fillEditor();
    } catch(error) {
        alert(error.message);
    }
}

export async function addTab() {
    const p = currentProfile();
    if (!p) return;
    const newTab = { role: 'system', title: 'new tab', content: '', enabled: true };

    try {
        const { tab } = await fetchAPI(`/api/profiles/${p._id}/tabs`, {
            method: 'POST',
            body: JSON.stringify(newTab),
        });
        
        const lastTab = p.tabs[p.tabs.length - 1];
        if (lastTab && lastTab.isPinned) {
            p.tabs.splice(p.tabs.length - 1, 0, tab);
        } else {
            p.tabs.push(tab);
        }

        await fetchAPI(`/api/profiles/${p._id}/tabs/move`, {
            method: 'PUT',
            body: JSON.stringify({ tabs: p.tabs }),
        });

        await setActiveTab(tab.id);
    } catch (error) {
        alert(error.message);
    }
}

export function fillEditor() {
    const t = currentTab();
    if (!t) {
        setCustomSelectValue('system');
        tabTitleEl.value = '';
        tabContentEl.value = '';
        return;
    }
    setCustomSelectValue(t.role);
    tabTitleEl.value = t.title;
    tabContentEl.value = t.content;
    tabContentEl.readOnly = t.content === '{chat_history}';

    if (t.content === '{chat_history}') {
        tabRoleCustom && tabRoleCustom.classList.add('disabled');
    } else {
        tabRoleCustom && tabRoleCustom.classList.remove('disabled');
    }
}

export function loadMergeRolesState() {
    const p = currentProfile();
    if (!p || !mergeConsecutiveRolesToggle) return;
    
    // Default to true if not set
    const mergeEnabled = p.mergeConsecutiveRoles !== undefined ? p.mergeConsecutiveRoles : true;
    mergeConsecutiveRolesToggle.checked = mergeEnabled;
}

async function saveMergeRolesState() {
    const p = currentProfile();
    if (!p || !mergeConsecutiveRolesToggle) return;
    
    const mergeEnabled = mergeConsecutiveRolesToggle.checked;
    p.mergeConsecutiveRoles = mergeEnabled;
    
    try {
        await fetchAPI(`/api/profiles/${p._id}`, {
            method: 'PUT',
            body: JSON.stringify({ mergeConsecutiveRoles: mergeEnabled }),
        });
    } catch (error) {
        alert(error.message);
    }
}

async function onEditorChange() {
    const p = currentProfile();
    const t = currentTab();
    if (!p || !t) return;

    const updatedFields = {
        role: getCustomSelectValue(),
        title: tabTitleEl.value,
        content: tabContentEl.value,
    };

    t.role = updatedFields.role;
    t.title = updatedFields.title;
    t.content = updatedFields.content;
    renderTabs();

    try {
        await fetchAPI(`/api/profiles/${p._id}/tabs/${t.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedFields),
        });
    } catch (error) {
        alert(error.message);
    }
}

export async function toggleTab(tab, profile) {
    const newEnabledState = !tab.enabled;
    try {
        await fetchAPI(`/api/profiles/${profile._id}/tabs/${tab.id}`, {
            method: 'PUT',
            body: JSON.stringify({ enabled: newEnabledState }),
        });
        tab.enabled = newEnabledState;
        renderTabs();
    } catch (error) {
        alert(error.message);
    }
}

export async function deleteTab(tab, profile) {
    if (!confirm(`Are you sure you want to delete tab "${tab.title}"?`)) return;
    try {
        await fetchAPI(`/api/profiles/${profile._id}/tabs/${tab.id}`, {
            method: 'DELETE',
        });
        profile.tabs = profile.tabs.filter(t => t.id !== tab.id);
        if (profile.activeTabId === tab.id) {
            const nextTab = profile.tabs[0] || null;
            await setActiveTab(nextTab ? nextTab.id : null);
        } else {
            renderTabs();
            fillEditor();
        }
    } catch (error) {
        alert(error.message);
    }
}

async function pinTab(tab, profile) {
    const newPinnedState = !tab.isPinned;
    try {
        await fetchAPI(`/api/profiles/${profile._id}/tabs/${tab.id}`, {
            method: 'PUT',
            body: JSON.stringify({ isPinned: newPinnedState }),
        });
        tab.isPinned = newPinnedState;
        renderTabs();
    } catch (error) {
        alert(error.message);
    }
}

export async function moveTab(tabId, direction) {
    const p = currentProfile();
    if (!p) return;

    let index = p.tabs.findIndex(t => t.id === tabId);
    if (index === -1 || p.tabs[index].isPinned) return;

    // Find the boundaries of unpinned tabs
    let firstUnpinnedIndex = 0;
    let lastUnpinnedIndex = p.tabs.length - 1;
    
    // Find first unpinned tab
    while (firstUnpinnedIndex < p.tabs.length && p.tabs[firstUnpinnedIndex].isPinned) {
        firstUnpinnedIndex++;
    }
    
    // Find last unpinned tab
    while (lastUnpinnedIndex >= 0 && p.tabs[lastUnpinnedIndex].isPinned) {
        lastUnpinnedIndex--;
    }
    
    // Can't move if there are no unpinned tabs or only one unpinned tab
    if (firstUnpinnedIndex > lastUnpinnedIndex || firstUnpinnedIndex === lastUnpinnedIndex) {
        return;
    }

    if (direction === 'up') {
        // Can't move up if already at the first unpinned position
        if (index <= firstUnpinnedIndex) return;
        
        // Swap with the previous tab (which must be unpinned)
        [p.tabs[index - 1], p.tabs[index]] = [p.tabs[index], p.tabs[index - 1]];
    } else { // down
        // Can't move down if already at the last unpinned position
        if (index >= lastUnpinnedIndex) return;
        
        // Swap with the next tab (which must be unpinned)
        [p.tabs[index + 1], p.tabs[index]] = [p.tabs[index], p.tabs[index + 1]];
    }

    try {
        const { tabs } = await fetchAPI(`/api/profiles/${p._id}/tabs/move`, {
            method: 'PUT',
            body: JSON.stringify({ tabs: p.tabs }),
        });
        p.tabs = tabs;
        renderTabs();
    } catch (error) {
        alert(error.message);
        // Revert the swap on error
        if (direction === 'up') {
            [p.tabs[index - 1], p.tabs[index]] = [p.tabs[index], p.tabs[index - 1]];
        } else {
            [p.tabs[index], p.tabs[index + 1]] = [p.tabs[index + 1], p.tabs[index]];
        }
    }
}

// Custom Select Logic
function getCustomSelectValue() {
    if (!tabRoleCustom) return 'system';
    const selected = tabRoleCustom.querySelector('.custom-select-option.selected');
    return selected ? selected.dataset.value : 'system';
}

function setCustomSelectValue(value) {
    if (!tabRoleCustom) return;
    
    const trigger = tabRoleCustom.querySelector('.custom-select-trigger span');
    const options = tabRoleCustom.querySelectorAll('.custom-select-option');
    
    options.forEach(opt => {
        if (opt.dataset.value === value) {
            opt.classList.add('selected');
            if (trigger) trigger.textContent = value;
        } else {
            opt.classList.remove('selected');
        }
    });
}

const debouncedEditorChange = () => {
    clearTimeout(editorTimeout);
    editorTimeout = setTimeout(onEditorChange, 500);
};

export function initTabsListeners() {
    addTabBtn.addEventListener('click', addTab);
    
    document.getElementById('moveTabUp').addEventListener('click', () => {
        const t = currentTab();
        if (t) moveTab(t.id, 'up');
    });

    document.getElementById('moveTabDown').addEventListener('click', () => {
        const t = currentTab();
        if (t) moveTab(t.id, 'down');
    });

    document.getElementById('deleteTab').addEventListener('click', () => {
        const t = currentTab();
        const p = currentProfile();
        if (t && p && t.content !== '{chat_history}') deleteTab(t, p);
    });

    document.getElementById('toggleTab').addEventListener('click', () => {
        const t = currentTab();
        const p = currentProfile();
        if (t && p && t.content !== '{chat_history}') toggleTab(t, p);
    });

    // Merge consecutive roles toggle
    if (mergeConsecutiveRolesToggle) {
        mergeConsecutiveRolesToggle.addEventListener('change', saveMergeRolesState);
    }

    // Custom Select
    if (tabRoleCustom) {
        const trigger = tabRoleCustom.querySelector('.custom-select-trigger');
        const options = tabRoleCustom.querySelectorAll('.custom-select-option');
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!tabRoleCustom.classList.contains('disabled')) {
                tabRoleCustom.classList.toggle('active');
            }
        });
        
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                setCustomSelectValue(value);
                tabRoleCustom.classList.remove('active');
                debouncedEditorChange();
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select')) {
                tabRoleCustom.classList.remove('active');
            }
        });
    }

    tabTitleEl.addEventListener('input', debouncedEditorChange);
    tabContentEl.addEventListener('input', debouncedEditorChange);
}