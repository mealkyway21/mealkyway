// Admin Panel JavaScript
const API_URL = window.location.origin;
let autoRefreshInterval;

// Hall data for different institutions
const hallData = {
    RU: [
        'শহীদ সৈয়দ নজরুল ইসলাম হল',
        'শহীদ জিয়াউর রহমান হল',
        'মতিহার হল',
        'শাহ মখদুম হল',
        'সৈয়দ আমীর আলী হল',
        'মাদার বক্স হল',
        'কাজী নজরুল ইসলাম হল',
        'বঙ্গমাতা হল',
        'তাপসী রাবেয়া হল',
        'বেগম রোকেয়া হল'
    ],
    RMC: [
        'শহীদ শাহ মাইনুল আহসান চৌধুরী পিংকু ছাত্রাবাস',
        'শহীদ মুক্তিযোদ্ধা কাজী নূরুন্নবী ছাত্রাবাস',
        'Intern Hostel',
        'Nursing Hostel'
    ]
};

// Short form mapping for hall names (for display in admin panel)
const hallShortForm = {
    // RU Halls
    'শহীদ সৈয়দ নজরুল ইসলাম হল': 'সনি হল',
    'শহীদ জিয়াউর রহমান হল': 'জিয়া হল',
    'মতিহার হল': 'মতিহার',
    'শাহ মখদুম হল': 'মখদুম',
    'সৈয়দ আমীর আলী হল': 'আমীর আলী',
    'মাদার বক্স হল': 'মাদার বক্স',
    'কাজী নজরুল ইসলাম হল': 'নজরুল হল',
    'বঙ্গমাতা হল': 'বঙ্গমাতা',
    'তাপসী রাবেয়া হল': 'তাপসী',
    'বেগম রোকেয়া হল': 'রোকেয়া',
    // RMC Halls
    'শহীদ শাহ মাইনুল আহসান চৌধুরী পিংকু ছাত্রাবাস': 'পিংকু হল',
    'শহীদ মুক্তিযোদ্ধা কাজী নূরুন্নবী ছাত্রাবাস': 'নূরুন্নবী হল',
    'Intern Hostel': 'Intern Hostel',
    'Nursing Hostel': 'Nursing Hostel'
};

// Function to get short form of hall name
function getHallShortForm(fullHallName) {
    // Extract just the hall name without institution prefix
    const hallOnly = fullHallName.includes(' - ') ? fullHallName.split(' - ')[1] : fullHallName;
    return hallShortForm[hallOnly] || hallOnly;
}

// Log to verify script is loading
console.log('Admin Panel JS loaded successfully');
console.log('API URL:', API_URL);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    
    try {
        // Check authentication FIRST and wait for it
        await checkAuth();

        // Only initialize if authenticated
        console.log('Authentication passed, initializing panel...');
        loadStats();
        loadOrders();

        // Set up auto-refresh every 30 seconds
        startAutoRefresh();

        // Setup institution filter
        setupInstitutionFilter();

        // Event Listeners
        const logoutBtn = document.getElementById('logoutBtn');
        const applyFiltersBtn = document.getElementById('applyFilters');
        const clearFiltersBtn = document.getElementById('clearFilters');
        const printOrdersBtn = document.getElementById('printOrders');
        const editOrderForm = document.getElementById('editOrderForm');
        const editModal = document.getElementById('editModal');
        
        console.log('Elements found:', {
            logoutBtn: !!logoutBtn,
            applyFiltersBtn: !!applyFiltersBtn,
            clearFiltersBtn: !!clearFiltersBtn,
            printOrdersBtn: !!printOrdersBtn,
            editOrderForm: !!editOrderForm,
            editModal: !!editModal
        });
        
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => {
            loadOrders();
            loadStats();
        });
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
        if (printOrdersBtn) printOrdersBtn.addEventListener('click', printOrders);
        if (editOrderForm) editOrderForm.addEventListener('submit', saveOrder);

        // Close modal listeners
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // Close modal on outside click
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target.id === 'editModal') {
                    closeModal();
                }
            });
        }
        
        console.log('All event listeners attached successfully');
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
    }
});

