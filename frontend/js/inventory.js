// ===== Inventory Management Functions =====
let inventoryPage = 0;
const INVENTORY_PER_PAGE = 20;
let allInventory = [];
let showLowStockOnly = false;

async function loadInventory(lowStockOnly = false) {
    const container = document.getElementById('inventoryContainer');
    const search = document.getElementById('inventorySearch')?.value || '';
    const categoryId = document.getElementById('inventoryCategoryFilter')?.value;
    
    showLowStockOnly = lowStockOnly;
    inventoryPage = 0;
    
    let endpoint = 'inventory.php?';
    if (categoryId) endpoint += `category_id=${categoryId}&`;
    if (lowStockOnly) endpoint += `low_stock=1&`;
    
    const [invResult, catResult] = await Promise.all([
        apiCall(endpoint),
        apiCall('inventory_categories.php')
    ]);
    
    if (catResult.success) {
        categoriesCache = catResult.data;
        const catSelect = document.getElementById('inventoryCategoryFilter');
        if (catSelect && catSelect.options.length <= 1) {
            catResult.data.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                catSelect.appendChild(option);
            });
        }
    }
    
    if (invResult.success) {
        allInventory = search 
            ? invResult.data.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
            : invResult.data;
        
        updateInventoryStats(allInventory);
        
        const endIdx = INVENTORY_PER_PAGE;
        const paginated = allInventory.slice(0, endIdx);
        
        renderInventory(paginated, container, endIdx >= allInventory.length);
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>${lowStockOnly ? 'No low stock items!' : 'No inventory items found.'}</p>
            </div>
        `;
    }
}

function renderInventory(items, container, isLastPage) {
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>${showLowStockOnly ? 'No low stock items!' : 'No inventory items found.'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Desktop table
    html += '<div class="table-wrap desktop-only"><table><thead><tr>';
    html += '<th>Item</th><th>Category</th><th>Qty</th><th>Unit</th><th>Location</th><th>Min</th><th>Status</th><th>Price</th><th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    items.forEach(item => {
        const stockStatus = getStockStatus(item.quantity, item.min_quantity);
        html += `<tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.category_name || 'Uncategorized'}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
            <td>${item.location || '-'}</td>
            <td>${item.min_quantity}</td>
            <td><span class="stock-indicator ${stockStatus.class}">${stockStatus.label}</span></td>
            <td>${formatKSh(item.price)}</td>
            <td>
                <i class="fas fa-plus action-icon" onclick="quickAddStock(${item.id})" title="Add"></i>
                <i class="fas fa-minus action-icon" onclick="quickRemoveStock(${item.id})" title="Remove"></i>
                <i class="fas fa-edit action-icon" onclick="editInventory(${item.id})" title="Edit"></i>
                ${currentUser?.role === 'admin' ? `<i class="fas fa-trash action-icon delete" onclick="deleteInventory(${item.id})" title="Delete"></i>` : ''}
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    
    // Mobile cards
    html += '<div class="mobile-cards mobile-only">';
    items.forEach(item => {
        const stockStatus = getStockStatus(item.quantity, item.min_quantity);
        html += `
            <div class="mobile-data-card">
                <div class="mobile-card-header">
                    <strong>${item.name}</strong>
                    <span class="stock-indicator ${stockStatus.class}">${stockStatus.label}</span>
                </div>
                <div class="mobile-card-row"><span>Category:</span> ${item.category_name || 'Uncategorized'}</div>
                <div class="mobile-card-row"><span>Quantity:</span> ${item.quantity} ${item.unit}</div>
                <div class="mobile-card-row"><span>Location:</span> ${item.location || '-'}</div>
                <div class="mobile-card-row"><span>Min Qty:</span> ${item.min_quantity}</div>
                <div class="mobile-card-row"><span>Price:</span> ${formatKSh(item.price)}</div>
                <div class="mobile-card-actions">
                    <button class="btn btn-xs btn-outline" onclick="quickAddStock(${item.id})"><i class="fas fa-plus"></i> Add</button>
                    <button class="btn btn-xs btn-outline" onclick="quickRemoveStock(${item.id})"><i class="fas fa-minus"></i></button>
                    <button class="btn btn-xs btn-outline" onclick="editInventory(${item.id})"><i class="fas fa-edit"></i></button>
                    ${currentUser?.role === 'admin' ? `<button class="btn btn-xs btn-danger" onclick="deleteInventory(${item.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    // Load more
    if (!isLastPage) {
        const remaining = allInventory.length - items.length;
        html += `
            <div class="load-more-container">
                <button class="btn btn-outline btn-sm" onclick="loadMoreInventory()">
                    <i class="fas fa-chevron-down"></i> Load More (${remaining} remaining)
                </button>
            </div>
        `;
    } else if (allInventory.length > INVENTORY_PER_PAGE) {
        html += `<div class="load-more-container"><span style="color:#6b7b8c;font-size:0.85rem;">Showing all ${allInventory.length} items</span></div>`;
    }
    
    container.innerHTML = html;
}

function loadMoreInventory() {
    inventoryPage++;
    const container = document.getElementById('inventoryContainer');
    const startIdx = 0;
    const endIdx = (inventoryPage + 1) * INVENTORY_PER_PAGE;
    const paginated = allInventory.slice(startIdx, endIdx);
    
    renderInventory(paginated, container, endIdx >= allInventory.length);
}

function getStockStatus(qty, min) {
    if (qty <= 0) return { class: 'critical', label: 'Out of Stock' };
    if (qty <= min) return { class: 'low-stock', label: 'Low Stock' };
    return { class: 'in-stock', label: 'In Stock' };
}

function updateInventoryStats(items) {
    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity <= i.min_quantity).length;
    const categories = new Set(items.map(i => i.category_id)).size;
    const totalValue = items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
    
    document.getElementById('invTotalItems').textContent = totalItems;
    document.getElementById('invLowStock').textContent = lowStock;
    document.getElementById('invCategories').textContent = categories;
    document.getElementById('invValue').textContent = formatKSh(totalValue);
}

