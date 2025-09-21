import { calculateItemTotals } from './utils.js';

// Export to PDF function with detailed item information
export function exportToPdf(lists, yearFilter, storeFilter) {
    // Create PDF document
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Grocery List Manager - Detailed Export', 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add filters info
    doc.text(`Year: ${yearFilter === 'all' ? 'All' : yearFilter}, Store: ${storeFilter === 'all' ? 'All' : storeFilter}`, 14, 36);
    
    let startY = 45;
    
    // Process each list
    lists.forEach((listData, index) => {
        const savedDate = new Date(listData.savedAt);
        const formattedDate = savedDate.toLocaleDateString();
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthName = months[listData.month - 1] || 'Unknown';
        
        // Add list header
        if (startY > 240) {
            doc.addPage();
            startY = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(76, 175, 80);
        doc.text(`${listData.listName || 'Unnamed List'} - ${monthName} ${listData.year}`, 14, startY);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Store: ${listData.supermarket || 'Unknown'}, Saved: ${formattedDate}`, 14, startY + 6);
        
        startY += 15;
        
        // Prepare item data for this list
        const itemData = [];
        let listSubtotal = 0;
        let listDiscount = 0;
        let listGst = 0;
        let listTotal = 0;
        
        if (listData.items && Array.isArray(listData.items)) {
            listData.items.forEach(item => {
                if (!item.completed) {
                    const totals = calculateItemTotals(item);
                    
                    itemData.push([
                        item.description,
                        item.quantity.toString(),
                        item.uom,
                        `₹${parseFloat(item.mrp).toFixed(2)}`,
                        `₹${parseFloat(item.rate).toFixed(2)}`,
                        `${totals.discount}%`,
                        `${item.gst}%`,
                        `₹${totals.gstAmt}`,
                        `₹${totals.totalAmt}`
                    ]);
                    
                    const itemTotal = item.quantity * item.rate;
                    const discountAmount = item.mrp > 0 ? (item.mrp - item.rate) * item.quantity : 0;
                    const gstAmt = itemTotal * (item.gst / 100);
                    
                    listSubtotal += itemTotal;
                    listDiscount += discountAmount;
                    listGst += gstAmt;
                    listTotal += itemTotal + gstAmt;
                }
            });
        }
        
        // Add items table
        doc.autoTable({
            head: [['Item', 'Qty', 'Unit', 'MRP', 'Rate', 'Disc %', 'GST %', 'GST Amt', 'Total']],
            body: itemData,
            startY: startY,
            theme: 'grid',
            headStyles: {
                fillColor: [76, 175, 80],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 15 },
                2: { cellWidth: 15 },
                3: { cellWidth: 20, halign: 'right' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 15, halign: 'right' },
                6: { cellWidth: 15, halign: 'right' },
                7: { cellWidth: 20, halign: 'right' },
                8: { cellWidth: 20, halign: 'right' }
            }
        });
        
        // Add list summary
        startY = doc.lastAutoTable.finalY + 10;
        
        if (startY > 260) {
            doc.addPage();
            startY = 20;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Subtotal: ₹${listSubtotal.toFixed(2)} | Discount: ₹${listDiscount.toFixed(2)} | GST: ₹${listGst.toFixed(2)} | Total: ₹${listTotal.toFixed(2)}`, 14, startY);
        
        startY += 15;
        
        // Add spacing between lists
        if (index < lists.length - 1) {
            if (startY > 250) {
                doc.addPage();
                startY = 20;
            } else {
                startY += 10;
            }
        }
    });
    
    // Save the PDF
    doc.save('grocery_lists_detailed_export.pdf');
}

