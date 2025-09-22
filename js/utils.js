// Utility functions

// Unit conversion factors
export const UNIT_CONVERSIONS = {
    weight: {
        g: 1,
        kg: 1000
    },
    liquid: {
        ml: 1,
        l: 1000
    }
};

// Show notification
export function showNotification(message, duration = 2000) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Show message
export function showMessage(message, isError = false) {
    // Remove any existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    
    // Insert after the header
    document.querySelector('.app-header').after(messageDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// Show loading state on a button
export function showLoading(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="loading"></div> Processing...';
    button.disabled = true;
    
    return () => {
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

// Initialize date selectors
export function initDateSelectors() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    
    const monthSelect = document.getElementById('month');
    const yearSelect = document.getElementById('year');
    const summaryYearSelect = document.getElementById('summary-year');
    const savedYearSelect = document.getElementById('saved-year');
    
    // Populate months
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.value = now.getMonth() + 1;
    
    // Populate years
    const currentYear = now.getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
        
        // Also add to summary and saved filters
        const summaryOption = option.cloneNode(true);
        summaryYearSelect.appendChild(summaryOption);
        
        const savedOption = option.cloneNode(true);
        savedYearSelect.appendChild(savedOption);
    }
    yearSelect.value = currentYear;
    summaryYearSelect.value = currentYear;
}

// Calculate item totals with GST separation
export function calculateItemTotals(item) {
    // Extract values with defaults
    const totalPrice = item.totalPrice || 0;
    const gstPercentage = item.gst || 0;
    const quantity = item.quantity || 1;
    
    // Calculate base price and GST amount
    const basePrice = totalPrice / (1 + (gstPercentage / 100));
    const gstAmount = totalPrice - basePrice;
    
    // Calculate weight/volume information
    let totalBaseAmount = 0;
    let pricePerBaseUnit = 0;
    let displayUnit = '';
    
    if (item.unitType === 'weight') {
        const weight = item.weight || 0;
        const weightUnit = item.weightUnit || 'g';
        
        // Convert to grams for calculation
        totalBaseAmount = weight * (UNIT_CONVERSIONS.weight[weightUnit] || 1) * quantity;
        
        // Calculate price per kg
        if (weight > 0) {
            const weightInBaseUnit = weight * (UNIT_CONVERSIONS.weight[weightUnit] || 1);
            pricePerBaseUnit = totalPrice / (weightInBaseUnit / 1000); // Price per kg
        }
        
        displayUnit = 'kg';
    } 
    else if (item.unitType === 'liquid') {
        const volume = item.liquidVolume || 0;
        const volumeUnit = item.liquidUnit || 'ml';
        
        // Convert to ml for calculation
        totalBaseAmount = volume * (UNIT_CONVERSIONS.liquid[volumeUnit] || 1) * quantity;
        
        // Calculate price per liter
        if (volume > 0) {
            const volumeInBaseUnit = volume * (UNIT_CONVERSIONS.liquid[volumeUnit] || 1);
            pricePerBaseUnit = totalPrice / (volumeInBaseUnit / 1000); // Price per liter
        }
        
        displayUnit = 'l';
    }
    else if (item.unitType === 'pack') {
        const packAmount = item.packageWeight || 0;
        const packUnit = item.packageUnit || 'g';
        
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
    
    return {
        basePrice: basePrice.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        pricePerBaseUnit: pricePerBaseUnit.toFixed(2),
        totalBaseAmount: totalBaseAmount,
        displayUnit: displayUnit,
        unitType: item.unitType
    };
}

// Format amount for display
export function formatAmount(amount, unitType, displayUnit) {
    if (unitType === 'weight') {
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(2)}kg`;
        } else {
            return `${amount.toFixed(0)}g`;
        }
    } 
    else if (unitType === 'liquid') {
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(2)}l`;
        } else {
            return `${amount.toFixed(0)}ml`;
        }
    }
    else if (unitType === 'pack') {
        // Determine if it's weight or liquid based on the display unit
        if (displayUnit === 'kg') {
            if (amount >= 1000) {
                return `${(amount / 1000).toFixed(2)}kg`;
            } else {
                return `${amount.toFixed(0)}g`;
            }
        } else {
            if (amount >= 1000) {
                return `${(amount / 1000).toFixed(2)}l`;
            } else {
                return `${amount.toFixed(0)}ml`;
            }
        }
    }
    else {
        return `${amount.toFixed(0)} units`;
    }
}