function showAddInventory() {
    const categoryOptions = categoriesCache.map(c => 
        `<option value="${c.id}">${c.name}</option>`
    ).join('');
    
    const content = `
        <label for="m-name">Item Name *</label>
        <input type="text" id="m-name" data-field="name" placeholder="Item name" required>
        <label for="m-category">Category</label>
        <select id="m-category" data-field="category_id">
            <option value="">Select category...</option>
            ${categoryOptions}
        </select>
        <label for="m-qty">Quantity *</label>
        <input type="number" id="m-qty" data-field="quantity" placeholder="0" min="0" required>
        <label for="m-unit">Unit</label>
        <select id="m-unit" data-field="unit">
            <option value="pieces">Pieces</option>
            <option value="liters">Liters</option>
            <option value="sets">Sets</option>
            <option value="meters">Meters</option>
            <option value="kg">Kilograms</option>
            <option value="boxes">Boxes</option>
        </select>
        <label for="m-location">Location</label>
        <input type="text" id="m-location" data-field="location" placeholder="Shelf A1, Rack B2...">
        <label for="m-min">Min Quantity (Alert Level)</label>
        <input type="number" id="m-min" data-field="min_quantity" value="5" min="0">
        <label for="m-supplier">Supplier</label>
        <input type="text" id="m-supplier" data-field="supplier" placeholder="Supplier name">
        <label for="m-price">Unit Price</label>
        <input type="number" id="m-price" data-field="price" placeholder="0.00" step="0.01" min="0">
    `;
    
    openModal('<i class="fas fa-plus-circle"></i> Add Inventory Item', content, async (data) => {
        const result = await apiCall('inventory.php', 'POST', data);
        if (result.success) {
            showToast('Item added!');
            loadInventory();
            loadDashboardStats();
        }
    });
}

