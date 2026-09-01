// ===== Transactions & Finance Functions =====
const INCOME_CATEGORIES = ['client_payment', 'other'];
const EXPENSE_CATEGORIES = ['staff_salary', 'parts', 'maintenance', 'other'];

const CATEGORY_LABELS = {
    'client_payment': 'Client Payment',
    'staff_salary': 'Staff Salary',
    'parts': 'Parts',
    'maintenance': 'Maintenance',
    'other': 'Other'
};

let transactionsPage = 1;
const TRANSACTIONS_PER_PAGE = 15;
let allTransactions = [];

async function loadTransactions(reset = false) {
    const container = document.getElementById('transactionsContainer');
    const dateFrom = document.getElementById('transDateFrom')?.value;
    const dateTo = document.getElementById('transDateTo')?.value;
    const type = document.getElementById('transTypeFilter')?.value;
    
    if (reset) {
        transactionsPage = 1;
        allTransactions = [];
    }
    
    let endpoint = 'transactions.php?';
    if (dateFrom) endpoint += `date_from=${dateFrom}&`;
    if (dateTo) endpoint += `date_to=${dateTo}&`;
    if (type) endpoint += `type=${type}&`;
    
    const result = await apiCall(endpoint);
    
    if (result.success && result.data.length > 0) {
        allTransactions = result.data;
        const endIdx = transactionsPage * TRANSACTIONS_PER_PAGE;
        const paginated = allTransactions.slice(0, endIdx);
        
        renderTransactions(paginated, container, endIdx >= allTransactions.length);
        updateFinanceSummary(allTransactions);
    } else if (reset) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No transactions found for the selected period.</p>
            </div>
        `;
        updateFinanceSummary([]);
    }
}

function renderTransactions(transactions, container, isLastPage) {
    let html = '';
    
    // Desktop table
    html += '<div class="table-wrap desktop-only"><table><thead><tr>';
    html += '<th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Ref</th><th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    transactions.forEach(t => {
        const isIncome = t.type === 'income';
        const typeColor = isIncome ? '#4ade80' : '#f87171';
        const typeIcon = isIncome ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const rowBorder = isIncome ? '#22c55e' : '#ef4444';
        
        html += `<tr style="border-left: 3px solid ${rowBorder};">
            <td>${formatDate(t.transaction_date)}</td>
            <td><span class="status-badge" style="background: ${typeColor}15; color: ${typeColor};"><i class="fas ${typeIcon}"></i> ${t.type}</span></td>
            <td>${t.category}</td>
            <td>${t.description || '-'}</td>
            <td style="color: ${typeColor}; font-weight: 700; font-size: 0.95rem;">${isIncome ? '+' : '-'}${formatKSh(parseFloat(t.amount))}</td>
            <td>${t.payment_method}</td>
            <td>${t.reference || '-'}</td>
            <td>
                <i class="fas fa-edit action-icon" onclick="editTransaction(${t.id})" title="Edit"></i>
                ${currentUser?.role === 'admin' ? `<i class="fas fa-trash action-icon delete" onclick="deleteTransaction(${t.id})" title="Delete"></i>` : ''}
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    
    // Mobile cards
    html += '<div class="mobile-cards mobile-only">';
    transactions.forEach(t => {
        const isIncome = t.type === 'income';
        const typeColor = isIncome ? '#4ade80' : '#f87171';
        html += `
            <div class="mobile-data-card" style="border-left: 3px solid ${isIncome ? '#22c55e' : '#ef4444'};">
                <div class="mobile-card-header">
                    <span style="color: ${typeColor}; font-weight: 700; font-size: 1.1rem;">${isIncome ? '+' : '-'}${formatKSh(parseFloat(t.amount))}</span>
                    <span class="status-badge" style="background: ${typeColor}15; color: ${typeColor};">${t.type}</span>
                </div>
                <div class="mobile-card-row"><span>Date:</span> ${formatDate(t.transaction_date)}</div>
                <div class="mobile-card-row"><span>Category:</span> ${t.category}</div>
                <div class="mobile-card-row"><span>Description:</span> ${t.description || '-'}</div>
                <div class="mobile-card-row"><span>Method:</span> ${t.payment_method}</div>
                ${t.reference ? `<div class="mobile-card-row"><span>Ref:</span> ${t.reference}</div>` : ''}
                <div class="mobile-card-actions">
                    <button class="btn btn-xs btn-outline" onclick="editTransaction(${t.id})"><i class="fas fa-edit"></i> Edit</button>
                    ${currentUser?.role === 'admin' ? `<button class="btn btn-xs btn-danger" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    // Load more
    if (!isLastPage && transactions.length < allTransactions.length) {
        html += `
            <div class="load-more-container">
                <button class="btn btn-outline btn-sm" onclick="loadMoreTransactions()">
                    <i class="fas fa-chevron-down"></i> Load More (${allTransactions.length - transactions.length} remaining)
                </button>
            </div>
        `;
    } else if (allTransactions.length > TRANSACTIONS_PER_PAGE) {
        html += `<div class="load-more-container"><span style="color:#6b7b8c;font-size:0.85rem;">Showing all ${allTransactions.length} transactions</span></div>`;
    }
    
    container.innerHTML = html;
}

function loadMoreTransactions() {
    transactionsPage++;
    const container = document.getElementById('transactionsContainer');
    const endIdx = transactionsPage * TRANSACTIONS_PER_PAGE;
    const paginated = allTransactions.slice(0, endIdx);
    renderTransactions(paginated, container, endIdx >= allTransactions.length);
}

function updateFinanceSummary(transactions) {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    let todayIncome = 0, todayExpense = 0, monthlyIncome = 0, monthlyExpense = 0;
    
    transactions.forEach(t => {
        const isIncome = t.type === 'income';
        const amt = parseFloat(t.amount);
        
        if (t.transaction_date === today) {
            if (isIncome) todayIncome += amt;
            else todayExpense += amt;
        }
        if (t.transaction_date >= firstOfMonth) {
            if (isIncome) monthlyIncome += amt;
            else monthlyExpense += amt;
        }
    });
    
    document.getElementById('finTodayIncome').textContent = formatKSh(todayIncome);
    document.getElementById('finTodayExpense').textContent = formatKSh(todayExpense);
    document.getElementById('finMonthlyNet').textContent = formatKSh(monthlyIncome - monthlyExpense);
    document.getElementById('finCashBalance').textContent = formatKSh(monthlyIncome - monthlyExpense);
}

function showAddTransaction() {
    const content = `
        <label for="m-type">Transaction Type *</label>
        <select id="m-type" data-field="type" onchange="updateCategories()">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
        </select>
        <label for="m-category">Category *</label>
        <select id="m-category" data-field="category"></select>
        <label for="m-desc">Description</label>
        <input type="text" id="m-desc" data-field="description" placeholder="Brief description">
        <label for="m-amount">Amount *</label>
        <input type="number" id="m-amount" data-field="amount" placeholder="0.00" step="0.01" min="0" required>
        <label for="m-method">Payment Method</label>
        <select id="m-method" data-field="payment_method">
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
        </select>
        <label for="m-reference">Reference / Invoice #</label>
        <input type="text" id="m-reference" data-field="reference" placeholder="INV-001">
        <label for="m-date">Date *</label>
        <input type="date" id="m-date" data-field="transaction_date" value="${new Date().toISOString().split('T')[0]}" required>
        <label for="m-notes">Notes</label>
        <textarea id="m-notes" data-field="notes" rows="2" placeholder="Additional notes..."></textarea>
    `;
    
    openModal('<i class="fas fa-plus-circle"></i> Add Transaction', content, async (data) => {
        const result = await apiCall('transactions.php', 'POST', data);
        if (result.success) {
            showToast('Transaction added!');
            loadTransactions(true);
            loadDashboardStats();
        }
    });
    
    setTimeout(updateCategories, 100);
}

function updateCategories() {
    const type = document.getElementById('m-type')?.value;
    const categorySelect = document.getElementById('m-category');
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    
    if (categorySelect) {
        categorySelect.innerHTML = categories.map(c => 
            `<option value="${c}">${CATEGORY_LABELS[c] || c}</option>`
        ).join('');
    }
}

async function editTransaction(id) {
    const result = await apiCall('transactions.php');
    if (!result.success) return;
    
    const trans = result.data.find(t => t.id === id);
    if (!trans) return;
    
    const categories = trans.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    
    const content = `
        <label for="m-type">Transaction Type *</label>
        <select id="m-type" data-field="type" onchange="updateEditCategories()">
            <option value="income" ${trans.type === 'income' ? 'selected' : ''}>Income</option>
            <option value="expense" ${trans.type === 'expense' ? 'selected' : ''}>Expense</option>
        </select>
        <label for="m-category">Category *</label>
        <select id="m-category" data-field="category">
            ${categories.map(c => `<option value="${c}" ${trans.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label for="m-desc">Description</label>
        <input type="text" id="m-desc" data-field="description" value="${trans.description || ''}">
        <label for="m-amount">Amount *</label>
        <input type="number" id="m-amount" data-field="amount" value="${trans.amount}" step="0.01" min="0" required>
        <label for="m-method">Payment Method</label>
        <select id="m-method" data-field="payment_method">
            <option value="cash" ${trans.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
            <option value="bank" ${trans.payment_method === 'bank' ? 'selected' : ''}>Bank</option>
        </select>
        <label for="m-reference">Reference / Invoice #</label>
        <input type="text" id="m-reference" data-field="reference" value="${trans.reference || ''}">
        <label for="m-date">Date *</label>
        <input type="date" id="m-date" data-field="transaction_date" value="${trans.transaction_date}" required>
        <label for="m-notes">Notes</label>
        <textarea id="m-notes" data-field="notes" rows="2">${trans.notes || ''}</textarea>
    `;
    
    openModal('<i class="fas fa-edit"></i> Edit Transaction', content, async (data) => {
        const res = await apiCall('transactions.php', 'PUT', { ...data, id });
        if (res.success) {
            showToast('Transaction updated!');
            loadTransactions(true);
        }
    });
}

function updateEditCategories() {
    const type = document.getElementById('m-type')?.value;
    const categorySelect = document.getElementById('m-category');
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    
    if (categorySelect) {
        categorySelect.innerHTML = categories.map(c => 
            `<option value="${c}">${CATEGORY_LABELS[c] || c}</option>`
        ).join('');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    
    const result = await apiCall(`transactions.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Transaction deleted!');
        loadTransactions(true);
        loadDashboardStats();
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
