// ===== OPERATOR DASHBOARD FUNCTIONS =====

// Load Dashboard Stats
async function loadOperatorDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const clientsResult = await apiCall('clients.php');
    if (clientsResult.success) {
        const todayClients = clientsResult.data.filter(c => 
            c.created_at && c.created_at.startsWith(today)
        );
        document.getElementById('statTodayClients').textContent = todayClients.length;
    }
    
    const vehiclesResult = await apiCall('vehicles.php');
    if (vehiclesResult.success) {
        const todayVehicles = vehiclesResult.data.filter(v => 
            v.created_at && v.created_at.startsWith(today)
        );
        document.getElementById('statTodayVehicles').textContent = todayVehicles.length;
    }
    
    const transactionsResult = await apiCall('transactions.php');
    if (transactionsResult.success) {
        const todayTransactions = transactionsResult.data.filter(t => {
            // Handle both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS" formats
            const transDate = t.transaction_date ? t.transaction_date.toString().split(' ')[0] : null;
            return transDate === today;
        });
        const total = todayTransactions.reduce((sum, t) => {
            return t.type === 'income' ? sum + parseFloat(t.amount) : sum - parseFloat(t.amount);
        }, 0);
        document.getElementById('statTodayRevenue').textContent = formatKSh(total);
    }
    
    const jobsResult = await apiCall('repair_jobs.php');
    if (jobsResult.success) {
        const todayJobs = jobsResult.data.filter(j => 
            j.created_at && j.created_at.startsWith(today)
        );
        document.getElementById('statTodayJobs').textContent = todayJobs.length;
    }
}

// ===== TODAY'S CLIENTS =====
let operatorClientsCache = [];

