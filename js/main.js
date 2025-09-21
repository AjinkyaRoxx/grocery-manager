import { supabase } from './supabaseClient.js';
import { checkAuthState, handleLogin, handleSignup, handleLogout, getCurrentUser } from './auth.js';
import { initListManager, getItems, setItems, addItem, updateItem, deleteItem, toggleItemCompletion, calculateSummary, saveCurrentList, loadList, deleteList, shareList, loadSharedUsers, unshareList } from './listManager.js';
import { showNotification, showMessage, showLoading, initDateSelectors, calculateItemTotals } from './utils.js';
import { exportToPdf, exportToExcel } from './exportUtils.js';
import { generateSummary } from './summary.js';

// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    const bottomNav = document.getElementById('bottomNav');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const logoutBtn = document.getElementById('logoutBtn');
    const userEmail = document.getElementById('userEmail');
    const itemsContainer = document.getElementById('itemsContainer');
    const emptyState = document.getElementById('emptyState');
    const addItemBtn = document.getElementById('addItemBtn');
    const addFirstItemBtn = document.getElementById('addFirstItem');
    const saveItemBtn = document.getElementById('saveItem');
    const cancelItemBtn = document.getElementById('cancelItem');
    const closeModalBtn = document.getElementById('closeModal');
    const itemModal = document.getElementById('itemModal');
    const modalTitle = document.getElementById('modalTitle');
    const supermarketInput = document.getElementById('supermarket');
    const savedListsContainer = document.getElementById('savedListsContainer');
    const saveListBtn = document.getElementById('saveList');
    const clearListBtn = document.getElementById('clearList');
    const monthSelect = document.getElementById('month');
    const yearSelect = document.getElementById('year');
    const listNameInput = document.getElementById('listName');
    const summaryYearSelect = document.getElementById('summary-year');
    const savedYearSelect = document.getElementById('saved-year');
    const savedStoreSelect = document.getElementById('saved-store');
    const summaryTableBody = document.getElementById('summary-table-body');
    const storeSummaryBody = document.getElementById('store-summary-body');
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    const exportPdfBtn = document.getElementById('exportPdf');
    const exportExcelBtn = document.getElementById('exportExcel');
    const shareBtn = document.getElementById('shareBtn');
    const shareEmail = document.getElementById('shareEmail');
    const sharedWith = document.getElementById('sharedWith');
    const shareSection = document.getElementById('shareSection');
    
    // Yearly summary elements
    const yearlyTotal = document.getElementById('yearly-total');
    const yearlyLists = document.getElementById('yearly-lists');
    const yearlyStores = document.getElementById('yearly-stores');
    const yearlyItems = document.getElementById('yearly-items');
    const yearlyComparisonText = document.getElementById('yearly-comparison-text');
    
    // Form inputs
    const itemDescription = document.getElementById('itemDescription');
    const itemQuantity = document.getElementById('itemQuantity');
    const itemUom = document.getElementById('itemUom');
    const itemMrp = document.getElementById('itemMrp');
    const itemRate = document.getElementById('itemRate');
    const itemGst = document.getElementById('itemGst');
    
    // Navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // State
    let currentItemId = null;
    
    // Initialize the app
    async function init() {
        // Check if user is already logged in
        const isAuthenticated = await checkAuthState();
        if (isAuthenticated) {
            showApp();
        } else {
            showAuth();
        }
        
        // Initialize list manager
        initListManager();
        
        // Initialize date selectors
        initDateSelectors();
        
        // Don't load any items by default
        setItems([]);
        renderItems();
        updateSummary();
        updateSummaryFilters();
        updateSavedFilters();
        
        // Event listeners
        addItemBtn.addEventListener('click', () => openModal());
        addFirstItemBtn.addEventListener('click', () => openModal());
        saveItemBtn.addEventListener('click', saveItem);
        cancelItemBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        saveListBtn.addEventListener('click', saveCurrentListHandler);
        clearListBtn.addEventListener('click', clearCurrentList);
        exportPdfBtn.addEventListener('click', exportToPdfHandler);
        exportExcelBtn.addEventListener('click', exportToExcelHandler);
        loginForm.addEventListener('submit', handleLoginSubmit);
        signupForm.addEventListener('submit', handleSignupSubmit);
        logoutBtn.addEventListener('click', handleLogoutClick);
        shareBtn.addEventListener('click', shareListHandler);
        loginTab.addEventListener('click', () => switchAuthTab('login'));
        signupTab.addEventListener('click', () => switchAuthTab('signup'));
        
        // Navigation events
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Filter events
        summaryYearSelect.addEventListener('change', generateSummaryHandler);
        savedYearSelect.addEventListener('change', renderSavedLists);
        savedStoreSelect.addEventListener('change', renderSavedLists);
        
        // Close modal when clicking outside
        itemModal.addEventListener('click', (e) => {
            if (e.target === itemModal) closeModal();
        });
    }
    
    // Show authentication UI
    function showAuth() {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        bottomNav.style.display = 'none';
    }
    
    // Show main app UI
    function showApp() {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        bottomNav.style.display = 'flex';
        userEmail.textContent = getCurrentUser().email;
        
        // Load user's data
        renderSavedLists();
        generateSummaryHandler();
    }
    
    // Switch between login/signup tabs
    function switchAuthTab(tab) {
        if (tab === 'login') {
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
            loginTab.classList.remove('active');
            signupTab.classList.add('active');
        }
    }
    
    // Handle login form submission
    async function handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        const success = await handleLogin(email, password);
        if (success) {
            showApp();
            showMessage('Logged in successfully!');
        }
    }
    
    // Handle signup form submission
    async function handleSignupSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        const success = await handleSignup(email, password, confirmPassword);
        if (success) {
            switchAuthTab('login');
        }
    }
    
    // Handle logout
    async function handleLogoutClick() {
        const success = await handleLogout();
        if (success) {
            showAuth();
        }
    }
    
    // Share list with another user
    async function shareListHandler() {
        const email = shareEmail.value.trim();
        if (!email) {
            showMessage('Please enter an email address', true);
            return;
        }
        
        const listId = getCurrentListId();
        if (!listId) {
            showMessage('Please save the list first before sharing', true);
            return;
        }
        
        const success = await shareList(email, listId);
        if (success) {
            showMessage('List shared successfully!');
            shareEmail.value = '';
            loadSharedUsersHandler();
        }
    }
    
    // Load users that the current list is shared with
    async function loadSharedUsersHandler() {
        const listId = getCurrentListId();
        if (!listId) return;
        
        const sharedUsers = await loadSharedUsers(listId);
        renderSharedUsers(sharedUsers);
    }
    
    // Render shared users
    function renderSharedUsers(sharedUsers) {
        sharedWith.innerHTML = '<h4>Shared with:</h4>';
        
        if (sharedUsers.length === 0) {
            sharedWith.innerHTML += '<p>Not shared with anyone yet</p>';
            return;
        }
        
        sharedUsers.forEach(share => {
            const userEl = document.createElement('div');
            userEl.className = 'shared-user';
            userEl.innerHTML = `
                <span>${share.profiles.email}</span>
                <button class="btn btn-delete unshare-btn" data-user-id="${share.user_id}">
                    <i class="fas fa-times"></i> Remove
                </button>
            `;
            sharedWith.appendChild(userEl);
        });
        
        // Add event listeners to unshare buttons
        document.querySelectorAll('.unshare-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.closest('.unshare-btn').dataset.userId;
                const listId = getCurrentListId();
                const success = await unshareList(userId, listId);
                if (success) {
                    showMessage('Access removed successfully');
                    loadSharedUsersHandler();
                }
            });
        });
    }
    
    // Switch between tabs
    function switchTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabId).classList.add('active');
        
        // Update navigation buttons
        navButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // If switching to summary tab, regenerate summary
        if (tabId === 'summary-tab') {
            generateSummaryHandler();
        }
    }
    
    // Open modal for adding/editing item
    function openModal(item = null) {
        if (item) {
            // Editing existing item
            modalTitle.textContent = 'Edit Item';
            itemDescription.value = item.description;
            itemQuantity.value = item.quantity;
            itemUom.value = item.uom;
            itemMrp.value = item.mrp;
            itemRate.value = item.rate;
            itemGst.value = item.gst;
            currentItemId = item.id;
        } else {
            // Adding new item
            modalTitle.textContent = 'Add Item';
            itemDescription.value = '';
            itemQuantity.value = '1';
            itemUom.value = '';
            itemMrp.value = '0';
            itemRate.value = '0';
            itemGst.value = '5';
            currentItemId = null;
        }
        
        itemModal.classList.add('active');
    }
    
    // Close modal
    function closeModal() {
        itemModal.classList.remove('active');
    }
    
    // Save item from modal
    function saveItem() {
        const newItem = {
            id: currentItemId || Date.now().toString(),
            description: itemDescription.value,
            quantity: parseFloat(itemQuantity.value),
            uom: itemUom.value,
            mrp: parseFloat(itemMrp.value),
            rate: parseFloat(itemRate.value),
            gst: parseFloat(itemGst.value),
            completed: false
        };
        
        if (!newItem.description) {
            showMessage('Please enter an item name', true);
            return;
        }
        
        if (currentItemId) {
            // Update existing item
            updateItem(currentItemId, newItem);
        } else {
            // Add new item
            addItem(newItem);
        }
        
        saveItems();
        renderItems();
        updateSummary();
        closeModal();
        showMessage(`Item ${currentItemId ? 'updated' : 'added'} successfully`);
    }
    
    // Save items to localStorage
    function saveItems() {
        localStorage.setItem('groceryItems', JSON.stringify(getItems()));
    }
    
    // Load items from localStorage
    function loadItems() {
        const savedItems = localStorage.getItem('groceryItems');
        if (savedItems) {
            setItems(JSON.parse(savedItems));
            renderItems();
        }
    }
    
    // Render all items
    function renderItems() {
        const items = getItems();
        
        if (items.length === 0) {
            emptyState.style.display = 'block';
            itemsContainer.innerHTML = '';
            itemsContainer.appendChild(emptyState);
            return;
        }
        
        emptyState.style.display = 'none';
        itemsContainer.innerHTML = '';
        
        items.forEach(item => {
            const totals = calculateItemTotals(item);
            
            const itemElement = document.createElement('div');
            itemElement.className = `item-card ${item.completed ? 'completed' : ''}`;
            itemElement.innerHTML = `
                <div class="item-header">
                    <input type="checkbox" class="item-check" ${item.completed ? 'checked' : ''}>
                    <div class="item-title">${item.description}</div>
                    <div class="item-actions">
                        <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="detail-group">
                        <span class="detail-label">Qty</span>
                        <span class="detail-value">${item.quantity} ${item.uom}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Rate</span>
                        <span class="detail-value">₹${item.rate.toFixed(2)}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">GST</span>
                        <span class="detail-value">${item.gst}%</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Discount</span>
                        <span class="detail-value">${totals.discount}%</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">GST Amt</span>
                        <span class="detail-value">₹${totals.gstAmt}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Total</span>
                        <span class="detail-value">₹${totals.totalAmt}</span>
                    </div>
                </div>
            `;
            
            // Add event listeners
            itemElement.querySelector('.item-check').addEventListener('change', () => {
                toggleItemCompletion(item.id);
                saveItems();
                renderItems();
                updateSummary();
            });
            
            itemElement.querySelector('.edit-btn').addEventListener('click', () => {
                openModal(item);
            });
            
            itemElement.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this item?')) {
                    deleteItem(item.id);
                    saveItems();
                    renderItems();
                    updateSummary();
                    showMessage('Item deleted');
                }
            });
            
            itemsContainer.appendChild(itemElement);
        });
    }
    
    // Update summary
    function updateSummary() {
        const summary = calculateSummary();
        
        document.getElementById('subtotal').textContent = summary.subtotal;
        document.getElementById('totalDiscount').textContent = summary.totalDiscount;
        document.getElementById('totalGst').textContent = summary.totalGst;
        document.getElementById('totalAmount').textContent = summary.totalAmount;
    }
    
    // Save current list
    async function saveCurrentListHandler() {
        const items = getItems();
        if (items.length === 0) {
            showMessage('Please add at least one item before saving', true);
            return;
        }
        
        // Create list data object
        const listData = {
            items: items,
            supermarket: supermarketInput.value,
            month: monthSelect.value,
            year: yearSelect.value,
            listName: listNameInput.value || '',
            savedAt: new Date().toISOString(),
            totalAmount: document.getElementById('totalAmount').textContent
        };
        
        const listId = await saveCurrentList(listData);
        
        if (listId) {
            // Clear current list
            setItems([]);
            setCurrentListId(null);
            listNameInput.value = '';
            supermarketInput.value = '';
            
            // Reset to current month/year
            const now = new Date();
            monthSelect.value = now.getMonth() + 1;
            yearSelect.value = now.getFullYear();
            
            saveItems();
            renderItems();
            updateSummary();
            
            // Update the saved lists display
            renderSavedLists();
            updateSummaryFilters();
            updateSavedFilters();
            
            // Load shared users for this list
            loadSharedUsersHandler();
            
            // Show notification
            showNotification('List saved successfully!');
        }
    }
    
    // Clear current list
    function clearCurrentList() {
        if (confirm('Are you sure you want to clear all items?')) {
            setItems([]);
            setCurrentListId(null);
            listNameInput.value = '';
            saveItems();
            renderItems();
            updateSummary();
            showMessage('List cleared');
        }
    }
    
    // Update saved list filters
    function updateSavedFilters() {
        // Update store filter for saved tab
        while (savedStoreSelect.options.length > 1) {
            savedStoreSelect.remove(1);
        }
        
        // Get unique stores from saved lists
        const stores = new Set();
        const listKeys = Object.keys(localStorage).filter(key => key.startsWith('groceryList-'));
        
        listKeys.forEach(key => {
            const listData = JSON.parse(localStorage.getItem(key));
            if (listData.supermarket) {
                stores.add(listData.supermarket);
            }
        });
        
        // Add store options
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            option.textContent = store;
            savedStoreSelect.appendChild(option);
        });
    }
    
    // Update summary filters
    function updateSummaryFilters() {
        // Nothing needed here for now
    }
    
    // Render saved lists from Supabase
    async function renderSavedLists() {
        savedListsContainer.innerHTML = '';
        
        try {
            // Get user's lists and lists shared with the user
            const { data: userLists, error: userError } = await supabase
                .from('grocery_lists')
                .select('*')
                .eq('user_id', getCurrentUser().id)
                .order('created_at', { ascending: false });
            
            if (userError) throw userError;
            
            const { data: sharedLists, error: sharedError } = await supabase
                .from('list_shares')
                .select(`
                    grocery_lists (*)
                `)
                .eq('user_id', getCurrentUser().id);
            
            if (sharedError) throw sharedError;
            
            // Combine user's lists and shared lists
            const allLists = [
                ...userLists,
                ...sharedLists.map(share => share.grocery_lists)
            ];
            
            // Apply filters
            const yearFilter = savedYearSelect.value;
            const storeFilter = savedStoreSelect.value;
            
            const filteredLists = allLists.filter(list => {
                if (yearFilter !== 'all' && list.year != yearFilter) return false;
                if (storeFilter !== 'all' && list.supermarket !== storeFilter) return false;
                return true;
            });
            
            if (filteredLists.length === 0) {
                savedListsContainer.innerHTML = `
                    <div class="empty-state" style="padding: 20px;">
                        <i class="fas fa-folder-open"></i>
                        <p>No saved lists found</p>
                    </div>
                `;
                return;
            }
            
            // Create a list item for each saved list
            filteredLists.forEach(list => {
                const listName = list.name || 'Unnamed List';
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const monthName = months[list.month - 1] || 'Unknown';
                const savedDate = new Date(list.created_at);
                const formattedDate = savedDate.toLocaleDateString() + ' ' + savedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const isOwner = list.user_id === getCurrentUser().id;
                
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                listItem.innerHTML = `
                    <div class="list-info">
                        <div class="list-name">${listName} ${!isOwner ? '(Shared)' : ''}</div>
                        <div class="list-details">
                            <span class="list-detail-item">
                                <i class="fas fa-calendar"></i>
                                ${monthName} ${list.year}
                            </span>
                            <span class="list-detail-item">
                                <i class="fas fa-store"></i>
                                ${list.supermarket || 'Unknown Store'}
                            </span>
                            <span class="list-detail-item">
                                <i class="fas fa-receipt"></i>
                                ₹${list.total_amount || '0.00'}
                            </span>
                            <span class="list-detail-item">
                                <i class="fas fa-clock"></i>
                                ${formattedDate}
                            </span>
                        </div>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-save load-btn">Load</button>
                        ${isOwner ? `<button class="btn btn-delete delete-btn">Delete</button>` : ''}
                    </div>
                `;
                
                // Add event listeners
                listItem.querySelector('.load-btn').addEventListener('click', async () => {
                    const listData = await loadList(list.id);
                    if (listData) {
                        // Clear the current items
                        setItems([]);
                        
                        // Add items from the saved list
                        if (listData.items && Array.isArray(listData.items)) {
                            setItems(listData.items);
                        }
                        
                        // Update supermarket input if available
                        if (listData.supermarket) {
                            supermarketInput.value = listData.supermarket;
                        }
                        
                        // Update month and year selects if available
                        if (listData.month) {
                            monthSelect.value = listData.month;
                        }
                        
                        if (listData.year) {
                            yearSelect.value = listData.year;
                        }
                        
                        // Update list name if available
                        if (listData.name) {
                            listNameInput.value = listData.name;
                        }
                        
                        // Set as current list
                        setCurrentListId(listData.id);
                        
                        saveItems();
                        renderItems();
                        updateSummary();
                        switchTab('current-tab');
                        
                        // Load shared users for this list
                        loadSharedUsersHandler();
                        
                        // Show success message
                        showMessage('List loaded successfully');
                    }
                });
                
                if (isOwner) {
                    listItem.querySelector('.delete-btn').addEventListener('click', async () => {
                        if (confirm('Are you sure you want to delete this list?')) {
                            const success = await deleteList(list.id);
                            if (success) {
                                // If we're deleting the current list, clear the currentListId
                                if (getCurrentListId() === list.id) {
                                    setCurrentListId(null);
                                }
                                
                                renderSavedLists();
                                updateSummaryFilters();
                                updateSavedFilters();
                                generateSummaryHandler();
                                
                                showMessage('List deleted successfully');
                            }
                        }
                    });
                }
                
                savedListsContainer.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading saved lists:', error);
            savedListsContainer.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading lists</p>
                </div>
            `;
        }
    }
    
    // Generate summary handler
    async function generateSummaryHandler() {
        const yearFilter = summaryYearSelect.value;
        const summaryData = await generateSummary(yearFilter);
        
        // Update yearly summary
        yearlyTotal.textContent = `₹${summaryData.yearlyData.total.toFixed(2)}`;
        yearlyLists.textContent = summaryData.yearlyData.lists;
        yearlyStores.textContent = summaryData.yearlyData.stores.size;
        yearlyItems.textContent = summaryData.yearlyData.items;
        
        // Update yearly comparison
        if (summaryData.yearlyData.previousYearTotal > 0) {
            const change = summaryData.yearlyData.total - summaryData.yearlyData.previousYearTotal;
            const percentChange = (change / summaryData.yearlyData.previousYearTotal) * 100;
            const changeText = change >= 0 ? 
                `↑ ₹${Math.abs(change).toFixed(2)} (${Math.abs(percentChange).toFixed(1)}% increase from previous year)` :
                `↓ ₹${Math.abs(change).toFixed(2)} (${Math.abs(percentChange).toFixed(1)}% decrease from previous year)`;
            
            yearlyComparisonText.textContent = changeText;
        } else {
            yearlyComparisonText.textContent = 'No previous year data';
        }
        
        // Update monthly summary table
        summaryTableBody.innerHTML = '';
        
        if (Object.keys(summaryData.monthlyData).length === 0) {
            summaryTableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center;">No data available for selected filters</td>
                </tr>
            `;
        } else {
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            
            Object.values(summaryData.monthlyData).forEach(data => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="left-align">${months[data.month - 1]} ${data.year}</td>
                    <td class="center-align">${data.store}</td>
                    <td class="right-align number-cell">₹${data.total.toFixed(2)}</td>
                `;
                summaryTableBody.appendChild(row);
            });
        }
        
        // Update store summary table
        storeSummaryBody.innerHTML = '';
        
        if (Object.keys(summaryData.storeData).length === 0) {
            storeSummaryBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center;">No data available for selected filters</td>
                </tr>
            `;
        } else {
            Object.entries(summaryData.storeData).forEach(([store, data]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="left-align">${store}</td>
                    <td class="right-align number-cell">₹${data.total.toFixed(2)}</td>
                    <td class="right-align number-cell">${data.count}</td>
                `;
                storeSummaryBody.appendChild(row);
            });
        }
    }
    
    // Export to PDF handler
    async function exportToPdfHandler() {
        const restoreLoading = showLoading(exportPdfBtn);
        
        setTimeout(() => {
            // Get all saved lists
            const listKeys = Object.keys(localStorage).filter(key => key.startsWith('groceryList-'));
            
            // Apply filters
            const yearFilter = savedYearSelect.value;
            const storeFilter = savedStoreSelect.value;
            
            const filteredKeys = listKeys.filter(key => {
                const listData = JSON.parse(localStorage.getItem(key));
                
                if (yearFilter !== 'all' && listData.year != yearFilter) return false;
                if (storeFilter !== 'all' && listData.supermarket !== storeFilter) return false;
                
                return true;
            });
            
            if (filteredKeys.length === 0) {
                showMessage('No data to export', true);
                restoreLoading();
                return;
            }
            
            const lists = filteredKeys.map(key => JSON.parse(localStorage.getItem(key)));
            exportToPdf(lists, yearFilter, storeFilter);
            
            restoreLoading();
            showNotification('PDF exported successfully!');
        }, 500);
    }
    
    // Export to Excel handler
    async function exportToExcelHandler() {
        const restoreLoading = showLoading(exportExcelBtn);
        
        setTimeout(() => {
            // Get all saved lists
            const listKeys = Object.keys(localStorage).filter(key => key.startsWith('groceryList-'));
            
            // Apply filters
            const yearFilter = savedYearSelect.value;
            const storeFilter = savedStoreSelect.value;
            
            const filteredKeys = listKeys.filter(key => {
                const listData = JSON.parse(localStorage.getItem(key));
                
                if (yearFilter !== 'all' && listData.year != yearFilter) return false;
                if (storeFilter !== 'all' && listData.supermarket !== storeFilter) return false;
                
                return true;
            });
            
            if (filteredKeys.length === 0) {
                showMessage('No data to export', true);
                restoreLoading();
                return;
            }
            
            const lists = filteredKeys.map(key => JSON.parse(localStorage.getItem(key)));
            exportToExcel(lists, yearFilter, storeFilter);
            
            restoreLoading();
            showNotification('Excel file exported successfully!');
        }, 500);
    }
    
    // Initialize the app
    init();
});