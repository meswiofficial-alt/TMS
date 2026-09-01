// frontend/js/whatsapp.js
// WhatsApp Communication System - Frontend Integration

class WhatsAppAdmin {
    constructor() {
        this.apiBase = '/backend/api/whatsapp.php';
        this.initialized = false;
    }
    
    /**
     * Initialize WhatsApp dashboard
     */
    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        // Load dashboard stats if container exists
        const dashboard = document.getElementById('whatsappDashboard');
        if (dashboard) {
            this.loadDashboardStats();
        }
        
        // Setup event listeners for opt-in toggles
        document.querySelectorAll('.wa-opt-in-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.setOptIn(e.target.dataset.clientId, e.target.checked);
            });
        });
    }
    
    /**
     * Queue a WhatsApp message
     */
    async queueMessage(clientId, templateName, variables = {}, scheduledAt = null) {
        const payload = {
            action: 'queue_message',
            client_id: clientId,
            template_name: templateName,
            variables: variables
        };
        
        if (scheduledAt) {
            payload.scheduled_at = scheduledAt;
        }
        
        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send job status notification
     */
    async sendJobNotification(jobId, status) {
        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'job_status_notification',
                    job_id: jobId,
                    status: status
                })
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Set WhatsApp opt-in preference
     */
    async setOptIn(clientId, optIn, phoneNumber = null) {
        const payload = {
            action: 'set_opt_in',
            client_id: clientId,
            opt_in: optIn
        };
        
        if (phoneNumber) {
            payload.phone_number = phoneNumber;
        }
        
        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        const container = document.getElementById('whatsappDashboard');
        if (!container) return;
        
        try {
            const response = await fetch(`${this.apiBase}?action=status`);
            const result = await response.json();
            
            if (result.success) {
                this.renderDashboard(result.data);
                // Also load recent messages
                this.loadRecentMessages();
            } else {
                container.innerHTML = `
                    <div class="wa-empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load stats: ${result.error || 'Unknown error'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load WhatsApp stats:', error);
            if (container) {
                container.innerHTML = `
                    <div class="wa-empty-state">
                        <i class="fas fa-whatsapp"></i>
                        <p>WhatsApp service connecting...</p>
                        <small>Please ensure the API is configured</small>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Load recent messages for the chronological log
     */
    async loadRecentMessages() {
        try {
            const response = await fetch(`${this.apiBase}?action=message_log&limit=50`);
            const result = await response.json();
            
            if (result.success) {
                this.renderMessageLog(result.data);
            }
        } catch (error) {
            console.error('Failed to load message log:', error);
        }
    }
    
    /**
     * Render message log below stats
     */
    renderMessageLog(messages) {
        const container = document.getElementById('whatsappDashboard');
        if (!container) return;
        
        const logContainer = document.createElement('div');
        logContainer.id = 'waMessageLog';
        logContainer.className = 'wa-message-log-container';
        
        const messagesHtml = messages && messages.length > 0 
            ? messages.map(msg => {
                const date = new Date(msg.created_at).toLocaleString('en-KE', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const statusIcon = this.getStatusIcon(msg.status);
                const statusClass = `wa-status-${msg.status}`;
                
                return `
                    <div class="wa-message-item">
                        <div class="wa-message-icon ${statusClass}">
                            <i class="${statusIcon}"></i>
                        </div>
                        <div class="wa-message-content">
                            <div class="wa-message-header">
                                <span class="wa-message-phone">${msg.phone}</span>
                                <span class="wa-message-time">${date}</span>
                            </div>
                            <div class="wa-message-type">${msg.message_type}</div>
                            <div class="wa-message-status ${statusClass}">${msg.status}</div>
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="wa-empty-state"><i class="fas fa-inbox"></i><p>No messages sent yet</p></div>';
        
        logContainer.innerHTML = `
            <div class="wa-log-header">
                <h4><i class="fas fa-list-alt"></i> Message Log</h4>
                <button class="wa-btn wa-btn-sm" onclick="whatsappAdmin.loadRecentMessages()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
            <div class="wa-message-list">${messagesHtml}</div>
        `;
        
        // Replace existing log or append
        const existingLog = document.getElementById('waMessageLog');
        if (existingLog) {
            existingLog.remove();
        }
        container.appendChild(logContainer);
    }
    
    /**
     * Get status icon based on message status
     */
    getStatusIcon(status) {
        const icons = {
            'pending': 'fas fa-clock',
            'queued': 'fas fa-hourglass-half',
            'sent': 'fas fa-paper-plane',
            'delivered': 'fas fa-check',
            'read': 'fas fa-check-double',
            'failed': 'fas fa-exclamation-triangle'
        };
        return icons[status] || 'fas fa-question';
    }
    
    /**
     * Render dashboard statistics
     */
    renderDashboard(data) {
        const container = document.getElementById('whatsappDashboard');
        if (!container) return;
        
        const today = data.today || {};
        const optIn = data.opt_in || {};
        
        // Only render stats row, not the chart
        container.innerHTML = `
            <div class="wa-dashboard">
                <div class="wa-stats-row">
                    <div class="wa-stat-card">
                        <div class="wa-stat-icon"><i class="fas fa-paper-plane"></i></div>
                        <div class="wa-stat-content">
                            <span class="wa-stat-value">${today.sent || 0}</span>
                            <span class="wa-stat-label">Sent Today</span>
                        </div>
                    </div>
                    <div class="wa-stat-card">
                        <div class="wa-stat-icon"><i class="fas fa-check-double"></i></div>
                        <div class="wa-stat-content">
                            <span class="wa-stat-value">${today.read_count || 0}</span>
                            <span class="wa-stat-label">Read Today</span>
                        </div>
                    </div>
                    <div class="wa-stat-card">
                        <div class="wa-stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="wa-stat-content">
                            <span class="wa-stat-value">${today.pending || 0}</span>
                            <span class="wa-stat-label">Pending</span>
                        </div>
                    </div>
                    <div class="wa-stat-card">
                        <div class="wa-stat-icon"><i class="fas fa-users"></i></div>
                        <div class="wa-stat-content">
                            <span class="wa-stat-value">${optIn.opted_in || 0}</span>
                            <span class="wa-stat-label">Opted In</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Show message history modal for a client
     */
    async showClientHistory(clientId, clientName) {
        try {
            const response = await fetch(`${this.apiBase}?action=history&client_id=${clientId}`);
            const result = await response.json();
            
            if (!result.success) {
                showToast('Failed to load message history', true);
                return;
            }
            
            const messages = result.data.map(msg => {
                const statusClass = this.getStatusClass(msg.status);
                const date = new Date(msg.created_at).toLocaleString();
                
                return `
                    <tr>
                        <td>${date}</td>
                        <td><span class="wa-badge wa-badge-${msg.message_type}">${msg.message_type}</span></td>
                        <td><span class="wa-status ${statusClass}">${msg.status}</span></td>
                        <td>${msg.scheduled_at ? new Date(msg.scheduled_at).toLocaleString() : '-'}</td>
                    </tr>
                `;
            }).join('');
            
            const content = `
                <div class="wa-history-container">
                    <table class="wa-history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Scheduled</th>
                            </tr>
                        </thead>
                        <tbody>${messages || '<tr><td colspan="4" class="text-center">No messages found</td></tr>'}</tbody>
                    </table>
                </div>
            `;
            
            if (typeof openModal === 'function') {
                openModal(`<i class="fab fa-whatsapp"></i> WhatsApp History - ${clientName}`, content);
            }
            
        } catch (error) {
            showToast('Failed to load message history', true);
        }
    }
    
    /**
     * Get CSS class for message status
     */
    getStatusClass(status) {
        const classes = {
            'pending': 'wa-status-pending',
            'queued': 'wa-status-queued',
            'sent': 'wa-status-sent',
            'delivered': 'wa-status-delivered',
            'read': 'wa-status-read',
            'failed': 'wa-status-failed'
        };
        return classes[status] || 'wa-status-default';
    }
    
    /**
     * Open compose message modal
     */
    openComposeModal(clientId = null) {
        const content = `
            <div class="wa-compose-form">
                <div class="form-group">
                    <label>Client</label>
                    <select id="waComposeClient" class="form-control">
                        <option value="">Loading clients...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Template</label>
                    <select id="waComposeTemplate" class="form-control">
                        <option value="">Custom Message</option>
                        <option value="job_received">Job Received</option>
                        <option value="job_in_progress">Job In Progress</option>
                        <option value="job_completed">Job Completed</option>
                        <option value="vehicle_ready">Vehicle Ready</option>
                        <option value="appointment_reminder">Appointment Reminder</option>
                        <option value="service_followup">Service Follow-up</option>
                        <option value="payment_reminder">Payment Reminder</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Schedule (optional)</label>
                    <input type="datetime-local" id="waComposeSchedule" class="form-control">
                </div>
                <div class="form-group">
                    <label>Custom Message (if no template)</label>
                    <textarea id="waComposeMessage" class="form-control" rows="4" placeholder="Enter custom message..."></textarea>
                </div>
            </div>
        `;
        
        // Check if we're using the admin panel's openModal (supports content + callback)
        if (typeof openModal === 'function' && openModal.length >= 2) {
            openModal('<i class="fab fa-whatsapp"></i> Compose Message', content, async () => {
                await this.handleComposeSubmit();
            });
        } else {
            // Fallback for operator panel - use dynamic modal
            this.openDynamicModal('<i class="fab fa-whatsapp"></i> Compose Message', content, async () => {
                await this.handleComposeSubmit();
            });
        }
        
        // Load clients after modal opens
        setTimeout(() => this.loadClientsForCompose(), 100);
    }
    
    /**
     * Handle compose form submission
     */
    async handleComposeSubmit() {
        const clientSelect = document.getElementById('waComposeClient');
        const clientId = clientSelect.value;
        const template = document.getElementById('waComposeTemplate').value;
        const schedule = document.getElementById('waComposeSchedule').value;
        const customMessage = document.getElementById('waComposeMessage').value;
        
        if (!clientId) {
            showToast('Please select a client', true);
            return;
        }
        
        let result;
        if (template) {
            result = await this.queueMessage(parseInt(clientId), template, {}, schedule || null);
        } else if (customMessage) {
            result = { success: false, error: 'Custom messages require template setup' };
        } else {
            showToast('Please select a template or enter a message', true);
            return;
        }
        
        if (result.success) {
            showToast('Message queued successfully!');
            if (typeof closeModal === 'function') closeModal();
            if (typeof closeDynamicModal === 'function') closeDynamicModal();
        } else {
            showToast('Failed: ' + result.error, true);
        }
    }
    
    /**
     * Open dynamic modal (for operator panel compatibility)
     */
    openDynamicModal(title, content, onConfirm) {
        let modal = document.getElementById('waDynamicModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'waDynamicModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="waDynamicModalTitle"></h2>
                        <span class="modal-close" onclick="closeWaDynamicModal()">&times;</span>
                    </div>
                    <div id="waDynamicModalBody"></div>
                    <div class="modal-footer" id="waDynamicModalFooter">
                        <button class="btn btn-outline" onclick="closeWaDynamicModal()">Cancel</button>
                        <button class="btn btn-primary" id="waDynamicModalConfirm">Send Message</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeWaDynamicModal();
            });
        }
        
        document.getElementById('waDynamicModalTitle').innerHTML = title;
        document.getElementById('waDynamicModalBody').innerHTML = content;
        
        const confirmBtn = document.getElementById('waDynamicModalConfirm');
        confirmBtn.onclick = async () => {
            if (onConfirm) await onConfirm();
        };
        
        modal.classList.add('show');
    }
    
    /**
     * Get client options for select dropdown
     */
    getClientOptions(selectedId = null) {
        return selectedId ? `<option value="${selectedId}" selected>Loading...</option>` : '';
    }
    
    /**
     * Load clients for compose modal
     */
    async loadClientsForCompose() {
        try {
            const response = await fetch('/backend/api/clients.php');
            const result = await response.json();
            
            if (result.success) {
                const select = document.getElementById('waComposeClient');
                if (select) {
                    select.innerHTML = '<option value="">Select Client</option>' +
                        result.data.map(c => `<option value="${c.id}">${c.name} (${c.phone || 'No phone'})</option>`).join('');
                }
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    }
}

// Initialize WhatsApp Admin
let whatsappAdmin;
document.addEventListener('DOMContentLoaded', () => {
    whatsappAdmin = new WhatsAppAdmin();
    whatsappAdmin.init();
});

// Global function for closing dynamic modal
function closeWaDynamicModal() {
    const modal = document.getElementById('waDynamicModal');
    if (modal) modal.classList.remove('show');
}
