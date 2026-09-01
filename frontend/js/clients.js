// ===== Clients & Vehicles Functions =====
let clientsPage = 1;
const CLIENTS_PER_PAGE = 12;
let allClients = [];
let isLoadingClients = false;

async function loadClients(reset = false) {
    const container = document.getElementById('clientsContainer');
    const search = document.getElementById('clientSearch')?.value || '';
    
    if (reset) {
        clientsPage = 1;
        allClients = [];
    }
    
    if (isLoadingClients) return;
    isLoadingClients = true;
    
    const endpoint = search ? `clients.php?search=${encodeURIComponent(search)}` : 'clients.php';
    const result = await apiCall(endpoint);
    
    if (result.success && result.data.length > 0) {
        allClients = result.data;
        const startIdx = 0;
        const endIdx = clientsPage * CLIENTS_PER_PAGE;
        const paginatedClients = allClients.slice(0, endIdx);
        clientsCache = allClients;
        
        renderClientsCards(paginatedClients, container, endIdx >= allClients.length);
    } else if (reset) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No clients found. Add your first client!</p>
            </div>
        `;
    }
    
    isLoadingClients = false;
}

function renderClientsCards(clients, container, isLastPage) {
    let html = '<div class="client-cards">';
    
    clients.forEach(c => {
        html += `
            <div class="client-card" id="client-card-${c.id}" onclick="toggleClientVehicles(${c.id})">
                <div class="client-card-header">
                    <h4><i class="fas fa-user-circle"></i> ${c.name}</h4>
                    <div>
                        <i class="fas fa-plus-circle action-icon" onclick="event.stopPropagation(); showAddVehicleForClient(${c.id})" title="Add Vehicle"></i>
                        <i class="fas fa-edit action-icon" onclick="event.stopPropagation(); editClient(${c.id})" title="Edit"></i>
                        ${currentUser?.role === 'admin' ? `<i class="fas fa-trash action-icon delete" onclick="event.stopPropagation(); deleteClient(${c.id})" title="Delete"></i>` : ''}
                    </div>
                </div>
                <div class="client-card-info"><i class="fas fa-phone"></i> ${c.phone || 'No phone'}</div>
                <div class="client-card-info"><i class="fas fa-envelope"></i> ${c.email || 'No email'}</div>
                <div class="client-card-info"><i class="fas fa-map-marker-alt"></i> ${c.address || 'No address'}</div>
                <div class="client-card-footer">
                    <span class="status-badge status-active"><i class="fas fa-car"></i> ${c.vehicle_count || 0} vehicles</span>
                    <span style="font-size:0.75rem; color:#6b7b8c;">ID: #${c.id}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    if (!isLastPage && clients.length < allClients.length) {
        html += `
            <div class="load-more-container">
                <button class="btn btn-outline btn-sm" onclick="loadMoreClients()">
                    <i class="fas fa-chevron-down"></i> Load More (${allClients.length - clients.length} remaining)
                </button>
            </div>
        `;
    } else if (allClients.length > CLIENTS_PER_PAGE) {
        html += `<div class="load-more-container"><span style="color:#6b7b8c;font-size:0.85rem;">Showing all ${allClients.length} clients</span></div>`;
    }
    
    container.innerHTML = html;
}

function loadMoreClients() {
    clientsPage++;
    const container = document.getElementById('clientsContainer');
    const endIdx = clientsPage * CLIENTS_PER_PAGE;
    const paginatedClients = allClients.slice(0, endIdx);
    
    renderClientsCards(paginatedClients, container, endIdx >= allClients.length);
}

function toggleClientVehicles(clientId) {
    const existing = document.getElementById(`vehicles-${clientId}`);
    if (existing) {
        existing.remove();
        return;
    }
    
    loadClientVehicles(clientId);
}

