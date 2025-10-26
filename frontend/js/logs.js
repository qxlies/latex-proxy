/**
 * Logs Module
 * Handles request logging and display
 */

import { fetchAPI } from './api.js';
import { state } from './state.js';

// DOM Elements
const logsContainer = document.getElementById('logsContainer');
const logsPagination = document.getElementById('logsPagination');
const loggingToggle = document.getElementById('loggingToggle');

export async function fetchLogs(page = 1) {
    try {
        const data = await fetchAPI(`/api/logs?page=${page}`);
        renderLogs(data.logs);
        renderPagination(data.totalPages, data.currentPage);
    } catch (error) {
        logsContainer.innerHTML = 'Failed to load logs.';
    }
}

function renderLogs(logs) {
    logsContainer.innerHTML = '';
    if (logs.length === 0) {
        logsContainer.innerHTML = '<p>No logs found.</p>';
        return;
    }

    logs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        const statusClass = log.statusCode >= 400 ? 'status-error' : 'status-200';
        const totalTokens = log.usage ? log.usage.total_tokens : 'N/A';

        logItem.innerHTML = `
            <span class="log-status ${statusClass}">${log.statusCode}</span>
            <span class="log-time">${new Date(log.createdAt).toLocaleString()}</span>
            <span class="log-tokens">Tokens: ${totalTokens}</span>
            <button class="log-details-toggle">View Details</button>
        `;

        logItem.querySelector('.log-details-toggle').addEventListener('click', () => {
            openLogModal(log);
        });

        logsContainer.appendChild(logItem);
    });
}

