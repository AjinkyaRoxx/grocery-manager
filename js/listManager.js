import { supabase } from './supabaseClient.js';
import { showMessage, calculateItemTotals } from './utils.js';

// List management functions
let items = [];
let currentListId = null;
let sharedUsers = [];

// 🔐 Helper: Get current user ID safely
async function getCurrentUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');
    return user.id;
}

// Initialize list manager
export function initListManager() {
    items = [];
    currentListId = null;
    sharedUsers = [];
}

// Get current items
export function getItems() {
    return items;
}

// Set items
export function setItems(newItems) {
    items = newItems;
}

// Get current list ID
export function getCurrentListId() {
    return currentListId;
}

// Set current list ID
export function setCurrentListId(id) {
    currentListId = id;
}

// Add item
export function addItem(item) {
    items.push(item);
}

// Update item
export function updateItem(id, updatedItem) {
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
        items[index] = updatedItem;
    }
}

// Delete item
export function deleteItem(id) {
    items = items.filter(item => item.id !== id);
}

// Toggle item completion
export function toggleItemCompletion(id) {
    const item = items.find(item => item.id === id);
    if (item) {
        item.completed = !item.completed;
    }
}

// Calculate summary
export function calculateSummary() {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let totalAmount = 0;

    items.forEach(item => {
        if (!item.completed) {
            const total = item.quantity * item.rate;
            const discountAmount = item.mrp > 0 ? (item.mrp - item.rate) * item.quantity : 0;
            const gstAmt = total * (item.gst / 100);

            subtotal += total;
            totalDiscount += discountAmount;
            totalGst += gstAmt;
            totalAmount += total + gstAmt;
        }
    });

    return {
        subtotal: subtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalGst: totalGst.toFixed(2),
        totalAmount: totalAmount.toFixed(2)
    };
}

// Save current list to Supabase
export async function saveCurrentList(listData) {
    try {
        let listId = currentListId;
        const userId = await getCurrentUserId();

        if (listId) {
            // Update existing list
            const { error } = await supabase
                .from('grocery_lists')
                .update({
                    name: listData.listName,
                    supermarket: listData.supermarket,
                    month: listData.month,
                    year: listData.year,
                    items: listData.items,
                    total_amount: parseFloat(listData.totalAmount),
                    updated_at: new Date().toISOString()
                })
                .eq('id', listId)
                .eq('user_id', userId);

            if (error) throw error;
        } else {
            // Create new list
            const { data, error } = await supabase
                .from('grocery_lists')
                .insert({
                    name: listData.listName,
                    supermarket: listData.supermarket,
                    month: listData.month,
                    year: listData.year,
                    items: listData.items,
                    total_amount: parseFloat(listData.totalAmount),
                    user_id: userId
                })
                .select()
                .single();

            if (error) throw error;

            listId = data.id;
            currentListId = listId;
        }

        return listId;
    } catch (error) {
        showMessage('Error saving list: ' + error.message, true);
        return null;
    }
}

// Load a saved list from Supabase
export async function loadList(listId) {
    try {
        const { data, error } = await supabase
            .from('grocery_lists')
            .select('*')
            .eq('id', listId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        showMessage('Error loading list: ' + error.message, true);
        return null;
    }
}

// Delete a list from Supabase
export async function deleteList(listId) {
    try {
        const userId = await getCurrentUserId();

        const { error } = await supabase
            .from('grocery_lists')
            .delete()
            .eq('id', listId)
            .eq('user_id', userId);

        if (error) throw error;

        await supabase
            .from('list_shares')
            .delete()
            .eq('list_id', listId);

        return true;
    } catch (error) {
        showMessage('Error deleting list: ' + error.message, true);
        return false;
    }
}

// Share list with another user
export async function shareList(email, listId) {
    const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !userData) {
        showMessage('User not found', true);
        return false;
    }

    const { error } = await supabase
        .from('list_shares')
        .insert({
            list_id: listId,
            user_id: userData.id,
            can_edit: true
        });

    if (error) {
        showMessage('Error sharing list: ' + error.message, true);
        return false;
    } else {
        return true;
    }
}

// Load users that the current list is shared with
export async function loadSharedUsers(listId) {
    try {
        const { data, error } = await supabase
            .from('list_shares')
            .select(`
                user_id,
                profiles (email)
            `)
            .eq('list_id', listId);

        if (error) throw error;

        sharedUsers = data;
        return data;
    } catch (error) {
        console.error('Error loading shared users:', error);
        return [];
    }
}

// Unshare list with a user
export async function unshareList(userId, listId) {
    try {
        const { error } = await supabase
            .from('list_shares')
            .delete()
            .eq('list_id', listId)
            .eq('user_id', userId);

        if (error) throw error;

        return true;
    } catch (error) {
        showMessage('Error removing share: ' + error.message, true);
        return false;
    }
}