// Auto-refresh functionality
function startAutoRefresh() {
    // Refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        loadStats();
        loadOrders();
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// Check authentication
async function checkAuth() {
    try {
        // Check for auth token in localStorage
        const authToken = localStorage.getItem('adminAuthToken');
        
        console.log('=== AUTH CHECK ===');
        console.log('Token exists:', !!authToken);
        console.log('Token length:', authToken ? authToken.length : 0);
        
        if (!authToken) {
            console.log('No auth token found, redirecting to login');
            window.location.href = '/admin-login.html';
            return;
        }

        console.log('Sending auth check request...');
        const response = await fetch(`${API_URL}/api/admin/check`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Auth check response status:', response.status);
        
        if (!response.ok) {
            console.log('❌ Auth check failed with status:', response.status);
            localStorage.removeItem('adminAuthToken');
            window.location.href = '/admin-login.html';
            return;
        }
        
        const data = await response.json();
        console.log('Auth check response data:', data);

        if (!data.authenticated) {
            console.log('❌ Not authenticated, redirecting to login');
            localStorage.removeItem('adminAuthToken');
            window.location.href = '/admin-login.html';
            return;
        }
        
        console.log('✅ Authenticated as:', data.user.username);
        const usernameElement = document.getElementById('adminUsername');
        if (usernameElement) {
            usernameElement.textContent = `👤 ${data.user.username}`;
        }
        
        // Return success
        return true;
    } catch (error) {
        console.error('❌ Auth check error:', error);
        localStorage.removeItem('adminAuthToken');
        window.location.href = '/admin-login.html';
        throw error;
    }
}

// Logout
async function logout() {
    console.log('Logout clicked');
    try {
        const authToken = localStorage.getItem('adminAuthToken');
        const response = await fetch(`${API_URL}/api/admin/logout`, { 
            method: 'POST',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('Logout response:', response.status);
        localStorage.removeItem('adminAuthToken');
        window.location.href = '/admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('adminAuthToken');
        window.location.href = '/admin-login.html';
    }
}

// Load statistics
async function loadStats() {
    console.log('loadStats called');
    try {
        const authToken = localStorage.getItem('adminAuthToken');
        const response = await fetch(`${API_URL}/api/admin/orders`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Stats response status:', response.status);
        
        if (!response.ok) {
            console.error('Stats API error:', response.status);
            if (response.status === 401) {
                console.log('Unauthorized in loadStats, clearing token');
                localStorage.removeItem('adminAuthToken');
                window.location.href = '/admin-login.html';
            }
            return;
        }
        
        const data = await response.json();
        console.log('Stats loaded:', data);

        const stats = data.stats || {};
        const todayOrdersEl = document.getElementById('todayOrders');
        const todayQuantityEl = document.getElementById('todayQuantity');
        const totalCustomersEl = document.getElementById('totalCustomers');
        const totalOrdersEl = document.getElementById('totalOrders');
        
        if (todayOrdersEl) todayOrdersEl.textContent = stats.todayOrders || 0;
        if (todayQuantityEl) todayQuantityEl.textContent = stats.todayQuantity || 0;
        if (totalCustomersEl) totalCustomersEl.textContent = stats.totalOrders || 0; // Use totalOrders for customers count
        if (totalOrdersEl) totalOrdersEl.textContent = stats.totalQuantity || 0;
        
        console.log('Stats updated in DOM');
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Setup institution filter
function setupInstitutionFilter() {
    const institutionFilter = document.getElementById('filterInstitution');
    const hallFilter = document.getElementById('filterHall');
    
    if (institutionFilter && hallFilter) {
        institutionFilter.addEventListener('change', () => {
            const institution = institutionFilter.value;
            hallFilter.innerHTML = '<option value="">All Halls</option>';
            
            if (institution && hallData[institution]) {
                hallData[institution].forEach(hall => {
                    const option = document.createElement('option');
                    option.value = hall;
                    option.textContent = hall;
                    hallFilter.appendChild(option);
                });
            }
        });
    }
}

// Load orders with filters
async function loadOrders() {
    const institution = document.getElementById('filterInstitution').value;
    const hall = document.getElementById('filterHall').value;
    const contactNumber = document.getElementById('filterContact').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    const params = new URLSearchParams();
    if (institution) params.append('institution', institution);
    if (hall) params.append('hall', hall);
    if (contactNumber) params.append('contactNumber', contactNumber);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    // Show loading state
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = `
        <tr class="no-data">
            <td colspan="9">
                <div style="padding: 40px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 15px; animation: pulse 1.5s infinite;">⏳</div>
                    <div style="font-size: 16px; color: var(--text-gray); font-weight: 600;">Loading orders...</div>
                </div>
            </td>
        </tr>
    `;

    try {
        const authToken = localStorage.getItem('adminAuthToken');
        const response = await fetch(`${API_URL}/api/admin/orders?${params.toString()}`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Orders response status:', response.status);
        
        if (!response.ok) {
            console.error('Orders API error:', response.status, response.statusText);
            if (response.status === 401) {
                window.location.href = '/admin-login.html';
                return;
            }
        }
        
        const data = await response.json();
        console.log('Orders data received:', data);

        displayOrders(data.orders || []);
    } catch (error) {
        console.error('Error loading orders:', error);
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="9">
                    <div style="padding: 40px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                        <div style="font-size: 18px; color: var(--error-red); font-weight: 600;">Error loading orders</div>
                        <div style="font-size: 14px; color: var(--text-gray); margin-top: 8px;">Please check your connection and try again</div>
                        <div style="font-size: 12px; color: var(--text-gray); margin-top: 8px;">${error.message}</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Display orders in table
function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const ordersCount = document.getElementById('ordersCount');
    const lastUpdated = document.getElementById('lastUpdated');

    ordersCount.textContent = orders.length;
    
    // Update last updated time
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdated.innerHTML = `
        <span>🔄</span>
        <span>Last updated: ${timeString}</span>
    `;

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="9">
                    <div style="padding: 40px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 15px;">📦</div>
                        <div style="font-size: 18px; color: var(--text-gray); font-weight: 600;">No orders found</div>
                        <div style="font-size: 14px; color: var(--text-gray); margin-top: 8px;">Orders will appear here once customers place them</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map((order, index) => `
        <tr style="animation: fadeInUp 0.3s ease-out ${index * 0.05}s backwards;">
            <td><span style="background: var(--light-blue); padding: 4px 12px; border-radius: 12px; font-weight: 600;">#${order.id}</span></td>
            <td><strong>${formatDate(order.date)}</strong></td>
            <td><span style="color: var(--primary-blue); font-weight: 600;">${order.name}</span></td>
            <td>${order.contact_number}</td>
            <td>${getHallShortForm(order.hall)}</td>
            <td><span style="background: var(--bright-yellow); padding: 4px 12px; border-radius: 8px; font-weight: 600;">${order.room}</span></td>
            <td><strong style="color: var(--primary-blue); font-size: 16px;">${order.quantity}</strong></td>
            <td><strong style="color: var(--success-green); font-size: 16px;">৳${order.quantity * 30}</strong></td>
            <td class="no-print">
                <div class="action-btns">
                    <button class="btn-edit" onclick="editOrder(${order.id})">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteOrder(${order.id})">🗑️ Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Clear filters
function clearFilters() {
    document.getElementById('filterInstitution').value = '';
    document.getElementById('filterHall').innerHTML = '<option value="">All Halls</option>';
    document.getElementById('filterHall').value = '';
    document.getElementById('filterContact').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    loadOrders();
}

// Print orders
function printOrders() {
    window.print();
}

// Edit order
async function editOrder(orderId) {
    try {
        const authToken = localStorage.getItem('adminAuthToken');
        const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();

        if (data.order) {
            const order = data.order;
            document.getElementById('editOrderId').value = order.id;
            document.getElementById('editCustomerName').value = order.name;
            document.getElementById('editContactNumber').value = order.contact_number;
            document.getElementById('editHall').value = order.hall;
            document.getElementById('editRoom').value = order.room;
            document.getElementById('editQuantity').value = order.quantity;
            document.getElementById('editDate').value = order.date;

            openModal();
        }
    } catch (error) {
        console.error('Error loading order:', error);
        alert('Failed to load order details');
    }
}

// Save order
async function saveOrder(e) {
    e.preventDefault();

    const orderId = document.getElementById('editOrderId').value;
    const quantity = document.getElementById('editQuantity').value;
    const date = document.getElementById('editDate').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Saving...';

    try {
        const authToken = localStorage.getItem('adminAuthToken');
        const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ quantity: parseInt(quantity), date })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('✅ Order updated successfully', 'success');
            closeModal();
            loadOrders();
            loadStats();
        } else {
            showToast('❌ ' + (data.error || 'Failed to update order'), 'error');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('❌ Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

// Delete order
async function deleteOrder(orderId) {
    if (!confirm('⚠️ Are you sure you want to delete this order?\n\nThis action cannot be undone.')) {
        return;
    }

    try {
        const authToken = localStorage.getItem('adminAuthToken');
        const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('✅ Order deleted successfully', 'success');
            loadOrders();
            loadStats();
        } else {
            showToast('❌ ' + (data.error || 'Failed to delete order'), 'error');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('❌ Network error. Please try again.', 'error');
    }
}

// Toast notification
function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal functions
function openModal() {
    document.getElementById('editModal').classList.add('active');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}
