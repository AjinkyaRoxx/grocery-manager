// Utility functions

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

// Calculate item totals
export function calculateItemTotals(item) {
    const total = item.quantity * item.rate;
    const discountAmount = item.mrp > 0 ? (item.mrp - item.rate) * item.quantity : 0;
    const discountPercent = item.mrp > 0 ? ((item.mrp - item.rate) / item.mrp) * 100 : 0;
    const gstAmt = total * (item.gst / 100);
    const totalAmt = total + gstAmt;
    
    return {
        discount: Math.round(discountPercent),
        discountAmount: discountAmount.toFixed(2),
        gstAmt: gstAmt.toFixed(2),
        totalAmt: totalAmt.toFixed(2)
    };
}