async function loadClientVehicles(clientId) {
    const result = await apiCall(`vehicles.php?client_id=${clientId}`);
    const clientCard = document.getElementById(`client-card-${clientId}`);
    
    if (clientCard && result.success) {
        const vehiclesHtml = document.createElement('div');
        vehiclesHtml.id = `vehicles-${clientId}`;
        vehiclesHtml.className = 'vehicles-subsection';
        
        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="color:#fbbf24;font-size:0.9rem;"><i class="fas fa-car"></i> Vehicles for this client</strong>
                <button class="btn btn-xs btn-success" onclick="showAddVehicleForClient(${clientId})">
                    <i class="fas fa-plus"></i> Add Vehicle
                </button>
            </div>
        `;
        
        if (result.data.length > 0) {
            // Desktop table view
            html += `
                <div class="table-wrap desktop-only" style="margin:0;">
                    <table>
                        <thead>
                            <tr><th>Make/Model</th><th>Year</th><th>Plate</th><th>VIN</th><th>Color</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
            `;
            result.data.forEach(v => {
                const statusClass = v.status === 'active' ? 'status-active' : 'status-inactive';
                html += `
                    <tr>
                        <td><strong>${v.make} ${v.model}</strong></td>
                        <td>${v.year || '-'}</td>
                        <td>${v.plate}</td>
                        <td>${v.vin || '-'}</td>
                        <td>${v.color || '-'}</td>
                        <td><span class="status-badge ${statusClass}">${v.status}</span></td>
                        <td>
                            <i class="fas fa-edit action-icon" onclick="editVehicle(${v.id})" title="Edit"></i>
                            ${currentUser?.role === 'admin' ? `<i class="fas fa-trash action-icon delete" onclick="deleteVehicle(${v.id})" title="Delete"></i>` : ''}
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
            
            // Mobile card view
            html += '<div class="mobile-cards mobile-only">';
            result.data.forEach(v => {
                const statusClass = v.status === 'active' ? 'status-active' : 'status-inactive';
                html += `
                    <div class="mobile-data-card">
                        <div class="mobile-card-header">
                            <strong>${v.make} ${v.model}</strong>
                            <span class="status-badge ${statusClass}">${v.status}</span>
                        </div>
                        <div class="mobile-card-row"><span>Year:</span> ${v.year || '-'}</div>
                        <div class="mobile-card-row"><span>Plate:</span> ${v.plate}</div>
                        <div class="mobile-card-row"><span>VIN:</span> ${v.vin || '-'}</div>
                        <div class="mobile-card-row"><span>Color:</span> ${v.color || '-'}</div>
                        <div class="mobile-card-actions">
                            <button class="btn btn-xs btn-outline" onclick="editVehicle(${v.id})"><i class="fas fa-edit"></i> Edit</button>
                            ${currentUser?.role === 'admin' ? `<button class="btn btn-xs btn-danger" onclick="deleteVehicle(${v.id})"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += '<p style="color:#6b7b8c; padding:12px;">No vehicles for this client. Click "Add Vehicle" to add one.</p>';
        }
        
        vehiclesHtml.innerHTML = html;
        clientCard.after(vehiclesHtml);
    }
}

function showAddClient() {
    const content = `
        <label for="m-name">Client Name *</label>
        <input type="text" id="m-name" data-field="name" placeholder="Full name" required>
        <label for="m-phone">Phone</label>
        <input type="text" id="m-phone" data-field="phone" placeholder="Phone number">
        <label for="m-email">Email</label>
        <input type="email" id="m-email" data-field="email" placeholder="Email address">
        <label for="m-address">Address</label>
        <input type="text" id="m-address" data-field="address" placeholder="Full address">
    `;
    
    openModal('<i class="fas fa-user-plus"></i> Add New Client', content, async (data) => {
        const result = await apiCall('clients.php', 'POST', data);
        if (result.success) {
            showToast('Client added successfully!');
            loadClients(true);
            loadDashboardStats();
        }
    });
}

function editClient(id) {
    const client = clientsCache.find(c => c.id === id);
    if (!client) return;
    
    const content = `
        <label for="m-name">Client Name *</label>
        <input type="text" id="m-name" data-field="name" value="${client.name}" required>
        <label for="m-phone">Phone</label>
        <input type="text" id="m-phone" data-field="phone" value="${client.phone || ''}">
        <label for="m-email">Email</label>
        <input type="email" id="m-email" data-field="email" value="${client.email || ''}">
        <label for="m-address">Address</label>
        <input type="text" id="m-address" data-field="address" value="${client.address || ''}">
    `;
    
    openModal('<i class="fas fa-user-edit"></i> Edit Client', content, async (data) => {
        const result = await apiCall('clients.php', 'PUT', { ...data, id });
        if (result.success) {
            showToast('Client updated!');
            loadClients(true);
        }
    });
}

async function deleteClient(id) {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated vehicles and records.')) return;
    
    const result = await apiCall(`clients.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Client deleted!');
        loadClients(true);
        loadDashboardStats();
    }
}

// ===== Vehicle Functions =====

async function showAddVehicleForClient(clientId) {
    const result = await apiCall('clients.php');
    if (!result.success) return;
    
    const content = `
        <label for="m-make">Make *</label>
        <input type="text" id="m-make" data-field="make" placeholder="e.g. Toyota" required>
        <label for="m-model">Model *</label>
        <input type="text" id="m-model" data-field="model" placeholder="e.g. Camry" required>
        <label for="m-year">Year</label>
        <input type="number" id="m-year" data-field="year" placeholder="2024" min="1900" max="2030">
        <label for="m-plate">Plate Number *</label>
        <input type="text" id="m-plate" data-field="plate" placeholder="ABC-123" required>
        <label for="m-vin">VIN</label>
        <input type="text" id="m-vin" data-field="vin" placeholder="Vehicle Identification Number">
        <label for="m-color">Color</label>
        <input type="text" id="m-color" data-field="color" placeholder="e.g. Silver">
    `;
    
    openModal('<i class="fas fa-car"></i> Add Vehicle', content, async (data) => {
        data.client_id = clientId;
        data.status = 'active';
        const res = await apiCall('vehicles.php', 'POST', data);
        if (res.success) {
            showToast('Vehicle added!');
            // Refresh the client's vehicles section
            const existing = document.getElementById(`vehicles-${clientId}`);
            if (existing) existing.remove();
            loadClientVehicles(clientId);
            loadDashboardStats();
        }
    });
}

async function editVehicle(id) {
    const result = await apiCall('vehicles.php');
    if (!result.success) return;
    
    const vehicle = result.data.find(v => v.id === id);
    if (!vehicle) return;
    
    const content = `
        <label for="m-make">Make *</label>
        <input type="text" id="m-make" data-field="make" value="${vehicle.make}" required>
        <label for="m-model">Model *</label>
        <input type="text" id="m-model" data-field="model" value="${vehicle.model}" required>
        <label for="m-year">Year</label>
        <input type="number" id="m-year" data-field="year" value="${vehicle.year || ''}" placeholder="2024">
        <label for="m-plate">Plate Number *</label>
        <input type="text" id="m-plate" data-field="plate" value="${vehicle.plate}" required>
        <label for="m-vin">VIN</label>
        <input type="text" id="m-vin" data-field="vin" value="${vehicle.vin || ''}">
        <label for="m-color">Color</label>
        <input type="text" id="m-color" data-field="color" value="${vehicle.color || ''}">
        <label for="m-status">Status</label>
        <select id="m-status" data-field="status">
            <option value="active" ${vehicle.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${vehicle.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
    `;
    
    openModal('<i class="fas fa-car"></i> Edit Vehicle', content, async (data) => {
        data.client_id = vehicle.client_id;
        const res = await apiCall('vehicles.php', 'PUT', { ...data, id });
        if (res.success) {
            showToast('Vehicle updated!');
            loadClients(true);
        }
    });
}

async function deleteVehicle(id) {
    if (!confirm('Delete this vehicle?')) return;
    
    const result = await apiCall(`vehicles.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Vehicle deleted!');
        loadClients(true);
        loadDashboardStats();
    }
}