function openLogModal(log) {
    const modal = document.createElement('div');
    modal.className = 'modal log-modal';
    modal.id = 'logModal';
    
    const statusClass = log.statusCode >= 400 ? 'status-error' : 'status-200';
    const totalTokens = log.usage ? log.usage.total_tokens : 'N/A';
    
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="log-modal-title">
                    <h2>Log Details</h2>
                    <div class="log-modal-meta">
                        <span class="log-status ${statusClass}">${log.statusCode}</span>
                        <span class="log-time">${new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                <div class="log-modal-right">
                    <span class="log-tokens">Tokens: ${totalTokens}</span>
                    <button class="modal-close" id="closeLogModal">
                        <iconify-icon icon="lucide:x"></iconify-icon>
                    </button>
                </div>
            </div>
            <div class="modal-body">
                <div class="log-tabs">
                    <div class="log-tab-buttons">
                        <button class="log-tab-btn active" data-tab="response">Response</button>
                        ${log.placeholders && Object.keys(log.placeholders).some(key => log.placeholders[key]) ?
                            '<button class="log-tab-btn" data-tab="placeholders">Request Data</button>' : ''}
                    </div>
                    <div class="log-tab-contents">
                        <div class="log-tab-content active" data-tab="response">
                            <pre><code class="json">${JSON.stringify(log.responseBody, null, 2)}</code></pre>
                        </div>
                        ${log.placeholders && Object.keys(log.placeholders).some(key => log.placeholders[key]) ?
                            createPlaceholdersTab(log.placeholders) : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Highlight code
    const codeBlock = modal.querySelector('code.json');
    if (codeBlock) {
        hljs.highlightElement(codeBlock);
    }
    
    // Tab switching
    const tabButtons = modal.querySelectorAll('.log-tab-btn');
    const tabContents = modal.querySelectorAll('.log-tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabContents.forEach(content => {
                if (content.dataset.tab === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
    
    // Placeholder toggle handlers
    const placeholderItems = modal.querySelectorAll('.placeholder-item');
    placeholderItems.forEach(item => {
        const header = item.querySelector('.placeholder-header');
        const preview = item.querySelector('.placeholder-preview');
        const toggle = item.querySelector('.placeholder-toggle');
        const icon = toggle.querySelector('iconify-icon');
        
        header.addEventListener('click', () => {
            const isCollapsed = item.classList.contains('collapsed');
            if (isCollapsed) {
                item.classList.remove('collapsed');
                icon.setAttribute('icon', 'lucide:chevron-up');
            } else {
                item.classList.add('collapsed');
                icon.setAttribute('icon', 'lucide:chevron-down');
            }
        });
        
        if (preview) {
            preview.addEventListener('click', () => {
                if (item.classList.contains('collapsed')) {
                    item.classList.remove('collapsed');
                    icon.setAttribute('icon', 'lucide:chevron-up');
                }
            });
        }
    });
    
    // Close handlers
    const closeBtn = modal.querySelector('#closeLogModal');
    const overlay = modal.querySelector('.modal-overlay');
    
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

function createPlaceholdersTab(placeholders) {
    const placeholderLabels = {
        user: 'User Name',
        char: 'Character Name',
        bot_persona: 'Bot Persona',
        scenario: 'Scenario',
        user_persona: 'User Persona',
        summary: 'Summary',
        lorebooks: 'Lorebooks',
        example_dialogs: 'Example Dialogs'
    };
    
    let items = '';
    Object.entries(placeholders).forEach(([key, value]) => {
        if (value && value.trim()) {
            const label = placeholderLabels[key] || key;
            const escapedValue = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const previewText = escapedValue.length > 100
                ? escapedValue.substring(0, 100) + '...'
                : escapedValue;
            
            items += `
                <div class="placeholder-item collapsed">
                    <div class="placeholder-header">
                        <div class="placeholder-label">${label}</div>
                        <button class="placeholder-toggle">
                            <iconify-icon icon="lucide:chevron-down"></iconify-icon>
                        </button>
                    </div>
                    <div class="placeholder-preview">${previewText}</div>
                    <div class="placeholder-content">${escapedValue}</div>
                </div>
            `;
        }
    });
    
    return `
        <div class="log-tab-content" data-tab="placeholders">
            <div class="placeholders-list">
                ${items}
            </div>
        </div>
    `;
}

function renderPagination(totalPages, currentPage) {
    logsPagination.innerHTML = '';
    
    if (totalPages <= 1) return;

    totalPages = Number(totalPages);
    currentPage = Number(currentPage);
    
    const maxButtons = 7;
    const pages = [];
    
    if (totalPages <= maxButtons) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        pages.push(1);
        
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) {
            startPage = 2;
            endPage = Math.min(5, totalPages - 1);
        }

        if (currentPage >= totalPages - 2) {
            startPage = Math.max(2, totalPages - 4);
            endPage = totalPages - 1;
        }

        if (startPage > 2) {
            pages.push('...');
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        if (endPage < totalPages - 1) {
            pages.push('...');
        }
        
        pages.push(totalPages);
    }

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-ghost pagination-arrow';
    prevBtn.innerHTML = '<iconify-icon icon="lucide:chevron-left"></iconify-icon>';
    prevBtn.disabled = currentPage <= 1;
    if (currentPage > 1) {
        prevBtn.addEventListener('click', () => fetchLogs(currentPage - 1));
    }
    logsPagination.appendChild(prevBtn);

    pages.forEach(page => {
        if (page === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            logsPagination.appendChild(ellipsis);
        } else {
            const pageButton = document.createElement('button');
            pageButton.textContent = page;
            pageButton.className = `btn btn-ghost ${page == currentPage ? 'active' : ''}`;
            pageButton.addEventListener('click', () => fetchLogs(page));
            logsPagination.appendChild(pageButton);
        }
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-ghost pagination-arrow';
    nextBtn.innerHTML = '<iconify-icon icon="lucide:chevron-right"></iconify-icon>';
    nextBtn.disabled = currentPage >= totalPages;
    if (currentPage < totalPages) {
        nextBtn.addEventListener('click', () => fetchLogs(currentPage + 1));
    }
    logsPagination.appendChild(nextBtn);
}

export function initLogsListeners() {
    loggingToggle.addEventListener('change', async (e) => {
        const isLoggingEnabled = e.target.checked;
        try {
            await fetchAPI('/api/users/me/logging', {
                method: 'PUT',
                body: JSON.stringify({ isLoggingEnabled }),
            });
            state.user.isLoggingEnabled = isLoggingEnabled;
        } catch (error) {
            alert(error.message);
        }
    });
}