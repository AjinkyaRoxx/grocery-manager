import { supabase } from './supabaseClient.js';
import { checkAuthState, handleLogin, handleSignup, handleLogout, getCurrentUser } from './auth.js';
import { initListManager, getItems, setItems, addItem, updateItem, deleteItem, toggleItemCompletion, calculateSummary, saveCurrentList, loadList, deleteList, shareList, loadSharedUsers, unshareList, getCurrentListId, setCurrentListId } from './listManager.js';
import { showNotification, showMessage, showLoading, initDateSelectors, calculateItemTotals, UNIT_CONVERSIONS, formatAmount } from './utils.js';
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
    
    // Form inputs for new unit system
    const hsn = document.getElementById('hsn');
    const itemDescription = document.getElementById('itemDescription');
    const itemQuantity = document.getElementById('itemQuantity');
    const itemTotalPrice = document.getElementById('itemTotalPrice');
    const itemGst = document.getElementById('itemGst');
    
    // Unit selection elements
    const unitOptions = document.querySelectorAll('.unit-option');
    const weightFields = document.getElementById('weightFields');
    const liquidFields = document.getElementById('liquidFields');
    const packageFields = document.getElementById('packageFields');
    const itemWeight = document.getElementById('itemWeight');
    const itemWeightUnit = document.getElementById('itemWeightUnit');
    const itemLiquidVolume = document.getElementById('itemLiquidVolume');
    const itemLiquidUnit = document.getElementById('itemLiquidUnit');
    const itemPackageWeight = document.getElementById('itemPackageWeight');
    const itemPackageUnit = document.getElementById('itemPackageUnit');
    
    // Calculation result elements
    const calcBasePrice = document.getElementById('calcBasePrice');
    const calcGstAmount = document.getElementById('calcGstAmount');
    const calcPricePerUnit = document.getElementById('calcPricePerUnit');
    const calcTotalAmount = document.getElementById('calcTotalAmount');
    
    // Navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // State
    let currentItemId = null;
    let currentUnitType = 'weight';
    
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
        
        // Initialize unit selection
        setupUnitSelection();
        
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
    
    // Unit selection handling
    function setupUnitSelection() {
        unitOptions.forEach(option => {
            option.addEventListener('click', () => {
                const unitType = option.getAttribute('data-unit');
                selectUnitType(unitType);
            });
        });
        
        // Input change listeners for real-time calculation
        itemWeight.addEventListener('input', calculateValues);
        itemWeightUnit.addEventListener('change', calculateValues);
        itemLiquidVolume.addEventListener('input', calculateValues);
        itemLiquidUnit.addEventListener('change', calculateValues);
        itemPackageWeight.addEventListener('input', calculateValues);
        itemPackageUnit.addEventListener('change', calculateValues);
        itemQuantity.addEventListener('input', calculateValues);
        itemTotalPrice.addEventListener('input', calculateValues);
        itemGst.addEventListener('input', calculateValues);
    }
    
    // Select unit type
    function selectUnitType(unitType) {
        currentUnitType = unitType;
        
        // Update UI
        unitOptions.forEach(option => {
            if (option.getAttribute('data-unit') === unitType) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
        
        // Show/hide appropriate fields
        weightFields.style.display = unitType === 'weight' ? 'block' : 'none';
        liquidFields.style.display = unitType === 'liquid' ? 'block' : 'none';
        packageFields.style.display = unitType === 'pack' ? 'block' : 'none';
        
        // Recalculate values
        calculateValues();
    }
    
    // Calculate values based on inputs
    function calculateValues() {
        const totalPrice = parseFloat(itemTotalPrice.value) || 0;
        const gstPercentage = parseFloat(itemGst.value) || 0;
        const quantity = parseFloat(itemQuantity.value) || 0;
        
        // Calculate base price and GST amount
        const basePrice = totalPrice / (1 + (gstPercentage / 100));
        const gstAmount = totalPrice - basePrice;
        
        // Calculate weight/volume information
        let totalBaseAmount = 0;
        let pricePerBaseUnit = 0;
        let displayUnit = '';
        
        if (currentUnitType === 'weight') {
            const weight = parseFloat(itemWeight.value) || 0;
            const weightUnit = itemWeightUnit.value;
            
            // Convert to grams for calculation
            totalBaseAmount = weight * (UNIT_CONVERSIONS.weight[weightUnit] || 1) * quantity;
            
            // Calculate price per kg
            if (weight > 0) {
                const weightInBaseUnit = weight * (UNIT_CONVERSIONS.weight[weightUnit] || 1);
                pricePerBaseUnit = totalPrice / (weightInBaseUnit / 1000); // Price per kg
            }
            
            displayUnit = 'kg';
        } 
        else if (currentUnitType === 'liquid') {
            const volume = parseFloat(itemLiquidVolume.value) || 0;
            const volumeUnit = itemLiquidUnit.value;
            
            // Convert to ml for calculation
            totalBaseAmount = volume * (UNIT_CONVERSIONS.liquid[volumeUnit] || 1) * quantity;
            
            // Calculate price per liter
            if (volume > 0) {
                const volumeInBaseUnit = volume * (UNIT_CONVERSIONS.liquid[volumeUnit] || 1);
                pricePerBaseUnit = totalPrice / (volumeInBaseUnit / 1000); // Price per liter
            }
            
            displayUnit = 'l';
        }
        else if (currentUnitType === 'pack') {
            const packAmount = parseFloat(itemPackageWeight.value) || 0;
            const packUnit = itemPackageUnit.value;
            
            // Determine if it's weight or liquid
            const unitType = ['g', 'kg'].includes(packUnit) ? 'weight' : 'liquid';
            const conversions = UNIT_CONVERSIONS[unitType];
            
            // Convert to base unit for calculation
            totalBaseAmount = packAmount * (conversions[packUnit] || 1) * quantity;
            
            // Calculate price per base unit (kg or liter)
            if (packAmount > 0) {
                const amountInBaseUnit = packAmount * (conversions[packUnit] || 1);
                pricePerBaseUnit = totalPrice / (amountInBaseUnit / 1000); // Price per kg or liter
            }
            
            displayUnit = unitType === 'weight' ? 'kg' : 'l';
        }
        else {
            // Unit type (count)
            totalBaseAmount = quantity;
            pricePerBaseUnit = totalPrice / quantity; // Price per unit
            displayUnit = 'unit';
        }
        
        // Update calculation results
        calcBasePrice.textContent = `₹${basePrice.toFixed(2)}`;
        calcGstAmount.textContent = `₹${gstAmount.toFixed(2)}`;
        calcPricePerUnit.textContent = `₹${pricePerBaseUnit.toFixed(2)}/${displayUnit}`;
        calcTotalAmount.textContent = formatAmount(totalBaseAmount, currentUnitType, displayUnit);
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
            hsn.value = item.hsn || '';
            itemDescription.value = item.description || '';
            
            // Set unit type and values
            selectUnitType(item.unitType || 'weight');
            
            if (item.unitType === 'weight') {
                itemWeight.value = item.weight || '';
                itemWeightUnit.value = item.weightUnit || 'g';
            } else if (item.unitType === 'liquid') {
                itemLiquidVolume.value = item.liquidVolume || '';
                itemLiquidUnit.value = item.liquidUnit || 'ml';
            } else if (item.unitType === 'pack') {
                itemPackageWeight.value = item.packageWeight || '';
                itemPackageUnit.value = item.packageUnit || 'g';
            }
            
            itemQuantity.value = item.quantity || 1;
            itemTotalPrice.value = item.totalPrice || 0;
            itemGst.value = item.gst || 5;
            currentItemId = item.id;
        } else {
            // Adding new item
            modalTitle.textContent = 'Add Item';
            hsn.value = '';
            itemDescription.value = '';
            selectUnitType('weight');
            itemWeight.value = '';
            itemWeightUnit.value = 'g';
            itemLiquidVolume.value = '';
            itemLiquidUnit.value = 'ml';
            itemPackageWeight.value = '';
            itemPackageUnit.value = 'g';
            itemQuantity.value = 1;
            itemTotalPrice.value = 0;
            itemGst.value = 5;
            currentItemId = null;
        }
        
        // Calculate initial values
        calculateValues();
        
        // Show modal
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
            hsn: hsn.value,
            description: itemDescription.value,
            unitType: currentUnitType,
            quantity: parseFloat(itemQuantity.value),
            totalPrice: parseFloat(itemTotalPrice.value),
            gst: parseFloat(itemGst.value),
            completed: false
        };
        
        // Add unit-specific data
        if (currentUnitType === 'weight') {
            newItem.weight = parseFloat(itemWeight.value);
            newItem.weightUnit = itemWeightUnit.value;
        } else if (currentUnitType === 'liquid') {
            newItem.liquidVolume = parseFloat(itemLiquidVolume.value);
            newItem.liquidUnit = itemLiquidUnit.value;
        } else if (currentUnitType === 'pack') {
            newItem.packageWeight = parseFloat(itemPackageWeight.value);
            newItem.packageUnit = itemPackageUnit.value;
        }
        
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
            
            // Determine display text based on unit type
            let unitDisplay = '';
            if (item.unitType === 'weight') {
                unitDisplay = `${item.weight || 0} ${item.weightUnit || 'g'}`;
            } else if (item.unitType === 'liquid') {
                unitDisplay = `${item.liquidVolume || 0} ${item.liquidUnit || 'ml'}`;
            } else if (item.unitType === 'pack') {
                unitDisplay = `${item.packageWeight || 0} ${item.packageUnit || 'g'}`;
            } else {
                unitDisplay = `${item.quantity || 1} unit(s)`;
            }
            
            itemElement.innerHTML = `
                <div class="item-header">
                    <input type="checkbox" class="item-check" ${item.completed ? 'checked' : ''}>
                    <div class="item-title">${item.description} ${item.hsn ? `(HSN: ${item.hsn})` : ''}</div>
                    <div class="item-actions">
                        <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="detail-group">
                        <span class="detail-label">Qty</span>
                        <span class="detail-value">${item.quantity} × ${unitDisplay}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Total Price</span>
                        <span class="detail-value">₹${item.totalPrice.toFixed(2)}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">GST</span>
                        <span class="detail-value">${item.gst}%</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Base Price</span>
                        <span class="detail-value">₹${totals.basePrice}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">GST Amt</span>
                        <span class="detail-value">₹${totals.gstAmount}</span>
                    </div>
                    <div class="detail-group">
                        <span class="detail-label">Price/${totals.displayUnit}</span>
                        <span class="detail-value">₹${totals.pricePerBaseUnit}</span>
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
            // Fetch user's own lists
            const { data: userLists, error: userError, status: userStatus } = await supabase
                .from('grocery_lists')
                .select('*')
                .eq('user_id', getCurrentUser().id)
                .order('created_at', { ascending: false });

            if (userError) {
                console.error("Error fetching user lists:", {
                    status: userStatus,
                    message: userError.message,
                    details: userError.details,
                    hint: userError.hint
                });
                throw userError;
            }

            // Fetch lists shared with the user
            const { data: sharedLists, error: sharedError, status: sharedStatus } = await supabase
                .from('list_shares')
                .select('grocery_lists (*)')
                .eq('user_id', getCurrentUser().id);

            if (sharedError) {
                console.error("Error fetching shared lists:", {
                    status: sharedStatus,
                    message: sharedError.message,
                    details: sharedError.details,
                    hint: sharedError.hint
                });
                throw sharedError;
            }

            // Combine and filter lists
            const allLists = [
                ...userLists,
                ...sharedLists.map(share => share.grocery_lists)
            ];

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

            // Render each list item
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
                            <span class="list-detail-item"><i class="fas fa-calendar"></i> ${monthName} ${list.year}</span>
                            <span class="list-detail-item"><i class="fas fa-store"></i> ${list.supermarket || 'Unknown Store'}</span>
                            <span class="list-detail-item"><i class="fas fa-receipt"></i> ₹${list.total_amount || '0.00'}</span>
                            <span class="list-detail-item"><i class="fas fa-clock"></i> ${formattedDate}</span>
                        </div>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-save load-btn">Load</button>
                        ${isOwner ? `<button class="btn btn-delete delete-btn">Delete</button>` : ''}
                    </div>
                `;

                // Load button handler
                listItem.querySelector('.load-btn').addEventListener('click', async () => {
                    const listData = await loadList(list.id);
                    if (listData) {
                        setItems([]);
                        if (listData.items && Array.isArray(listData.items)) setItems(listData.items);
                        if (listData.supermarket) supermarketInput.value = listData.supermarket;
                        if (listData.month) monthSelect.value = listData.month;
                        if (listData.year) yearSelect.value = listData.year;
                        if (listData.name) listNameInput.value = listData.name;

                        setCurrentListId(listData.id);
                        saveItems();
                        renderItems();
                        updateSummary();
                        switchTab('current-tab');
                        loadSharedUsersHandler();
                        showMessage('List loaded successfully');
                    }
                });

                // Delete button handler
                if (isOwner) {
                    listItem.querySelector('.delete-btn').addEventListener('click', async () => {
                        if (confirm('Are you sure you want to delete this list?')) {
                            const success = await deleteList(list.id);
                            if (success) {
                                if (getCurrentListId() === list.id) setCurrentListId(null);
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