async function loadTodayClients() {
    const container = document.getElementById('todayClientsContainer');
    const today = new Date().toISOString().split('T')[0];
    
    const result = await apiCall('clients.php');
    if (result.success) {
        operatorClientsCache = result.data;
        const todayClients = result.data.filter(c => 
            c.created_at && c.created_at.startsWith(today)
        );
        
        const countEl = document.getElementById('clientCount');
        if (countEl) countEl.textContent = todayClients.length;
        
        if (todayClients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No clients added today</p>
                    <span style="font-size:0.8rem; color:#6b7b8c;">Click "Add Client" to get started</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Desktop table
        html += '<div class="table-wrap desktop-only"><table class="today-table"><thead><tr>';
        html += '<th>Name</th><th>Phone</th><th>Email</th><th>Added At</th><th>Actions</th>';
        html += '</tr></thead><tbody>';
        
        todayClients.forEach(c => {
            const time = c.created_at ? new Date(c.created_at).toLocaleTimeString() : '-';
            html += `<tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || '-'}</td>
                <td>${c.email || '-'}</td>
                <td>${time}</td>
                <td>
                    <i class="fas fa-edit action-icon" onclick="editClient(${c.id})" title="Edit"></i>
                    <i class="fas fa-car action-icon" onclick="addVehicleForClient(${c.id})" title="Add Vehicle"></i>
                </td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        
        // Mobile cards
        html += '<div class="mobile-cards mobile-only">';
        todayClients.forEach(c => {
            const time = c.created_at ? new Date(c.created_at).toLocaleTimeString() : '-';
            html += `
                <div class="mobile-data-card">
                    <div class="mobile-card-header">
                        <strong>${c.name}</strong>
                        <span style="font-size:0.75rem;color:#6b7b8c;">${time}</span>
                    </div>
                    <div class="mobile-card-row"><span>Phone:</span> ${c.phone || '-'}</div>
                    <div class="mobile-card-row"><span>Email:</span> ${c.email || '-'}</div>
                    <div class="mobile-card-actions">
                        <button class="btn btn-xs btn-outline" onclick="editClient(${c.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-xs btn-success" onclick="addVehicleForClient(${c.id})"><i class="fas fa-car"></i></button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
}

// ===== TODAY'S VEHICLES =====
async function loadTodayVehicles() {
    const container = document.getElementById('todayVehiclesContainer');
    const today = new Date().toISOString().split('T')[0];
    
    const result = await apiCall('vehicles.php');
    if (result.success) {
        const todayVehicles = result.data.filter(v => 
            v.created_at && v.created_at.startsWith(today)
        );
        
        const countEl = document.getElementById('vehicleCount');
        if (countEl) countEl.textContent = todayVehicles.length;
        
        if (todayVehicles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <p>No vehicles added today</p>
                    <span style="font-size:0.8rem; color:#6b7b8c;">Click "Add Vehicle" to get started</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Desktop table
        html += '<div class="table-wrap desktop-only"><table class="today-table"><thead><tr>';
        html += '<th>Client</th><th>Vehicle</th><th>Plate</th><th>Added At</th><th>Actions</th>';
        html += '</tr></thead><tbody>';
        
        todayVehicles.forEach(v => {
            const time = v.created_at ? new Date(v.created_at).toLocaleTimeString() : '-';
            html += `<tr>
                <td>${v.client_name || '-'}</td>
                <td>${v.make} ${v.model} (${v.year || 'N/A'})</td>
                <td><strong>${v.plate}</strong></td>
                <td>${time}</td>
                <td>
                    <i class="fas fa-edit action-icon" onclick="editVehicle(${v.id})" title="Edit"></i>
                </td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        
        // Mobile cards
        html += '<div class="mobile-cards mobile-only">';
        todayVehicles.forEach(v => {
            const time = v.created_at ? new Date(v.created_at).toLocaleTimeString() : '-';
            html += `
                <div class="mobile-data-card">
                    <div class="mobile-card-header">
                        <strong>${v.make} ${v.model}</strong>
                        <span class="status-badge status-active">${v.plate}</span>
                    </div>
                    <div class="mobile-card-row"><span>Client:</span> ${v.client_name || '-'}</div>
                    <div class="mobile-card-row"><span>Year:</span> ${v.year || 'N/A'}</div>
                    <div class="mobile-card-row"><span>Added:</span> ${time}</div>
                    <div class="mobile-card-actions">
                        <button class="btn btn-xs btn-outline" onclick="editVehicle(${v.id})"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
}

// ===== TODAY'S TRANSACTIONS =====
async function loadTodayTransactions() {
    const container = document.getElementById('todayTransactionsContainer');
    const today = new Date().toISOString().split('T')[0];
    
    console.log('[Transactions] Loading today\'s transactions...');
    console.log('[Transactions] Today date:', today);
    
    try {
        const result = await apiCall('transactions.php');
        console.log('[Transactions] API result:', result);
        
        if (result.success && result.data) {
            console.log('[Transactions] Total transactions:', result.data.length);
            
            // Debug: log first transaction date format
            if (result.data.length > 0) {
                console.log('[Transactions] First transaction date:', result.data[0].transaction_date);
                console.log('[Transactions] Date type:', typeof result.data[0].transaction_date);
            }
            
            const todayTransactions = result.data.filter(t => {
                // Handle both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS" formats
                const transDate = t.transaction_date ? t.transaction_date.toString().split(' ')[0] : null;
                return transDate === today;
            });
            
            console.log('[Transactions] Today\'s transactions:', todayTransactions.length);
            
            const countEl = document.getElementById('transactionCount');
            if (countEl) countEl.textContent = todayTransactions.length;
            
            if (todayTransactions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No transactions today</p>
                        <span style="font-size:0.8rem; color:#6b7b8c;">Click "Add Transaction" to get started</span>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            // Desktop table
            html += '<div class="table-wrap desktop-only"><table class="today-table"><thead><tr>';
            html += '<th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Actions</th>';
            html += '</tr></thead><tbody>';
            
            todayTransactions.forEach(t => {
                const isIncome = t.type === 'income';
                const color = isIncome ? '#4ade80' : '#ef4444';
                const sign = isIncome ? '+' : '-';
                html += `<tr style="border-left: 3px solid ${isIncome ? '#22c55e' : '#ef4444'};">
                    <td><span style="color:${color};font-weight:600;">${t.type}</span></td>
                    <td>${t.category}</td>
                    <td>${t.description || '-'}</td>
                    <td style="color:${color};font-weight:600;">${sign}${formatKSh(parseFloat(t.amount))}</td>
                    <td>${t.payment_method || 'cash'}</td>
                    <td>
                        <i class="fas fa-edit action-icon" onclick="editTransaction(${t.id})" title="Edit"></i>
                    </td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            
            // Mobile cards
            html += '<div class="mobile-cards mobile-only">';
            todayTransactions.forEach(t => {
                const isIncome = t.type === 'income';
                const color = isIncome ? '#4ade80' : '#ef4444';
                html += `
                    <div class="mobile-data-card" style="border-left: 3px solid ${isIncome ? '#22c55e' : '#ef4444'};">
                        <div class="mobile-card-header">
                            <span style="color:${color};font-weight:700;font-size:1.1rem;">${isIncome ? '+' : '-'}${formatKSh(parseFloat(t.amount))}</span>
                            <span class="status-badge" style="background:${color}15;color:${color};">${t.type}</span>
                        </div>
                        <div class="mobile-card-row"><span>Category:</span> ${t.category}</div>
                        <div class="mobile-card-row"><span>Description:</span> ${t.description || '-'}</div>
                        <div class="mobile-card-row"><span>Method:</span> ${t.payment_method || 'cash'}</div>
                        <div class="mobile-card-actions">
                            <button class="btn btn-xs btn-outline" onclick="editTransaction(${t.id})"><i class="fas fa-edit"></i> Edit</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            container.innerHTML = html;
            console.log('[Transactions] Table rendered successfully');
        } else {
            console.warn('[Transactions] API returned no data or error:', result);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load transactions</p>
                    <span style="font-size:0.8rem; color:#6b7b8c;">${result.error || 'Unknown error'}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('[Transactions] Error loading transactions:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading transactions</p>
                <span style="font-size:0.8rem; color:#6b7b8c;">${error.message}</span>
            </div>
        `;
    }
}

// ===== TODAY'S JOBS =====
async function loadTodayJobs() {
    const container = document.getElementById('todayJobsContainer');
    const today = new Date().toISOString().split('T')[0];
    
    const result = await apiCall('repair_jobs.php');
    if (result.success) {
        const todayJobs = result.data.filter(j => 
            j.created_at && j.created_at.startsWith(today)
        );
        
        const countEl = document.getElementById('jobCount');
        if (countEl) countEl.textContent = todayJobs.length;
        
        if (todayJobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>No jobs created today</p>
                    <span style="font-size:0.8rem; color:#6b7b8c;">Click "New Job" to get started</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Desktop table
        html += '<div class="table-wrap desktop-only"><table class="today-table"><thead><tr>';
        html += '<th>Vehicle</th><th>Description</th><th>Priority</th><th>Status</th><th>Actions</th>';
        html += '</tr></thead><tbody>';
        
        todayJobs.forEach(j => {
            const priorityColors = { 'high': '#ef4444', 'medium': '#fbbf24', 'low': '#4ade80' };
            const statusClasses = { 'pending': 'status-pending', 'in_progress': 'status-progress', 'completed': 'status-ready', 'ready': 'status-ready' };
            
            html += `<tr>
                <td>${j.vehicle_name || 'N/A'}</td>
                <td>${j.description}</td>
                <td><span style="color:${priorityColors[j.priority] || '#9aa9bb'};">${j.priority || 'medium'}</span></td>
                <td><span class="status-badge ${statusClasses[j.status] || ''}">${j.status || 'pending'}</span></td>
                <td>
                    <i class="fas fa-edit action-icon" onclick="editJob(${j.id})" title="Edit"></i>
                </td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        
        // Mobile cards
        html += '<div class="mobile-cards mobile-only">';
        todayJobs.forEach(j => {
            const priorityColors = { 'high': '#ef4444', 'medium': '#fbbf24', 'low': '#4ade80' };
            const priorityColor = priorityColors[j.priority] || '#9aa9bb';
            html += `
                <div class="mobile-data-card priority-${j.priority}" style="border-left:3px solid ${priorityColor};">
                    <div class="mobile-card-header">
                        <strong>${j.vehicle_name || 'N/A'}</strong>
                        <span class="status-badge status-${j.status}">${j.status || 'pending'}</span>
                    </div>
                    <div class="mobile-card-row"><span>Description:</span> ${j.description.substring(0, 60)}${j.description.length > 60 ? '...' : ''}</div>
                    <div class="mobile-card-row"><span>Priority:</span> <span style="color:${priorityColor}">${j.priority || 'medium'}</span></div>
                    <div class="mobile-card-actions">
                        <button class="btn btn-xs btn-outline" onclick="editJob(${j.id})"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
}

// ===== TODAY'S INVENTORY =====
async function loadTodayInventory() {
    const container = document.getElementById('todayInventoryContainer');
    const today = new Date().toISOString().split('T')[0];
    
    const result = await apiCall('inventory.php');
    if (result.success) {
        const todayItems = result.data.filter(i => 
            i.created_at && i.created_at.startsWith(today)
        );
        
        const countEl = document.getElementById('inventoryCount');
        if (countEl) countEl.textContent = todayItems.length;
        
        if (todayItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box"></i>
                    <p>No inventory items added today</p>
                    <span style="font-size:0.8rem; color:#6b7b8c;">Click "Add Inventory" to get started</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Desktop table
        html += '<div class="table-wrap desktop-only"><table class="today-table"><thead><tr>';
        html += '<th>Item</th><th>Category</th><th>Quantity</th><th>Location</th><th>Actions</th>';
        html += '</tr></thead><tbody>';
        
        todayItems.forEach(i => {
            const lowStock = i.quantity <= i.min_quantity ? 'color: #ef4444;' : '';
            html += `<tr>
                <td><strong>${i.name}</strong></td>
                <td>${i.category_name || 'Uncategorized'}</td>
                <td style="${lowStock}">${i.quantity} ${i.unit}</td>
                <td>${i.location || '-'}</td>
                <td>
                    <i class="fas fa-edit action-icon" onclick="editInventory(${i.id})" title="Edit"></i>
                </td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        
        // Mobile cards
        html += '<div class="mobile-cards mobile-only">';
        todayItems.forEach(i => {
            const lowStock = i.quantity <= i.min_quantity;
            html += `
                <div class="mobile-data-card" style="${lowStock ? 'border-left: 3px solid #ef4444;' : ''}">
                    <div class="mobile-card-header">
                        <strong>${i.name}</strong>
                        <span class="stock-indicator ${lowStock ? 'low-stock' : 'in-stock'}">${i.quantity} ${i.unit}</span>
                    </div>
                    <div class="mobile-card-row"><span>Category:</span> ${i.category_name || 'Uncategorized'}</div>
                    <div class="mobile-card-row"><span>Location:</span> ${i.location || '-'}</div>
                    <div class="mobile-card-actions">
                        <button class="btn btn-xs btn-outline" onclick="editInventory(${i.id})"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
}

// ===== EDIT FUNCTIONS =====
function editClient(id) {
    const client = operatorClientsCache.find(c => c.id === id);
    if (!client) return;
    
    const name = prompt('Edit client name:', client.name);
    if (name && name.trim()) {
        const phone = prompt('Edit phone:', client.phone || '') || '';
        const email = prompt('Edit email:', client.email || '') || '';
        
        apiCall('clients.php', 'PUT', { id, name: name.trim(), phone, email }).then(res => {
            if (res.success) {
                showToast('Client updated!');
                loadTodayClients();
                loadOperatorDashboardStats();
            }
        });
    }
}

function editVehicle(id) {
    apiCall('vehicles.php').then(result => {
        if (!result.success) return;
        const vehicle = result.data.find(v => v.id === id);
        if (!vehicle) return;
        
        const make = prompt('Edit make:', vehicle.make);
        if (make && make.trim()) {
            const model = prompt('Edit model:', vehicle.model) || vehicle.model;
            const plate = prompt('Edit plate:', vehicle.plate) || vehicle.plate;
            
            apiCall('vehicles.php', 'PUT', { 
                id, client_id: vehicle.client_id, make: make.trim(), model, plate,
                year: vehicle.year, vin: vehicle.vin, color: vehicle.color, status: vehicle.status
            }).then(res => {
                if (res.success) {
                    showToast('Vehicle updated!');
                    loadTodayVehicles();
                }
            });
        }
    });
}

function editTransaction(id) {
    apiCall('transactions.php').then(result => {
        if (!result.success) return;
        const trans = result.data.find(t => t.id === id);
        if (!trans) return;
        
        const amount = prompt('Edit amount:', trans.amount);
        if (amount && !isNaN(amount)) {
            apiCall('transactions.php', 'PUT', { 
                id, type: trans.type, category: trans.category, 
                description: trans.description, amount: parseFloat(amount),
                payment_method: trans.payment_method, transaction_date: trans.transaction_date
            }).then(res => {
                if (res.success) {
                    showToast('Transaction updated!');
                    loadTodayTransactions();
                }
            });
        }
    });
}

function editJob(id) {
    apiCall('repair_jobs.php').then(result => {
        if (!result.success) return;
        const job = result.data.find(j => j.id === id);
        if (!job) return;
        
        const status = prompt('Edit status (pending/in_progress/completed/ready):', job.status);
        if (status) {
            apiCall('repair_jobs.php', 'PUT', { 
                id, vehicle_id: job.vehicle_id, worker_id: job.worker_id,
                description: job.description, status, priority: job.priority,
                estimated_hours: job.estimated_hours, start_date: job.start_date
            }).then(res => {
                if (res.success) {
                    showToast('Job updated!');
                    loadTodayJobs();
                }
            });
        }
    });
}

function editInventory(id) {
    apiCall('inventory.php').then(result => {
        if (!result.success) return;
        const item = result.data.find(i => i.id === id);
        if (!item) return;
        
        const qty = prompt('Edit quantity:', item.quantity);
        if (qty && !isNaN(qty)) {
            apiCall('inventory.php', 'PUT', { 
                id, name: item.name, category_id: item.category_id,
                quantity: parseInt(qty), unit: item.unit, location: item.location,
                min_quantity: item.min_quantity, price: item.price
            }).then(res => {
                if (res.success) {
                    showToast('Item updated!');
                    loadTodayInventory();
                }
            });
        }
    });
}

function addVehicleForClient(clientId) {
    openModal('vehicleModal');
    // Pre-select client if possible
    setTimeout(() => {
        const select = document.getElementById('vehicleClient');
        if (select) select.value = clientId;
    }, 100);
}

// ===== FORM SUBMISSIONS =====
document.addEventListener('DOMContentLoaded', function() {
    // Add Client
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('clientName').value,
                phone: document.getElementById('clientPhone').value,
                email: document.getElementById('clientEmail').value,
                address: document.getElementById('clientAddress').value
            };
            
            const result = await apiCall('clients.php', 'POST', data);
            if (result.success) {
                showToast('Client added successfully!');
                closeModal('clientModal');
                addClientForm.reset();
                loadOperatorDashboardStats();
                loadTodayClients();
                loadClientDropdowns();
            }
        });
    }

    // Add Vehicle
    const addVehicleForm = document.getElementById('addVehicleForm');
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                client_id: document.getElementById('vehicleClient').value,
                make: document.getElementById('vehicleMake').value,
                model: document.getElementById('vehicleModel').value,
                year: document.getElementById('vehicleYear').value || null,
                plate: document.getElementById('vehiclePlate').value,
                vin: '',
                color: document.getElementById('vehicleColor').value || '',
                status: 'active'
            };
            
            if (!data.client_id || !data.make || !data.model || !data.plate) {
                showToast('Please fill all required fields', true);
                return;
            }
            
            try {
                const result = await apiCall('vehicles.php', 'POST', data);
                if (result.success) {
                    showToast('Vehicle added successfully!');
                    closeModal('vehicleModal');
                    addVehicleForm.reset();
                    loadOperatorDashboardStats();
                    loadTodayVehicles();
                    loadVehicleDropdowns();
                }
            } catch (error) {
                showToast('Failed to add vehicle: ' + error.message, true);
            }
        });
    }

    // Add Job
    const addJobForm = document.getElementById('addJobForm');
    if (addJobForm) {
        addJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                vehicle_id: document.getElementById('jobVehicle').value,
                description: document.getElementById('jobDescription').value,
                priority: document.getElementById('jobPriority').value,
                worker_id: null,
                status: 'pending',
                estimated_hours: null,
                start_date: null,
                notes: ''
            };
            
            if (!data.vehicle_id || !data.description) {
                showToast('Please fill all required fields', true);
                return;
            }
            
            try {
                const result = await apiCall('repair_jobs.php', 'POST', data);
                if (result.success) {
                    showToast('Job created successfully!');
                    closeModal('jobModal');
                    addJobForm.reset();
                    loadOperatorDashboardStats();
                    loadTodayJobs();
                }
            } catch (error) {
                showToast('Failed to create job: ' + error.message, true);
            }
        });
    }

    // Add Transaction
    const addTransactionForm = document.getElementById('addTransactionForm');
    if (addTransactionForm) {
        addTransactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                type: document.getElementById('transactionType').value,
                category: document.getElementById('transactionCategory').value,
                description: document.getElementById('transactionDescription').value,
                amount: parseFloat(document.getElementById('transactionAmount').value) || 0,
                payment_method: document.getElementById('transactionPaymentMethod').value,
                transaction_date: new Date().toISOString().split('T')[0]
            };
            
            if (!data.type || !data.category || !data.amount) {
                showToast('Please fill all required fields', true);
                return;
            }
            
            try {
                const result = await apiCall('transactions.php', 'POST', data);
                if (result.success) {
                    showToast('Transaction added successfully!');
                    closeModal('transactionModal');
                    addTransactionForm.reset();
                    loadOperatorDashboardStats();
                    loadTodayTransactions();
                }
            } catch (error) {
                showToast('Failed to add transaction: ' + error.message, true);
            }
        });
    }

    // Add Inventory
    const addInventoryForm = document.getElementById('addInventoryForm');
    if (addInventoryForm) {
        addInventoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('inventoryName').value,
                category_id: document.getElementById('inventoryCategory').value || null,
                quantity: parseInt(document.getElementById('inventoryQuantity').value) || 0,
                unit: 'pieces',
                location: document.getElementById('inventoryLocation').value || '',
                min_quantity: 5,
                supplier: '',
                price: parseFloat(document.getElementById('inventoryPrice').value) || 0,
                vehicle_id: null
            };
            
            if (!data.name || !data.quantity) {
                showToast('Please fill all required fields', true);
                return;
            }
            
            try {
                const result = await apiCall('inventory.php', 'POST', data);
                if (result.success) {
                    showToast('Inventory item added successfully!');
                    closeModal('inventoryModal');
                    addInventoryForm.reset();
                    loadOperatorDashboardStats();
                    loadTodayInventory();
                }
            } catch (error) {
                showToast('Failed to add item: ' + error.message, true);
            }
        });
    }
});

// ===== TOGGLE ACTION GROUP =====
function toggleActionGroup(groupId) {
    const group = document.getElementById(groupId);
    const toggleBtn = document.getElementById('toggle' + groupId.charAt(0).toUpperCase() + groupId.slice(1));
    
    if (group.classList.contains('collapsed')) {
        group.classList.remove('collapsed');
        if (toggleBtn) toggleBtn.classList.remove('collapsed');
    } else {
        group.classList.add('collapsed');
        if (toggleBtn) toggleBtn.classList.add('collapsed');
    }
}

// ===== OPERATOR REPORT MODAL =====
function openOperatorReportModal() {
    const content = `
        <div class="report-config">
            <label for="opReportSection">Report Section *</label>
            <select id="opReportSection" data-field="section">
                <option value="all">All Sections</option>
                <option value="clients">Clients</option>
                <option value="vehicles">Vehicles</option>
                <option value="transactions">Transactions</option>
                <option value="inventory">Inventory</option>
                <option value="workers">Workers</option>
                <option value="repair_jobs">Repair Jobs</option>
            </select>
            
            <label for="opReportFormat">Export Format *</label>
            <select id="opReportFormat" data-field="format">
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word (.docx)</option>
            </select>
            
            <div style="display:flex;gap:12px;margin-top:12px;">
                <div style="flex:1;">
                    <label for="opReportDateFrom">Date From</label>
                    <input type="date" id="opReportDateFrom" data-field="date_from">
                </div>
                <div style="flex:1;">
                    <label for="opReportDateTo">Date To</label>
                    <input type="date" id="opReportDateTo" data-field="date_to">
                </div>
            </div>
        </div>
    `;
    
    openDynamicModal('<i class="fas fa-chart-bar"></i> Generate Report', content, async (data) => {
        if (!data.section || !data.format) {
            showToast('Please select section and format', true);
            return;
        }
        
        showLoader();
        
        try {
            const response = await fetch('http://localhost/tristar-system/backend/api/reports.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: data.section,
                    format: data.format,
                    date_from: data.date_from || null,
                    date_to: data.date_to || null
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Report generated successfully!');
                closeDynamicModal();
                window.open(result.download_url, '_blank');
            } else {
                showToast('Failed: ' + result.error, true);
            }
        } catch (error) {
            showToast('Error: ' + error.message, true);
        } finally {
            hideLoader();
        }
    });
}

// ===== OPERATOR INVOICE MODAL =====
function openOperatorInvoiceModal() {
    apiCall('clients.php').then(clientsResult => {
        if (!clientsResult.success) return;
        
        const clients = clientsResult.data;
        const clientOptions = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        const content = `
            <div class="invoice-config">
                <label for="opInvoiceClient">Client *</label>
                <select id="opInvoiceClient" data-field="client_id" required>
                    <option value="">Select Client</option>
                    ${clientOptions}
                </select>
                
                <div id="opInvoiceItems">
                    <label>Items *</label>
                    <div class="invoice-item-row" style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" class="item-desc" placeholder="Description" required style="flex:2;">
                        <input type="number" class="item-qty" placeholder="Qty" value="1" min="1" step="0.01" style="flex:1;">
                        <input type="number" class="item-price" placeholder="Unit Price" step="0.01" required style="flex:1;">
                        <button type="button" class="btn btn-sm btn-danger remove-item" style="display:none;">&times;</button>
                    </div>
                </div>
                
                <button type="button" class="btn btn-sm btn-outline" id="opAddItemBtn"><i class="fas fa-plus"></i> Add Item</button>
                
                <label for="opInvoiceTaxRate">Tax Rate (%)</label>
                <input type="number" id="opInvoiceTaxRate" data-field="tax_rate" value="0" min="0" max="100">
                
                <label for="opInvoiceNotes">Notes</label>
                <textarea id="opInvoiceNotes" data-field="notes" rows="2"></textarea>
            </div>
        `;
        
        openDynamicModal('<i class="fas fa-file-invoice"></i> Create Invoice', content, async (data) => {
            const items = collectOpInvoiceItems();
            if (items.length === 0) {
                showToast('Please add at least one item', true);
                return;
            }
            
            showLoader();
            try {
                const response = await fetch('http://localhost/tristar-system/backend/api/invoices.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create',
                        client_id: data.client_id,
                        items: items,
                        tax_rate: parseFloat(data.tax_rate) || 0,
                        notes: data.notes || ''
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    showToast('Invoice created: ' + result.invoice_number);
                    closeDynamicModal();
                    generateOpInvoicePDF(result.invoice_id);
                } else {
                    showToast('Failed: ' + result.error, true);
                }
            } catch (error) {
                showToast('Error: ' + error.message, true);
            } finally {
                hideLoader();
            }
        });
        
        setTimeout(() => {
            document.getElementById('opAddItemBtn').onclick = addOpInvoiceItem;
        }, 100);
    });
}

function addOpInvoiceItem() {
    const container = document.getElementById('opInvoiceItems');
    const row = document.createElement('div');
    row.className = 'invoice-item-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
    row.innerHTML = `
        <input type="text" class="item-desc" placeholder="Description" required style="flex:2;">
        <input type="number" class="item-qty" placeholder="Qty" value="1" min="1" step="0.01" style="flex:1;">
        <input type="number" class="item-price" placeholder="Unit Price" step="0.01" required style="flex:1;">
        <button type="button" class="btn btn-sm btn-danger remove-item">&times;</button>
    `;
    container.appendChild(row);
    row.querySelector('.remove-item').onclick = () => row.remove();
}

function collectOpInvoiceItems() {
    const rows = document.querySelectorAll('#opInvoiceItems .invoice-item-row');
    const items = [];
    rows.forEach(row => {
        const desc = row.querySelector('.item-desc').value;
        const qty = parseFloat(row.querySelector('.item-qty').value) || 1;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        if (desc && price > 0) {
            items.push({ description: desc, quantity: qty, unit_price: price });
        }
    });
    return items;
}

async function generateOpInvoicePDF(invoiceId) {
    try {
        const response = await fetch('http://localhost/tristar-system/backend/api/invoices.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_pdf', invoice_id: invoiceId })
        });
        const result = await response.json();
        if (result.success) window.open(result.download_url, '_blank');
    } catch (error) {
        console.error('PDF generation failed:', error);
    }
}
