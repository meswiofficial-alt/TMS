// ===== OPERATOR APP INITIALIZATION =====
// Verifies operator role and sets up operator-specific functionality

const API_BASE = 'http://localhost/tristar-system/backend/api/';
let currentUser = null;

// ===== Currency Formatter (Kenyan Shillings) =====
function formatKSh(amount) {
    const num = parseFloat(amount) || 0;
    return 'KSh ' + num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Toast notification
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.innerHTML = `<i class="fas fa-${isError ? 'circle-exclamation' : 'circle-check'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// API Call Helper
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
        const url = `${API_BASE}${endpoint}`;
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        showToast(error.message || 'Network error', true);
        return { success: false, error: error.message };
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

// Dynamic Modal with content and callback
function openDynamicModal(title, content, onConfirm) {
    let modal = document.getElementById('dynamicModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamicModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="dynamicModalTitle"></h2>
                    <span class="modal-close" onclick="closeDynamicModal()">&times;</span>
                </div>
                <div id="dynamicModalBody"></div>
                <div class="modal-footer" id="dynamicModalFooter">
                    <button class="btn btn-outline" onclick="closeDynamicModal()">Cancel</button>
                    <button class="btn btn-primary" id="dynamicModalConfirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDynamicModal();
        });
    }
    
    document.getElementById('dynamicModalTitle').innerHTML = title;
    document.getElementById('dynamicModalBody').innerHTML = content;
    
    const confirmBtn = document.getElementById('dynamicModalConfirm');
    confirmBtn.onclick = async () => {
        const data = collectFormData();
        if (onConfirm) await onConfirm(data);
    };
    
    modal.classList.add('show');
}

function closeDynamicModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) modal.classList.remove('show');
}

function collectFormData() {
    const data = {};
    document.querySelectorAll('#dynamicModalBody [data-field]').forEach(el => {
        data[el.dataset.field] = el.value;
    });
    return data;
}

// Load Dropdowns
async function loadClientDropdowns() {
    const result = await apiCall('clients.php');
    if (result.success) {
        const selects = document.querySelectorAll('#vehicleClient');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select Client</option>';
            result.data.forEach(client => {
                select.innerHTML += `<option value="${client.id}">${client.name}</option>`;
            });
        });
    }
}

async function loadVehicleDropdowns() {
    const result = await apiCall('vehicles.php');
    if (result.success) {
        const select = document.getElementById('jobVehicle');
        if (select) {
            select.innerHTML = '<option value="">Select Vehicle</option>';
            result.data.forEach(vehicle => {
                select.innerHTML += `<option value="${vehicle.id}">${vehicle.make} ${vehicle.model} (${vehicle.plate})</option>`;
            });
        }
    }
}

async function loadCategoryDropdowns() {
    const result = await apiCall('inventory_categories.php');
    if (result.success) {
        const select = document.getElementById('inventoryCategory');
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>';
            result.data.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }
    }
}

// Navigation
function switchOperatorTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    loadOperatorTabData(tabId);
}

async function loadOperatorTabData(tabId) {
    switch(tabId) {
        case 'tabTodayClients': await loadTodayClients(); break;
        case 'tabTodayVehicles': await loadTodayVehicles(); break;
        case 'tabTodayTransactions': await loadTodayTransactions(); break;
        case 'tabTodayJobs': await loadTodayJobs(); break;
        case 'tabTodayInventory': await loadTodayInventory(); break;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Verify operator role
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = '../login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    if (currentUser.role !== 'operator' && currentUser.role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }
    
    // Set operator name
    const nameEl = document.getElementById('operatorName');
    if (nameEl) nameEl.textContent = currentUser.name;
    
    // Set dates
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    const todayEl = document.getElementById('todayDate');
    if (todayEl) todayEl.textContent = today;
    const currentEl = document.getElementById('currentDate');
    if (currentEl) currentEl.textContent = today;
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = '../login.html';
    });
    
    // Tab switching
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.tab-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Switch tab content
            switchOperatorTab(btn.dataset.tab);
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('show');
        });
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });
    
    // Load dropdowns
    loadClientDropdowns();
    loadVehicleDropdowns();
    loadCategoryDropdowns();
    
    // Load initial data
    loadOperatorDashboardStats();
    loadTodayClients();
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
        await loadOperatorDashboardStats();
    }, 30000);
});
