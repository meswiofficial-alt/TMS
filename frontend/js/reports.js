// ===== Reporting System =====

function openReportModal() {
    const content = `
        <div class="report-config">
            <label for="reportSection">Report Section *</label>
            <select id="reportSection" data-field="section">
                <option value="all">All Sections</option>
                <option value="clients">Clients</option>
                <option value="vehicles">Vehicles</option>
                <option value="transactions">Transactions</option>
                <option value="inventory">Inventory</option>
                <option value="workers">Workers</option>
                <option value="repair_jobs">Repair Jobs</option>
            </select>
            
            <label for="reportFormat">Export Format *</label>
            <select id="reportFormat" data-field="format">
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word (.docx)</option>
            </select>
            
            <div style="display:flex;gap:12px;margin-top:12px;">
                <div style="flex:1;">
                    <label for="reportDateFrom">Date From</label>
                    <input type="date" id="reportDateFrom" data-field="date_from">
                </div>
                <div style="flex:1;">
                    <label for="reportDateTo">Date To</label>
                    <input type="date" id="reportDateTo" data-field="date_to">
                </div>
            </div>
        </div>
    `;
    
    openModal('<i class="fas fa-chart-bar"></i> Generate Report', content, async (data) => {
        if (!data.section || !data.format) {
            showToast('Please select section and format', true);
            return;
        }
        
        showLoader();
        
        try {
            const response = await fetch('/backend/api/reports.php', {
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
                closeModal();
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

// Add report and invoice buttons to header
function addHeaderButtons() {
    const headerDiv = document.querySelector('.dash-header > div:last-child');
    if (headerDiv && !document.getElementById('reportBtn')) {
        // Create buttons container
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;gap:8px;margin-right:12px;';
        
        // Report button - Uiverse style
        const reportBtn = document.createElement('button');
        reportBtn.className = 'uiverse-btn';
        reportBtn.id = 'reportBtn';
        reportBtn.innerHTML = `
            <div class="uiverse-wrapper">
                <span><i class="fas fa-chart-bar"></i> Reports</span>
                <div class="uiverse-circle uiverse-circle-12"></div>
                <div class="uiverse-circle uiverse-circle-11"></div>
                <div class="uiverse-circle uiverse-circle-10"></div>
                <div class="uiverse-circle uiverse-circle-9"></div>
                <div class="uiverse-circle uiverse-circle-8"></div>
                <div class="uiverse-circle uiverse-circle-7"></div>
                <div class="uiverse-circle uiverse-circle-6"></div>
                <div class="uiverse-circle uiverse-circle-5"></div>
                <div class="uiverse-circle uiverse-circle-4"></div>
                <div class="uiverse-circle uiverse-circle-3"></div>
                <div class="uiverse-circle uiverse-circle-2"></div>
                <div class="uiverse-circle uiverse-circle-1"></div>
            </div>
        `;
        reportBtn.onclick = openReportModal;
        
        // Invoice button - Uiverse style
        const invoiceBtn = document.createElement('button');
        invoiceBtn.className = 'uiverse-btn';
        invoiceBtn.id = 'invoiceBtn';
        invoiceBtn.innerHTML = `
            <div class="uiverse-wrapper">
                <span><i class="fas fa-file-invoice"></i> Invoice</span>
                <div class="uiverse-circle uiverse-circle-12"></div>
                <div class="uiverse-circle uiverse-circle-11"></div>
                <div class="uiverse-circle uiverse-circle-10"></div>
                <div class="uiverse-circle uiverse-circle-9"></div>
                <div class="uiverse-circle uiverse-circle-8"></div>
                <div class="uiverse-circle uiverse-circle-7"></div>
                <div class="uiverse-circle uiverse-circle-6"></div>
                <div class="uiverse-circle uiverse-circle-5"></div>
                <div class="uiverse-circle uiverse-circle-4"></div>
                <div class="uiverse-circle uiverse-circle-3"></div>
                <div class="uiverse-circle uiverse-circle-2"></div>
                <div class="uiverse-circle uiverse-circle-1"></div>
            </div>
        `;
        invoiceBtn.onclick = () => openInvoiceModal();
        
        // Invoice History button - Uiverse style
        const invoiceHistoryBtn = document.createElement('button');
        invoiceHistoryBtn.className = 'uiverse-btn';
        invoiceHistoryBtn.id = 'invoiceHistoryBtn';
        invoiceHistoryBtn.innerHTML = `
            <div class="uiverse-wrapper">
                <span><i class="fas fa-history"></i> History</span>
                <div class="uiverse-circle uiverse-circle-12"></div>
                <div class="uiverse-circle uiverse-circle-11"></div>
                <div class="uiverse-circle uiverse-circle-10"></div>
                <div class="uiverse-circle uiverse-circle-9"></div>
                <div class="uiverse-circle uiverse-circle-8"></div>
                <div class="uiverse-circle uiverse-circle-7"></div>
                <div class="uiverse-circle uiverse-circle-6"></div>
                <div class="uiverse-circle uiverse-circle-5"></div>
                <div class="uiverse-circle uiverse-circle-4"></div>
                <div class="uiverse-circle uiverse-circle-3"></div>
                <div class="uiverse-circle uiverse-circle-2"></div>
                <div class="uiverse-circle uiverse-circle-1"></div>
            </div>
        `;
        invoiceHistoryBtn.onclick = () => openInvoiceHistory();
        
        // Worker dashboard button - Uiverse style
        const workerBtn = document.createElement('button');
        workerBtn.className = 'uiverse-btn';
        workerBtn.id = 'workerBtn';
        workerBtn.innerHTML = `
            <div class="uiverse-wrapper">
                <span><i class="fas fa-users"></i> Workers</span>
                <div class="uiverse-circle uiverse-circle-12"></div>
                <div class="uiverse-circle uiverse-circle-11"></div>
                <div class="uiverse-circle uiverse-circle-10"></div>
                <div class="uiverse-circle uiverse-circle-9"></div>
                <div class="uiverse-circle uiverse-circle-8"></div>
                <div class="uiverse-circle uiverse-circle-7"></div>
                <div class="uiverse-circle uiverse-circle-6"></div>
                <div class="uiverse-circle uiverse-circle-5"></div>
                <div class="uiverse-circle uiverse-circle-4"></div>
                <div class="uiverse-circle uiverse-circle-3"></div>
                <div class="uiverse-circle uiverse-circle-2"></div>
                <div class="uiverse-circle uiverse-circle-1"></div>
            </div>
        `;
        workerBtn.onclick = () => openWorkerDashboard();
        
        btnContainer.appendChild(reportBtn);
        btnContainer.appendChild(invoiceBtn);
        btnContainer.appendChild(invoiceHistoryBtn);
        btnContainer.appendChild(workerBtn);
        
        // Insert before the badge
        const badge = headerDiv.querySelector('.badge-role');
        headerDiv.insertBefore(btnContainer, badge);
    }
}

document.addEventListener('DOMContentLoaded', addHeaderButtons);
