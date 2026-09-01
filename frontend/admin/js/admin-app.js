// ===== ADMIN APP INITIALIZATION =====
// Verifies admin role and sets up admin-specific functionality

document.addEventListener('DOMContentLoaded', function() {
    // Verify admin role
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
        window.location.href = '../login.html';
        return;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }
    
    // Set admin badge
    const badge = document.getElementById('dashRoleBadge');
    if (badge) {
        badge.innerHTML = `<i class="fas fa-crown"></i> ${user.name}`;
    }
    
    // Set current date
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = dateStr;
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = '../login.html';
    });
    
    // Tab navigation with new tab-nav-btn class
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Update active state
            document.querySelectorAll('.tab-nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
            
            // Load tab data
            switch(tabId) {
                case 'tabClients': 
                    if (typeof loadClients === 'function') loadClients(true); 
                    break;
                case 'tabTransactions': 
                    if (typeof loadTransactions === 'function') loadTransactions(true); 
                    break;
                case 'tabProgress': 
                    if (typeof loadJobs === 'function') loadJobs(); 
                    break;
                case 'tabInventory': 
                    if (typeof loadInventory === 'function') loadInventory(); 
                    break;
            }
        });
    });
    
    // Load initial data
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
    if (typeof loadClients === 'function') loadClients(true);
});

// ===== TOGGLE ACTION GROUP =====
function toggleActionGroup(groupId) {
    const group = document.getElementById(groupId);
    const toggleBtn = document.querySelector('[onclick*="toggleActionGroup(\'' + groupId + '\')"]');
    
    if (group.classList.contains('collapsed')) {
        group.classList.remove('collapsed');
        if (toggleBtn) toggleBtn.classList.remove('collapsed');
    } else {
        group.classList.add('collapsed');
        if (toggleBtn) toggleBtn.classList.add('collapsed');
    }
}

// Legacy override for backward compatibility
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-nav-btn, .tab-btn').forEach(btn => {
        if (btn.dataset.tab) {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        }
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');
    
    // Load tab data with reset
    switch(tabId) {
        case 'tabClients': 
            if (typeof loadClients === 'function') loadClients(true); 
            break;
        case 'tabTransactions': 
            if (typeof loadTransactions === 'function') loadTransactions(true); 
            break;
        case 'tabProgress': 
            if (typeof loadJobs === 'function') loadJobs(); 
            break;
        case 'tabInventory': 
            if (typeof loadInventory === 'function') loadInventory(); 
            break;
    }
};
