// ===== API Configuration =====
const API_BASE = '/backend/api/';

// ===== Global State =====
let currentUser = null;
let clientsCache = [];
let categoriesCache = [];

// ===== Currency Formatter (Kenyan Shillings) =====
function formatKSh(amount) {
    const num = parseFloat(amount) || 0;
    return 'KSh ' + num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ===== Toast Notification =====
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = isError ? '#ef4444' : '#fbbf24';
    toast.innerHTML = `<i class="fas fa-${isError ? 'circle-exclamation text-red-400' : 'circle-check text-green-400'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ===== API Call Helper =====
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const url = endpoint.includes('?') 
            ? `${API_BASE}${endpoint}` 
            : `${API_BASE}${endpoint}`;
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        if (!result.success) {
            showToast(result.error || 'Operation failed', true);
        }
        return result;
    } catch (error) {
        showToast('Network error: ' + error.message, true);
        return { success: false, error: error.message };
    }
}

// ===== Modal System =====
function openModal(title, content, onSubmit) {
    const container = document.getElementById('modalContainer');
    const modalId = 'modal-' + Date.now();
    
    const modalHtml = `
        <div class="modal-overlay" id="${modalId}">
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="closeModal('${modalId}')">Cancel</button>
                    <button class="btn btn-sm btn-success" id="${modalId}-submit">
                        <i class="fas fa-check"></i> Save
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = modalHtml;
    
    document.getElementById(`${modalId}-submit`).addEventListener('click', () => {
        const formData = collectFormData();
        if (formData) {
            onSubmit(formData);
            closeModal(modalId);
        }
    });
    
    // Close on overlay click
    document.getElementById(modalId).addEventListener('click', (e) => {
        if (e.target.id === modalId) closeModal(modalId);
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function collectFormData() {
    const inputs = document.querySelectorAll('#modalContainer input, #modalContainer select, #modalContainer textarea');
    const data = {};
    let valid = true;
    
    inputs.forEach(input => {
        const name = input.getAttribute('data-field');
        if (name) {
            if (input.hasAttribute('required') && !input.value.trim()) {
                valid = false;
                input.style.borderColor = '#ef4444';
            } else {
                input.style.borderColor = '';
            }
            let value = input.value.trim();
            if (input.type === 'number') value = parseFloat(value) || 0;
            data[name] = value;
        }
    });
    
    return valid ? data : null;
}

// ===== Navigation =====
function showPage(pageId) {
    // Only hide pages that exist on this page
    const loginPage = document.getElementById('loginPage');
    const signupPage = document.getElementById('signupPage');
    const dashboardPage = document.getElementById('dashboardPage');
    
    if (loginPage) loginPage.classList.add('hidden');
    if (signupPage) signupPage.classList.add('hidden');
    if (dashboardPage) dashboardPage.classList.add('hidden');
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.remove('hidden');
}

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    // Load tab data
    loadTabData(tabId);
}

function switchSubTab(subtabId) {
    // Update sub tab buttons within progress tab
    document.querySelectorAll('[data-subtab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subtab === subtabId);
    });
    
    document.getElementById('subJobs').classList.remove('active');
    document.getElementById('subWorkers').classList.remove('active');
    document.getElementById(subtabId).classList.add('active');
    
    if (subtabId === 'subJobs') loadJobs();
    if (subtabId === 'subWorkers') loadWorkers();
}

async function loadTabData(tabId) {
    switch(tabId) {
        case 'tabClients': await loadClients(); break;
        case 'tabTransactions': await loadTransactions(); break;
        case 'tabProgress': await loadJobs(); break;
        case 'tabInventory': await loadInventory(); break;
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    // Only show login page if it exists (login.html), otherwise show dashboard
    const loginPage = document.getElementById('loginPage');
    if (loginPage) {
        showPage('loginPage');
    } else {
        const dashboardPage = document.getElementById('dashboardPage');
        if (dashboardPage) showPage('dashboardPage');
    }
    
    // Main tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Sub tab switching
    document.querySelectorAll('[data-subtab]').forEach(btn => {
        btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab));
    });
    
    // Search listeners
    const clientSearch = document.getElementById('clientSearch');
    if (clientSearch) {
        let debounce;
        clientSearch.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => loadClients(true), 300);
        });
    }
    
    const invSearch = document.getElementById('inventorySearch');
    if (invSearch) {
        let debounce;
        invSearch.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => loadInventory(), 300);
        });
    }
    
    // Category filter
    const invCatFilter = document.getElementById('inventoryCategoryFilter');
    if (invCatFilter) {
        invCatFilter.addEventListener('change', () => loadInventory());
    }
    
    // Low stock toggle
    const lowStockBtn = document.getElementById('showLowStockBtn');
    if (lowStockBtn) {
        lowStockBtn.addEventListener('click', () => {
            loadInventory(true);
        });
    }
    
    // Job filters
    const jobStatusFilter = document.getElementById('jobStatusFilter');
    if (jobStatusFilter) {
        jobStatusFilter.addEventListener('change', loadJobs);
    }
    const jobViewToggle = document.getElementById('jobViewToggle');
    if (jobViewToggle) {
        jobViewToggle.addEventListener('change', loadJobs);
    }
    
    // Transaction filters
    const transDateFrom = document.getElementById('transDateFrom');
    if (transDateFrom) {
        transDateFrom.addEventListener('change', () => loadTransactions(true));
    }
    const transDateTo = document.getElementById('transDateTo');
    if (transDateTo) {
        transDateTo.addEventListener('change', () => loadTransactions(true));
    }
    const transTypeFilter = document.getElementById('transTypeFilter');
    if (transTypeFilter) {
        transTypeFilter.addEventListener('change', () => loadTransactions(true));
    }
});

// Attach event listeners after all scripts are loaded
window.addEventListener('load', function() {
    // Add buttons - these functions are defined in separately loaded files
    const addClientBtn = document.getElementById('addClientBtn');
    if (addClientBtn && typeof showAddClient === 'function') {
        addClientBtn.addEventListener('click', showAddClient);
    }
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn && typeof showAddTransaction === 'function') {
        addTransactionBtn.addEventListener('click', showAddTransaction);
    }
    const addJobBtn = document.getElementById('addJobBtn');
    if (addJobBtn && typeof showAddJob === 'function') {
        addJobBtn.addEventListener('click', showAddJob);
    }
    const addWorkerBtn = document.getElementById('addWorkerBtn');
    if (addWorkerBtn && typeof showAddWorker === 'function') {
        addWorkerBtn.addEventListener('click', showAddWorker);
    }
    const addInventoryBtn = document.getElementById('addInventoryBtn');
    if (addInventoryBtn && typeof showAddInventory === 'function') {
        addInventoryBtn.addEventListener('click', showAddInventory);
    }
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    if (manageCategoriesBtn && typeof showManageCategories === 'function') {
        manageCategoriesBtn.addEventListener('click', showManageCategories);
    }
});

// Auto-refresh stats only when dashboard is visible
setInterval(async () => {
    const dashboardPage = document.getElementById('dashboardPage');
    if (dashboardPage && !dashboardPage.classList.contains('hidden')) {
        await loadDashboardStats();
    }
}, 30000);
