// ===== Invoice Generation Module =====

function openInvoiceModal(clientId = null) {
    apiCall('clients.php').then(clientsResult => {
        if (!clientsResult.success) return;
        
        const clients = clientsResult.data;
        const clientOptions = clients.map(c => `<option value="${c.id}" ${clientId == c.id ? 'selected' : ''}>${c.name}</option>`).join('');
        
        const content = `
            <div class="invoice-config">
                <label for="invoiceClient">Client *</label>
                <select id="invoiceClient" data-field="client_id" required>
                    <option value="">Select Client</option>
                    ${clientOptions}
                </select>
                
                <div id="invoiceItems">
                    <label>Items *</label>
                    <div class="invoice-item-row" style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" class="item-desc" placeholder="Description" required style="flex:2;">
                        <input type="number" class="item-qty" placeholder="Qty" value="1" min="1" step="0.01" style="flex:1;">
                        <input type="number" class="item-price" placeholder="Unit Price" step="0.01" required style="flex:1;">
                        <button type="button" class="btn btn-sm btn-danger remove-item" style="display:none;">&times;</button>
                    </div>
                </div>
                
                <button type="button" class="btn btn-sm btn-outline" id="addItemBtn"><i class="fas fa-plus"></i> Add Item</button>
                
                <label for="invoiceTaxRate">Tax Rate (%)</label>
                <input type="number" id="invoiceTaxRate" data-field="tax_rate" value="0" min="0" max="100">
                
                <label for="invoiceNotes">Notes</label>
                <textarea id="invoiceNotes" data-field="notes" rows="2"></textarea>
            </div>
        `;
        
        openModal('<i class="fas fa-file-invoice"></i> Create Invoice', content, async (data) => {
            const items = collectInvoiceItems();
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
                    
                    // Show success modal with download button
                    const successContent = `
                        <div style="text-align:center;padding:20px;">
                            <div style="font-size:48px;color:#22c55e;margin-bottom:16px;"><i class="fas fa-check-circle"></i></div>
                            <h3 style="color:#f0f4fa;margin-bottom:8px;">Invoice Created Successfully!</h3>
                            <p style="color:#9aa9bb;margin-bottom:24px;">Invoice Number: <strong style="color:#fbbf24;">${result.invoice_number}</strong></p>
                            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                                <a href="${result.download_url}" target="_blank" class="btn btn-success" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                                    <i class="fas fa-download"></i> Download Invoice
                                </a>
                                <a href="${result.download_url}" target="_blank" class="btn btn-outline" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                                    <i class="fas fa-print"></i> Print Invoice
                                </a>
                            </div>
                        </div>
                    `;
                    
                    // Open success modal with download options
                    if (typeof openModal === 'function' && openModal.length >= 2) {
                        openModal('<i class="fas fa-file-invoice"></i> Invoice Ready', successContent, null);
                    } else {
                        // Fallback for operator panel
                        showToast('Invoice created! Click to download.');
                        setTimeout(() => window.open(result.download_url, '_blank'), 1000);
                    }
                    
                    // Also generate PDF for storage
                    generateInvoicePDF(result.invoice_id);
                    
                    // Reload invoices list if function exists
                    if (typeof loadInvoices === 'function') {
                        loadInvoices();
                    }
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
            document.getElementById('addItemBtn').onclick = addInvoiceItem;
        }, 100);
    });
}

function addInvoiceItem() {
    const container = document.getElementById('invoiceItems');
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

function collectInvoiceItems() {
    const rows = document.querySelectorAll('.invoice-item-row');
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

async function generateInvoicePDF(invoiceId) {
    try {
        const response = await fetch('http://localhost/tristar-system/backend/api/invoices.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_pdf', invoice_id: invoiceId })
        });
        const result = await response.json();
        if (result.success) {
            // File is now stored, download URL is available
            console.log('Invoice stored at:', result.file_path);
        }
    } catch (error) {
        console.error('PDF generation failed:', error);
    }
}

/**
 * Open invoice history modal
 */
async function openInvoiceHistory() {
    const content = `
        <div id="invoiceHistoryContainer">
            <div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading invoices...</div>
        </div>
    `;
    
    if (typeof openModal === 'function' && openModal.length >= 2) {
        openModal('<i class="fas fa-history"></i> Invoice History', content, null);
    }
    
    setTimeout(async () => {
        const container = document.getElementById('invoiceHistoryContainer');
        try {
            const response = await fetch('http://localhost/tristar-system/backend/api/invoices.php?action=list');
            const result = await response.json();
            
            if (!result.success) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load invoices</p></div>';
                return;
            }
            
            const invoices = result.data;
            
            if (!invoices || invoices.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No invoices found</p></div>';
                return;
            }
            
            let html = `
                <div style="max-height:400px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:rgba(26,35,50,0.8);">
                                <th style="padding:12px;text-align:left;color:#9aa9bb;font-size:12px;">Invoice #</th>
                                <th style="padding:12px;text-align:left;color:#9aa9bb;font-size:12px;">Client</th>
                                <th style="padding:12px;text-align:right;color:#9aa9bb;font-size:12px;">Amount</th>
                                <th style="padding:12px;text-align:left;color:#9aa9bb;font-size:12px;">Date</th>
                                <th style="padding:12px;text-align:center;color:#9aa9bb;font-size:12px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            invoices.forEach(inv => {
                const date = new Date(inv.issue_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
                const downloadUrl = `http://localhost/tristar-system/backend/api/invoices.php?action=download&id=${inv.id}`;
                
                html += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:12px;color:#fbbf24;font-weight:600;">${inv.invoice_number}</td>
                        <td style="padding:12px;color:#f0f4fa;">${inv.client_name || 'N/A'}</td>
                        <td style="padding:12px;text-align:right;color:#22c55e;font-weight:600;">KSh ${parseFloat(inv.total_amount).toLocaleString('en-KE', {minimumFractionDigits: 2})}</td>
                        <td style="padding:12px;color:#9aa9bb;">${date}</td>
                        <td style="padding:12px;text-align:center;">
                            <a href="${downloadUrl}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none;"><i class="fas fa-download"></i></a>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading invoices:', error);
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading invoices</p></div>';
        }
    }, 100);
}
