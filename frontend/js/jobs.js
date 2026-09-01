// ===== Repair Jobs / Progress Functions =====
let jobsCache = [];

async function loadJobs() {
    const container = document.getElementById('jobsContainer');
    const statusFilter = document.getElementById('jobStatusFilter')?.value;
    const viewMode = document.getElementById('jobViewToggle')?.value || 'kanban';
    
    let endpoint = 'repair_jobs.php?';
    if (statusFilter) endpoint += `status=${statusFilter}&`;
    
    const result = await apiCall(endpoint);
    
    if (result.success && result.data.length > 0) {
        jobsCache = result.data;
        
        if (viewMode === 'kanban') {
            renderKanbanView(container, result.data);
        } else {
            renderTableView(container, result.data);
        }
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <p>No repair jobs found.</p>
            </div>
        `;
    }
}

function renderKanbanView(container, jobs) {
    const columns = {
        pending: { title: 'Pending', icon: 'fa-clock', jobs: [] },
        in_progress: { title: 'In Progress', icon: 'fa-wrench', jobs: [] },
        completed: { title: 'Completed', icon: 'fa-check', jobs: [] },
        ready: { title: 'Ready', icon: 'fa-flag-checkered', jobs: [] }
    };
    
    jobs.forEach(job => {
        const status = job.status.replace('-', '_');
        if (columns[status]) {
            columns[status].jobs.push(job);
        }
    });
    
    let html = '<div class="kanban-board">';
    
    for (const [key, col] of Object.entries(columns)) {
        html += `<div class="kanban-column ${key}">
            <div class="kanban-column-header">
                <i class="fas ${col.icon}"></i> ${col.title} (${col.jobs.length})
            </div>`;
        
        col.jobs.forEach(job => {
            const priorityClass = `priority-${job.priority}`;
            const priorityIcon = job.priority === 'high' ? 'fa-angles-up' : job.priority === 'low' ? 'fa-angle-down' : 'fa-minus';
            
            html += `
                <div class="kanban-card ${priorityClass}" onclick="editJob(${job.id})">
                    <h5>${job.vehicle_name} <small>(${job.plate})</small></h5>
                    <p><i class="fas fa-user"></i> ${job.client_name}</p>
                    <p>${job.description.substring(0, 60)}${job.description.length > 60 ? '...' : ''}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-hard-hat"></i> ${job.worker_name || 'Unassigned'}</span>
                        <span style="color: ${job.priority === 'high' ? '#ef4444' : job.priority === 'low' ? '#4ade80' : '#fbbf24'}">
                            <i class="fas ${priorityIcon}"></i> ${job.priority}
                        </span>
                    </div>
                    ${job.estimated_hours ? `<div class="card-meta"><span><i class="fas fa-clock"></i> Est. ${job.estimated_hours}h</span></div>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderTableView(container, jobs) {
    let html = '';
    
    // Desktop table
    html += '<div class="table-wrap desktop-only"><table><thead><tr>';
    html += '<th>ID</th><th>Vehicle</th><th>Client</th><th>Description</th><th>Worker</th><th>Priority</th><th>Status</th><th>Est. Hours</th><th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    jobs.forEach(job => {
        const statusClass = `status-${job.status}`;
        const priorityClass = `status-${job.priority}`;
        
        html += `<tr>
            <td>#${job.id}</td>
            <td><strong>${job.vehicle_name}</strong> <small>(${job.plate})</small></td>
            <td>${job.client_name}</td>
            <td>${job.description.substring(0, 50)}${job.description.length > 50 ? '...' : ''}</td>
            <td>${job.worker_name || '<span style="color:#6b7b8c">Unassigned</span>'}</td>
            <td><span class="status-badge ${priorityClass}">${job.priority}</span></td>
            <td><span class="status-badge ${statusClass}">${job.status.replace('_', ' ')}</span></td>
            <td>${job.estimated_hours || '-'}h</td>
            <td>
                <i class="fas fa-edit action-icon" onclick="editJob(${job.id})" title="Edit"></i>
                ${currentUser?.role === 'admin' ? `<i class="fas fa-trash action-icon delete" onclick="deleteJob(${job.id})" title="Delete"></i>` : ''}
            </td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // Mobile cards
    html += '<div class="mobile-cards mobile-only">';
    jobs.forEach(job => {
        const priorityColor = job.priority === 'high' ? '#ef4444' : job.priority === 'low' ? '#4ade80' : '#fbbf24';
        html += `
            <div class="mobile-data-card priority-${job.priority}" style="border-left: 3px solid ${priorityColor};">
                <div class="mobile-card-header">
                    <strong>${job.vehicle_name} (${job.plate})</strong>
                    <span class="status-badge status-${job.status}">${job.status.replace('_', ' ')}</span>
                </div>
                <div class="mobile-card-row"><span>Client:</span> ${job.client_name}</div>
                <div class="mobile-card-row"><span>Description:</span> ${job.description.substring(0, 80)}${job.description.length > 80 ? '...' : ''}</div>
                <div class="mobile-card-row"><span>Worker:</span> ${job.worker_name || 'Unassigned'}</div>
                <div class="mobile-card-row"><span>Priority:</span> <span style="color:${priorityColor}">${job.priority}</span></div>
                ${job.estimated_hours ? `<div class="mobile-card-row"><span>Est. Hours:</span> ${job.estimated_hours}h</div>` : ''}
                <div class="mobile-card-actions">
                    <button class="btn btn-xs btn-outline" onclick="editJob(${job.id})"><i class="fas fa-edit"></i> Edit</button>
                    ${currentUser?.role === 'admin' ? `<button class="btn btn-xs btn-danger" onclick="deleteJob(${job.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function showAddJob() {
    Promise.all([apiCall('vehicles.php'), apiCall('workers.php')]).then(([vehicles, workers]) => {
        const vehicleOptions = vehicles.success ? vehicles.data.map(v => 
            `<option value="${v.id}">${v.make} ${v.model} (${v.plate}) - ${v.client_name}</option>`
        ).join('') : '';
        
        const workerOptions = workers.success ? workers.data.map(w => 
            `<option value="${w.id}">${w.name}</option>`
        ).join('') : '';
        
        const content = `
            <label for="m-vehicle">Vehicle *</label>
            <select id="m-vehicle" data-field="vehicle_id" required>
                <option value="">Select vehicle...</option>
                ${vehicleOptions}
            </select>
            <label for="m-worker">Assigned Worker</label>
            <select id="m-worker" data-field="worker_id">
                <option value="">Unassigned</option>
                ${workerOptions}
            </select>
            <label for="m-desc">Description *</label>
            <textarea id="m-desc" data-field="description" rows="3" placeholder="Describe the repair job..." required></textarea>
            <label for="m-priority">Priority</label>
            <select id="m-priority" data-field="priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
            </select>
            <label for="m-hours">Estimated Hours</label>
            <input type="number" id="m-hours" data-field="estimated_hours" placeholder="0.0" step="0.5" min="0">
            <label for="m-start">Start Date</label>
            <input type="date" id="m-start" data-field="start_date">
        `;
        
        openModal('<i class="fas fa-plus-circle"></i> Add Repair Job', content, async (data) => {
            data.status = 'pending';
            const result = await apiCall('repair_jobs.php', 'POST', data);
            if (result.success) {
                showToast('Job added!');
                loadJobs();
                loadDashboardStats();
            }
        });
    });
}

function editJob(id) {
    const job = jobsCache.find(j => j.id === id);
    if (!job) return;
    
    Promise.all([apiCall('vehicles.php'), apiCall('workers.php')]).then(([vehicles, workers]) => {
        const vehicleOptions = vehicles.success ? vehicles.data.map(v => 
            `<option value="${v.id}" ${job.vehicle_id === v.id ? 'selected' : ''}>${v.make} ${v.model} (${v.plate}) - ${v.client_name}</option>`
        ).join('') : '';
        
        const workerOptions = workers.success ? workers.data.map(w => 
            `<option value="${w.id}" ${job.worker_id === w.id ? 'selected' : ''}>${w.name}</option>`
        ).join('') : '';
        
        const content = `
            <label for="m-vehicle">Vehicle *</label>
            <select id="m-vehicle" data-field="vehicle_id" required>
                <option value="">Select vehicle...</option>
                ${vehicleOptions}
            </select>
            <label for="m-worker">Assigned Worker</label>
            <select id="m-worker" data-field="worker_id">
                <option value="">Unassigned</option>
                ${workerOptions}
            </select>
            <label for="m-desc">Description *</label>
            <textarea id="m-desc" data-field="description" rows="3" required>${job.description || ''}</textarea>
            <label for="m-priority">Priority</label>
            <select id="m-priority" data-field="priority">
                <option value="low" ${job.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${job.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${job.priority === 'high' ? 'selected' : ''}>High</option>
            </select>
            <label for="m-hours">Estimated Hours</label>
            <input type="number" id="m-hours" data-field="estimated_hours" value="${job.estimated_hours || ''}" step="0.5">
            <label for="m-status">Status</label>
            <select id="m-status" data-field="status">
                <option value="pending" ${job.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in_progress" ${job.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${job.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="ready" ${job.status === 'ready' ? 'selected' : ''}>Ready</option>
            </select>
            <label for="m-start">Start Date</label>
            <input type="date" id="m-start" data-field="start_date" value="${job.start_date || ''}">
            <label for="m-notes">Notes</label>
            <textarea id="m-notes" data-field="notes" rows="2">${job.notes || ''}</textarea>
        `;
        
        openModal('<i class="fas fa-edit"></i> Edit Job', content, async (data) => {
            const res = await apiCall('repair_jobs.php', 'PUT', { ...data, id });
            if (res.success) {
                showToast('Job updated!');
                loadJobs();
            }
        });
    });
}

async function deleteJob(id) {
    if (!confirm('Delete this repair job?')) return;
    
    const result = await apiCall(`repair_jobs.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Job deleted!');
        loadJobs();
        loadDashboardStats();
    }
}
