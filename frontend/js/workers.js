// ===== Worker Management Functions =====
let workersCache = [];

async function loadWorkers() {
    const container = document.getElementById('workersContainer');
    const result = await apiCall('workers.php');
    
    if (result.success && result.data.length > 0) {
        workersCache = result.data;
        
        let html = '';
        
        // Desktop table
        html += '<div class="table-wrap desktop-only"><table><thead><tr>';
        html += '<th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Position</th><th>Hire Date</th><th>Active Jobs</th><th>Status</th><th>Actions</th>';
        html += '</tr></thead><tbody>';
        
        result.data.forEach(w => {
            const statusClass = w.status === 'active' ? 'status-active' : 'status-inactive';
            html += `<tr>
                <td>#${w.id}</td>
                <td><strong>${w.name}</strong></td>
                <td>${w.phone || '-'}</td>
                <td>${w.email || '-'}</td>
                <td>${w.position || '-'}</td>
                <td>${formatDate(w.hire_date)}</td>
                <td><span class="status-badge ${w.active_jobs > 0 ? 'status-pending' : ''}">${w.active_jobs || 0}</span></td>
                <td><span class="status-badge ${statusClass}">${w.status}</span></td>
                <td>
                    <i class="fas fa-edit action-icon" onclick="editWorker(${w.id})" title="Edit"></i>
                    ${currentUser?.role === 'admin' ? `<i class="fas fa-trash action-icon delete" onclick="deleteWorker(${w.id})" title="Delete"></i>` : ''}
                </td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        
        // Mobile cards
        html += '<div class="mobile-cards mobile-only">';
        result.data.forEach(w => {
            const statusClass = w.status === 'active' ? 'status-active' : 'status-inactive';
            html += `
                <div class="mobile-data-card">
                    <div class="mobile-card-header">
                        <strong>${w.name}</strong>
                        <span class="status-badge ${statusClass}">${w.status}</span>
                    </div>
                    <div class="mobile-card-row"><span>ID:</span> #${w.id}</div>
                    <div class="mobile-card-row"><span>Phone:</span> ${w.phone || '-'}</div>
                    <div class="mobile-card-row"><span>Email:</span> ${w.email || '-'}</div>
                    <div class="mobile-card-row"><span>Position:</span> ${w.position || '-'}</div>
                    <div class="mobile-card-row"><span>Hire Date:</span> ${formatDate(w.hire_date)}</div>
                    <div class="mobile-card-row"><span>Active Jobs:</span> ${w.active_jobs || 0}</div>
                    <div class="mobile-card-actions">
                        <button class="btn btn-xs btn-outline" onclick="editWorker(${w.id})"><i class="fas fa-edit"></i> Edit</button>
                        ${currentUser?.role === 'admin' ? `<button class="btn btn-xs btn-danger" onclick="deleteWorker(${w.id})"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No workers found. Add your first worker!</p>
            </div>
        `;
    }
}

function showAddWorker() {
    const content = `
        <label for="m-name">Full Name *</label>
        <input type="text" id="m-name" data-field="name" placeholder="Worker name" required>
        <label for="m-phone">Phone</label>
        <input type="text" id="m-phone" data-field="phone" placeholder="Phone number">
        <label for="m-email">Email</label>
        <input type="email" id="m-email" data-field="email" placeholder="Email address">
        <label for="m-position">Position</label>
        <select id="m-position" data-field="position">
            <option value="Mechanic">Mechanic</option>
            <option value="Senior Mechanic">Senior Mechanic</option>
            <option value="Apprentice">Apprentice</option>
            <option value="Electrician">Electrician</option>
            <option value="Painter">Painter</option>
            <option value="Other">Other</option>
        </select>
        <label for="m-hire">Hire Date</label>
        <input type="date" id="m-hire" data-field="hire_date" value="${new Date().toISOString().split('T')[0]}">
    `;
    
    openModal('<i class="fas fa-user-plus"></i> Add Worker', content, async (data) => {
        data.status = 'active';
        const result = await apiCall('workers.php', 'POST', data);
        if (result.success) {
            showToast('Worker added!');
            loadWorkers();
        }
    });
}

function editWorker(id) {
    const worker = workersCache.find(w => w.id === id);
    if (!worker) return;
    
    const content = `
        <label for="m-name">Full Name *</label>
        <input type="text" id="m-name" data-field="name" value="${worker.name}" required>
        <label for="m-phone">Phone</label>
        <input type="text" id="m-phone" data-field="phone" value="${worker.phone || ''}">
        <label for="m-email">Email</label>
        <input type="email" id="m-email" data-field="email" value="${worker.email || ''}">
        <label for="m-position">Position</label>
        <select id="m-position" data-field="position">
            <option value="Mechanic" ${worker.position === 'Mechanic' ? 'selected' : ''}>Mechanic</option>
            <option value="Senior Mechanic" ${worker.position === 'Senior Mechanic' ? 'selected' : ''}>Senior Mechanic</option>
            <option value="Apprentice" ${worker.position === 'Apprentice' ? 'selected' : ''}>Apprentice</option>
            <option value="Electrician" ${worker.position === 'Electrician' ? 'selected' : ''}>Electrician</option>
            <option value="Painter" ${worker.position === 'Painter' ? 'selected' : ''}>Painter</option>
            <option value="Other" ${(!worker.position || !['Mechanic','Senior Mechanic','Apprentice','Electrician','Painter'].includes(worker.position)) ? 'selected' : ''}>Other</option>
        </select>
        <label for="m-hire">Hire Date</label>
        <input type="date" id="m-hire" data-field="hire_date" value="${worker.hire_date || ''}">
        <label for="m-status">Status</label>
        <select id="m-status" data-field="status">
            <option value="active" ${worker.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${worker.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
    `;
    
    openModal('<i class="fas fa-user-edit"></i> Edit Worker', content, async (data) => {
        const res = await apiCall('workers.php', 'PUT', { ...data, id });
        if (res.success) {
            showToast('Worker updated!');
            loadWorkers();
        }
    });
}

async function deleteWorker(id) {
    if (!confirm('Delete this worker?')) return;
    
    const result = await apiCall(`workers.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Worker deleted!');
        loadWorkers();
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
