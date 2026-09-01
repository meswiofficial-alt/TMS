// ===== DASHBOARD DEBUGGING UTILITY =====
// Run these functions in the browser console to debug dashboard issues

// Test 1: Check if all required functions are defined
function debugCheckFunctions() {
    const checks = {
        'apiCall': typeof apiCall === 'function',
        'formatKSh': typeof formatKSh === 'function',
        'loadDashboardStats': typeof loadDashboardStats === 'function',
        'showToast': typeof showToast === 'function'
    };
    console.table(checks);
    return checks;
}

// Test 2: Check if all required HTML elements exist
function debugCheckElements() {
    const elementIds = [
        'statClients', 'statVehicles', 'statActiveVehicles',
        'statDailyIncome', 'statDailyExpense', 'statLowStock', 'statPendingJobs'
    ];
    const results = {};
    elementIds.forEach(id => {
        const el = document.getElementById(id);
        results[id] = el ? 'Found' : 'MISSING';
    });
    console.table(results);
    return results;
}

// Test 3: Test API call directly
async function debugTestApi() {
    console.log('Testing dashboard.php API...');
    try {
        const response = await fetch('http://localhost/tristar-system/backend/api/dashboard.php');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        return data;
    } catch (error) {
        console.error('API test failed:', error);
        return null;
    }
}

// Test 4: Manually update stats for testing
function debugUpdateStatsManually() {
    const testValues = {
        'statClients': '42',
        'statVehicles': '38',
        'statActiveVehicles': '35',
        'statDailyIncome': 'KSh 12,500',
        'statDailyExpense': 'KSh 3,200',
        'statLowStock': '5',
        'statPendingJobs': '8'
    };
    
    Object.entries(testValues).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            console.log(`Updated ${id} to ${value}`);
        } else {
            console.warn(`Element ${id} not found`);
        }
    });
}

// Test 5: Run full diagnostic
async function debugFullDiagnostic() {
    console.log('=== DASHBOARD DIAGNOSTIC ===');
    
    console.log('\n1. Checking functions...');
    debugCheckFunctions();
    
    console.log('\n2. Checking HTML elements...');
    debugCheckElements();
    
    console.log('\n3. Testing API connection...');
    await debugTestApi();
    
    console.log('\n4. Attempting to load dashboard stats...');
    if (typeof loadDashboardStats === 'function') {
        await loadDashboardStats();
    } else {
        console.error('loadDashboardStats is not defined!');
    }
    
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

// Auto-run diagnostic on page load (for debugging)
// window.addEventListener('load', debugFullDiagnostic);
