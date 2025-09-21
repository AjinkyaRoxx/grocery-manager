import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

// Generate summary reports from Supabase data
export async function generateSummary(yearFilter) {
    try {
        // Get user's lists and lists shared with the user
        const { data: userLists, error: userError } = await supabase
            .from('grocery_lists')
            .select('*')
            .eq('user_id', getCurrentUser().id);
        
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
        
        // Initialize summary data
        const monthlyData = {};
        const storeData = {};
        const yearlyData = {
            total: 0,
            lists: 0,
            stores: new Set(),
            items: 0,
            previousYearTotal: 0
        };
        
        // Process each list
        allLists.forEach(list => {
            // Apply filters
            if (yearFilter !== 'all' && list.year != yearFilter) return;
            
            // Calculate total for this list
            let listTotal = list.total_amount || 0;
            let listItems = 0;
            
            if (list.items && Array.isArray(list.items)) {
                list.items.forEach(item => {
                    if (!item.completed) {
                        listItems += item.quantity;
                    }
                });
            }
            
            // Update yearly data
            yearlyData.total += listTotal;
            yearlyData.lists += 1;
            yearlyData.stores.add(list.supermarket);
            yearlyData.items += listItems;
            
            // Update monthly data
            const monthKey = `${list.month}-${list.year}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: list.month,
                    year: list.year,
                    total: 0,
                    store: list.supermarket || 'Unknown'
                };
            }
            monthlyData[monthKey].total += listTotal;
            
            // Update store data
            const storeName = list.supermarket || 'Unknown';
            if (!storeData[storeName]) {
                storeData[storeName] = {
                    total: 0,
                    count: 0
                };
            }
            storeData[storeName].total += listTotal;
            storeData[storeName].count += 1;
        });
        
        // Calculate previous year data for comparison
        if (yearFilter !== 'all') {
            const previousYear = parseInt(yearFilter) - 1;
            allLists.forEach(list => {
                if (list.year == previousYear) {
                    yearlyData.previousYearTotal += list.total_amount || 0;
                }
            });
        }
        
        return {
            yearlyData,
            monthlyData,
            storeData
        };
    } catch (error) {
        console.error('Error generating summary:', error);
        return {
            yearlyData: {
                total: 0,
                lists: 0,
                stores: new Set(),
                items: 0,
                previousYearTotal: 0
            },
            monthlyData: {},
            storeData: {}
        };
    }
}