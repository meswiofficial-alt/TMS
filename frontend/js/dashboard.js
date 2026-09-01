// ===== Dashboard Functions =====

async function loadDashboardStats() {
    console.log('[Dashboard] Loading stats...');
    try {
        const result = await apiCall('dashboard.php');
        console.log('[Dashboard] API response:', result);
        
        if (result && result.success && result.data) {
            const d = result.data;
            console.log('[Dashboard] Data received:', d);
            
            const statClients = document.getElementById('statClients');
            const statVehicles = document.getElementById('statVehicles');
            const statActiveVehicles = document.getElementById('statActiveVehicles');
            const statDailyIncome = document.getElementById('statDailyIncome');
            const statDailyExpense = document.getElementById('statDailyExpense');
            const statLowStock = document.getElementById('statLowStock');
            const statPendingJobs = document.getElementById('statPendingJobs');
            
            if (statClients) statClients.textContent = d.clients || 0;
            if (statVehicles) statVehicles.textContent = d.vehicles || 0;
            if (statActiveVehicles) statActiveVehicles.textContent = d.active_vehicles || 0;
            if (statDailyIncome) statDailyIncome.textContent = formatKSh(d.daily_income || 0);
            if (statDailyExpense) statDailyExpense.textContent = formatKSh(d.daily_expense || 0);
            if (statLowStock) statLowStock.textContent = d.low_stock || 0;
            if (statPendingJobs) statPendingJobs.textContent = d.pending_jobs || 0;
            
            console.log('[Dashboard] Stats updated successfully');
        } else {
            console.warn('[Dashboard] Invalid response format:', result);
        }
    } catch (error) {
        console.error('[Dashboard] Failed to load stats:', error);
    }
}