// Export to Excel function with detailed item information
export function exportToExcel(lists, yearFilter, storeFilter) {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create summary worksheet
    const summaryData = [
        ['Grocery List Manager - Detailed Export'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Year: ${yearFilter === 'all' ? 'All' : yearFilter}, Store: ${storeFilter === 'all' ? 'All' : storeFilter}`],
        [],
        ['List Name', 'Month', 'Year', 'Store', 'Saved Date', 'Subtotal', 'Discount', 'GST', 'Total Amount', 'Item Count']
    ];
    
    // Create detailed items worksheet
    const itemsData = [
        ['Grocery List Manager - Detailed Item Export'],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [`Year: ${yearFilter === 'all' ? 'All' : yearFilter}, Store: ${storeFilter === 'all' ? 'All' : storeFilter}`],
        [],
        ['List Name', 'Month', 'Year', 'Store', 'Item', 'Qty', 'Unit', 'MRP', 'Rate', 'Disc %', 'GST %', 'GST Amt', 'Total']
    ];
    
    // Process each list
    lists.forEach(listData => {
        const savedDate = new Date(listData.savedAt);
        const formattedDate = savedDate.toLocaleDateString();
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthName = months[listData.month - 1] || 'Unknown';
        
        let listSubtotal = 0;
        let listDiscount = 0;
        let listGst = 0;
        let listTotal = 0;
        let itemCount = 0;
        
        if (listData.items && Array.isArray(listData.items)) {
            listData.items.forEach(item => {
                if (!item.completed) {
                    const totals = calculateItemTotals(item);
                    const itemTotal = item.quantity * item.rate;
                    const discountAmount = item.mrp > 0 ? (item.mrp - item.rate) * item.quantity : 0;
                    const gstAmt = itemTotal * (item.gst / 100);
                    
                    // Add to items worksheet
                    itemsData.push([
                        listData.listName || 'Unnamed List',
                        monthName,
                        listData.year,
                        listData.supermarket || 'Unknown',
                        item.description,
                        item.quantity,
                        item.uom,
                        parseFloat(item.mrp),
                        parseFloat(item.rate),
                        totals.discount,
                        parseFloat(item.gst),
                        parseFloat(totals.gstAmt),
                        parseFloat(totals.totalAmt)
                    ]);
                    
                    listSubtotal += itemTotal;
                    listDiscount += discountAmount;
                    listGst += gstAmt;
                    listTotal += itemTotal + gstAmt;
                    itemCount++;
                }
            });
        }
        
        // Add to summary worksheet
        summaryData.push([
            listData.listName || 'Unnamed List',
            monthName,
            listData.year,
            listData.supermarket || 'Unknown',
            formattedDate,
            listSubtotal,
            listDiscount,
            listGst,
            listTotal,
            itemCount
        ]);
    });
    
    // Add totals row to summary
    summaryData.push(['TOTAL', '', '', '', '',
        summaryData.slice(5).reduce((sum, row) => sum + (row[5] || 0), 0),
        summaryData.slice(5).reduce((sum, row) => sum + (row[6] || 0), 0),
        summaryData.slice(5).reduce((sum, row) => sum + (row[7] || 0), 0),
        summaryData.slice(5).reduce((sum, row) => sum + (row[8] || 0), 0),
        summaryData.slice(5).reduce((sum, row) => sum + (row[9] || 0), 0)
    ]);
    
    // Create worksheets
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    const itemsWs = XLSX.utils.aoa_to_sheet(itemsData);
    
    // Set column widths
    const summaryColWidths = [
        { wch: 25 }, // List Name
        { wch: 10 }, // Month
        { wch: 8 },  // Year
        { wch: 20 }, // Store
        { wch: 15 }, // Saved Date
        { wch: 12 }, // Subtotal
        { wch: 12 }, // Discount
        { wch: 12 }, // GST
        { wch: 12 }, // Total Amount
        { wch: 10 }  // Item Count
    ];
    
    const itemsColWidths = [
        { wch: 25 }, // List Name
        { wch: 10 }, // Month
        { wch: 8 },  // Year
        { wch: 20 }, // Store
        { wch: 30 }, // Item
        { wch: 8 },  // Qty
        { wch: 8 },  // Unit
        { wch: 10 }, // MRP
        { wch: 10 }, // Rate
        { wch: 8 },  // Disc %
        { wch: 8 },  // GST %
        { wch: 12 }, // GST Amt
        { wch: 12 }  // Total
    ];
    
    summaryWs['!cols'] = summaryColWidths;
    itemsWs['!cols'] = itemsColWidths;
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    XLSX.utils.book_append_sheet(wb, itemsWs, 'Items');
    
    // Save the Excel file
    XLSX.writeFile(wb, 'grocery_lists_detailed_export.xlsx');
}