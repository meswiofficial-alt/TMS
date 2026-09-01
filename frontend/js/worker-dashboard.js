// ===== Worker Management Dashboard =====

function openWorkerDashboard() {
    const content = `
        <div class="worker-dashboard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3><i class="fas fa-users-cog"></i> Worker Management</h3>
                <button class="btn btn-sm btn-success" onclick="addWorker()"><i class="fas fa-plus"></i> Add Worker</button>
            </div>
            <div id="workerCardsContainer"><div class="loading">Loading workers...</div></div>
        </div>
    `;
    openModal('<i class="fas fa-users-cog"></i> Worker Management Dashboard', content, null);
    setTimeout(loadWorkerCards, 100);
}

async function loadWorkerCards() {
    const container = document.getElementById('workerCardsContainer');
    try {
        const result = await apiCall('worker_dashboard.php?action=list');
        if (!result.success || result.data.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No workers found</p></div>';
            return;
        }
        
        let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:16px 0;">';
        result.data.forEach(w => {
            const initials = w.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const pct = w.total_jobs > 0 ? Math.round((w.completed_jobs / w.total_jobs) * 100) : 0;
            html += `
                <div style="background:rgba(26,35,50,0.8);border-radius:16px;padding:20px;border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);display:flex;align-items:center;justify-content:center;font-weight:bold;color:#1a2332;">${initials}</div>
                        <div><h4 style="margin:0;">${w.name}</h4><span style="font-size:12px;color:#9aa9bb;">${w.position || 'Staff'}</span></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div style="text-align:center;"><span style="font-size:18px;font-weight:700;color:#fbbf24;">${w.total_jobs || 0}</span><br><span style="font-size:10px;color:#9aa9bb;">Jobs</span></div>
                        <div style="text-align:center;"><span style="font-size:18px;font-weight:700;color:#4ade80;">${w.completed_jobs || 0}</span><br><span style="font-size:10px;color:#9aa9bb;">Done</span></div>
                        <div style="text-align:center;"><span style="font-size:18px;font-weight:700;color:#fbbf24;">${formatKSh(w.total_earnings || 0)}</span><br><span style="font-size:10px;color:#9aa9bb;">Earned</span></div>
                    </div>
                    <div style="margin-top:12px;"><div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#22c55e,#4ade80);border-radius:3px;"></div></div><span style="font-size:10px;color:#9aa9bb;">${pct}% completion</span></div>
                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button class="btn btn-sm btn-success" onclick="addWorkerPayment(${w.id})" style="flex:1;"><i class="fas fa-money-bill"></i> Pay</button>
                        <button class="btn btn-sm btn-primary" onclick="editWorker(${w.id})" style="flex:1;"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                    <div style="margin-top:8px;">
                        <button class="btn btn-sm btn-outline" onclick="viewPaymentHistory(${w.id}, '${w.name.replace(/'/g, "\\'")}')" style="width:100%;"><i class="fas fa-history"></i> Payment History</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading workers</p></div>';
    }
}

function addWorkerPayment(workerId) {
    const content = `
        <label for="paymentAmount">Amount *</label>
        <input type="number" id="paymentAmount" data-field="amount" step="0.01" min="0" required>
        <label for="paymentType">Type</label>
        <select id="paymentType" data-field="payment_type">
            <option value="salary">Salary</option>
            <option value="bonus">Bonus</option>
            <option value="overtime">Overtime</option>
            <option value="advance">Advance</option>
        </select>
        <label for="paymentDate">Date</label>
        <input type="date" id="paymentDate" data-field="payment_date" value="${new Date().toISOString().split('T')[0]}">
    `;
    openModal('<i class="fas fa-money-bill"></i> Add Payment', content, async (data) => {
        if (!data.amount) { showToast('Please enter amount', true); return; }
        const result = await apiCall('worker_dashboard.php', 'POST', { action: 'add_payment', worker_id: workerId, amount: parseFloat(data.amount), payment_type: data.payment_type, payment_date: data.payment_date });
        if (result.success) { showToast('Payment added!'); closeModal(); loadWorkerCards(); }
    });
}

function addWorker() {
    const content = `
        <label for="workerName">Name *</label>
        <input type="text" id="workerName" data-field="name" required>
        <label for="workerPhone">Phone</label>
        <input type="text" id="workerPhone" data-field="phone">
        <label for="workerEmail">Email</label>
        <input type="email" id="workerEmail" data-field="email">
        <label for="workerPosition">Position</label>
        <select id="workerPosition" data-field="position">
            <option value="Senior Mechanic">Senior Mechanic</option>
            <option value="Mechanic">Mechanic</option>
            <option value="Apprentice">Apprentice</option>
        </select>
    `;
    openModal('<i class="fas fa-user-plus"></i> Add Worker', content, async (data) => {
        if (!data.name) { showToast('Please enter name', true); return; }
        const result = await apiCall('workers.php', 'POST', data);
        if (result.success) { showToast('Worker added!'); closeModal(); loadWorkerCards(); }
    });
}

function editWorker(workerId) {
    apiCall('worker_dashboard.php?action=get&id=' + workerId).then(result => {
        if (!result.success) return;
        const w = result.data;
        const content = `
            <label>Name *</label>
            <input type="text" id="editWorkerName" data-field="name" value="${w.name}" required>
            <label>Phone</label>
            <input type="text" id="editWorkerPhone" data-field="phone" value="${w.phone || ''}">
            <label>Email</label>
            <input type="email" id="editWorkerEmail" data-field="email" value="${w.email || ''}">
            <label>Position</label>
            <select id="editWorkerPosition" data-field="position">
                <option value="Senior Mechanic" ${w.position === 'Senior Mechanic' ? 'selected' : ''}>Senior Mechanic</option>
                <option value="Mechanic" ${w.position === 'Mechanic' ? 'selected' : ''}>Mechanic</option>
                <option value="Apprentice" ${w.position === 'Apprentice' ? 'selected' : ''}>Apprentice</option>
            </select>
        `;
        openModal('<i class="fas fa-user-edit"></i> Edit Worker', content, async (data) => {
            data.id = workerId;
            const res = await apiCall('workers.php', 'PUT', data);
            if (res.success) { showToast('Worker updated!'); closeModal(); loadWorkerCards(); }
        });
    });
}

/**
 * View payment history for a worker
 */
async function viewPaymentHistory(workerId, workerName) {
    const content = `
        <div id="paymentHistoryContainer">
            <div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading payment history...</div>
        </div>
    `;
    openModal(`<i class="fas fa-history"></i> Payment History - ${workerName}`, content, null);
    
    // Load payment history
    setTimeout(async () => {
        const container = document.getElementById('paymentHistoryContainer');
        try {
            const result = await apiCall(`worker_dashboard.php?action=payment_history&id=${workerId}`);
            
            if (!result.success) {
                container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load payment history</p></div>`;
                return;
            }
            
            const payments = result.data;
            
            if (!payments || payments.length === 0) {
                container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No payment records found for this worker</p></div>`;
                return;
            }
            
            // Calculate totals
            const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const salaryTotal = payments.filter(p => p.payment_type === 'salary').reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const bonusTotal = payments.filter(p => p.payment_type === 'bonus').reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const overtimeTotal = payments.filter(p => p.payment_type === 'overtime').reduce((sum, p) => sum + parseFloat(p.amount), 0);
            
            let html = `
                <div style="background:rgba(26,35,50,0.6);border-radius:12px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                        <div style="text-align:center;">
                            <div style="font-size:24px;font-weight:700;color:#22c55e;">${formatKSh(totalPaid)}</div>
                            <div style="font-size:11px;color:#9aa9bb;">Total Paid</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:600;color:#3b82f6;">${formatKSh(salaryTotal)}</div>
                            <div style="font-size:11px;color:#9aa9bb;">Salary</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:600;color:#fbbf24;">${formatKSh(bonusTotal)}</div>
                            <div style="font-size:11px;color:#9aa9bb;">Bonus</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:600;color:#a855f7;">${formatKSh(overtimeTotal)}</div>
                            <div style="font-size:11px;color:#9aa9bb;">Overtime</div>
                        </div>
                    </div>
                </div>
                <div style="max-height:400px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:rgba(26,35,50,0.8);">
                                <th style="padding:12px;text-align:left;color:#9aa9bb;font-size:12px;">Date</th>
                                <th style="padding:12px;text-align:left;color:#9aa9bb;font-size:12px;">Type</th>
                                <th style="padding:12px;text-align:right;color:#9aa9bb;font-size:12px;">Amount</th>
                                <th style="padding:12px;text-align:left;color:#9aa9bb;font-size:12px;">Description</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            payments.forEach(p => {
                const date = new Date(p.payment_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
                const typeColors = {
                    'salary': '#3b82f6',
                    'bonus': '#fbbf24',
                    'overtime': '#a855f7',
                    'advance': '#ef4444',
                    'other': '#9aa9bb'
                };
                const typeColor = typeColors[p.payment_type] || '#9aa9bb';
                
                html += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:12px;color:#f0f4fa;">${date}</td>
                        <td style="padding:12px;"><span style="background:${typeColor}20;color:${typeColor};padding:2px 8px;border-radius:10px;font-size:11px;">${p.payment_type}</span></td>
                        <td style="padding:12px;text-align:right;color:#22c55e;font-weight:600;">${formatKSh(parseFloat(p.amount))}</td>
                        <td style="padding:12px;color:#9aa9bb;font-size:12px;">${p.description || '-'}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading payment history:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading payment history</p></div>`;
        }
    }, 100);
}
