// ===== SHARED AUTHENTICATION MODULE =====
// Handles login and role-based redirection

const API_BASE = 'http://localhost/tristar-system/backend/api/';

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

// Fill demo credentials
function fillDemo(role) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (role === 'admin') {
        emailInput.value = 'admin@tristar.com';
    } else {
        emailInput.value = 'operator@tristar.com';
    }
    passwordInput.value = 'password';
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast('Please enter email and password', true);
                return;
            }
            
            const result = await apiCall('auth.php', 'POST', {
                action: 'login',
                email,
                password
            });
            
            if (result.success && result.user) {
                // Store user session
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                
                // Redirect based on role
                if (result.user.role === 'admin') {
                    window.location.href = './admin/index.html';
                } else if (result.user.role === 'operator') {
                    window.location.href = './operator/index.html';
                } else {
                    showToast('Unknown role. Access denied.', true);
                }
            }
        });
    }
});