function editInventory(id) {
    const item = allInventory.find(i => i.id === id) || inventoryCache.find(i => i.id === id);
    if (!item) return;
    
    const categoryOptions = categoriesCache.map(c => 
        `<option value="${c.id}" ${item.category_id === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');
    
    const content = `
        <label for="m-name">Item Name *</label>
        <input type="text" id="m-name" data-field="name" value="${item.name}" required>
        <label for="m-category">Category</label>
        <select id="m-category" data-field="category_id">
            <option value="">Select category...</option>
            ${categoryOptions}
        </select>
        <label for="m-qty">Quantity *</label>
        <input type="number" id="m-qty" data-field="quantity" value="${item.quantity}" min="0" required>
        <label for="m-unit">Unit</label>
        <select id="m-unit" data-field="unit">
            <option value="pieces" ${item.unit === 'pieces' ? 'selected' : ''}>Pieces</option>
            <option value="liters" ${item.unit === 'liters' ? 'selected' : ''}>Liters</option>
            <option value="sets" ${item.unit === 'sets' ? 'selected' : ''}>Sets</option>
            <option value="meters" ${item.unit === 'meters' ? 'selected' : ''}>Meters</option>
            <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>Kilograms</option>
            <option value="boxes" ${item.unit === 'boxes' ? 'selected' : ''}>Boxes</option>
        </select>
        <label for="m-location">Location</label>
        <input type="text" id="m-location" data-field="location" value="${item.location || ''}">
        <label for="m-min">Min Quantity</label>
        <input type="number" id="m-min" data-field="min_quantity" value="${item.min_quantity}" min="0">
        <label for="m-supplier">Supplier</label>
        <input type="text" id="m-supplier" data-field="supplier" value="${item.supplier || ''}">
        <label for="m-price">Unit Price</label>
        <input type="number" id="m-price" data-field="price" value="${item.price || 0}" step="0.01" min="0">
    `;
    
    openModal('<i class="fas fa-edit"></i> Edit Item', content, async (data) => {
        const res = await apiCall('inventory.php', 'PUT', { ...data, id });
        if (res.success) {
            showToast('Item updated!');
            loadInventory();
        }
    });
}

async function deleteInventory(id) {
    if (!confirm('Delete this inventory item?')) return;
    
    const result = await apiCall(`inventory.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Item deleted!');
        loadInventory();
        loadDashboardStats();
    }
}

function quickAddStock(id) {
    const item = allInventory.find(i => i.id === id);
    if (!item) return;
    
    const qty = prompt(`Add stock for "${item.name}":\nCurrent: ${item.quantity} ${item.unit}`, '1');
    if (qty && !isNaN(qty) && parseInt(qty) > 0) {
        apiCall('inventory_movements.php', 'POST', {
            item_id: id,
            quantity: parseInt(qty),
            type: 'addition',
            notes: 'Quick stock addition'
        }).then(res => {
            if (res.success) {
                showToast(`Added ${qty} ${item.unit} to ${item.name}`);
                loadInventory();
            }
        });
    }
}

function quickRemoveStock(id) {
    const item = allInventory.find(i => i.id === id);
    if (!item) return;
    
    const qty = prompt(`Remove stock for "${item.name}":\nCurrent: ${item.quantity} ${item.unit}`, '1');
    if (qty && !isNaN(qty) && parseInt(qty) > 0) {
        apiCall('inventory_movements.php', 'POST', {
            item_id: id,
            quantity: parseInt(qty),
            type: 'removal',
            notes: 'Quick stock removal'
        }).then(res => {
            if (res.success) {
                showToast(`Removed ${qty} ${item.unit} from ${item.name}`);
                loadInventory();
            }
        });
    }
}

function showManageCategories() {
    let catHtml = '<div style="max-height:300px;overflow-y:auto;">';
    categoriesCache.forEach(cat => {
        catHtml += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2a3848;">
            <span>${cat.name}</span>
            <i class="fas fa-trash action-icon delete" onclick="deleteCategory(${cat.id})"></i>
        </div>`;
    });
    catHtml += '</div>';
    
    const content = `
        ${catHtml}
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2a3848;">
            <label for="m-catname">Add New Category</label>
            <input type="text" id="m-catname" data-field="name" placeholder="Category name">
            <label for="m-catdesc">Description</label>
            <input type="text" id="m-catdesc" data-field="description" placeholder="Optional description">
        </div>
    `;
    
    openModal('<i class="fas fa-tags"></i> Manage Categories', content, async (data) => {
        if (data.name) {
            const res = await apiCall('inventory_categories.php', 'POST', data);
            if (res.success) {
                showToast('Category added!');
                loadInventory();
            }
        }
    });
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? Items will be uncategorized.')) return;
    
    const result = await apiCall(`inventory_categories.php?id=${id}`, 'DELETE');
    if (result.success) {
        showToast('Category deleted!');
        loadInventory();
    }
}
