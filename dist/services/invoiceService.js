"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatINR = formatINR;
exports.numberToWordsINR = numberToWordsINR;
exports.generateGSTInvoice = generateGSTInvoice;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_1 = require("../prisma");
// Indian GST State Codes Map
const GST_STATE_CODES = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh'
};
/**
 * Formats a number to Indian currency format with commas and 2 decimals (e.g., "1,450.00")
 */
function formatINR(val) {
    const num = Math.max(0, Number(val) || 0);
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
/**
 * Converts a numeric amount to Indian Currency Words (e.g., "One Thousand Four Hundred Fifty Rupees Only")
 */
function numberToWordsINR(amount) {
    const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convertTwoDigits(num) {
        if (num < 10)
            return singleDigits[num];
        if (num >= 10 && num < 20)
            return teens[num - 10];
        const t = Math.floor(num / 10);
        const u = num % 10;
        return tens[t] + (u > 0 ? ' ' + singleDigits[u] : '');
    }
    function convertThreeDigits(num) {
        const h = Math.floor(num / 100);
        const rem = num % 100;
        let str = '';
        if (h > 0)
            str += singleDigits[h] + ' Hundred';
        if (rem > 0)
            str += (str ? ' ' : '') + convertTwoDigits(rem);
        return str;
    }
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    if (integerPart === 0)
        return 'Zero Rupees Only';
    let n = integerPart;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundreds = n;
    let res = '';
    if (crore > 0)
        res += convertThreeDigits(crore) + ' Crore ';
    if (lakh > 0)
        res += convertTwoDigits(lakh) + ' Lakh ';
    if (thousand > 0)
        res += convertTwoDigits(thousand) + ' Thousand ';
    if (hundreds > 0)
        res += convertThreeDigits(hundreds) + ' ';
    res = res.trim() + ' Rupees';
    if (decimalPart > 0) {
        res += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
    }
    return res + ' Only';
}
/**
 * Generates an official GST-compliant Tax Invoice PDF for a booking
 */
async function generateGSTInvoice(data) {
    const invoicesDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'invoices');
    if (!fs_1.default.existsSync(invoicesDir)) {
        fs_1.default.mkdirSync(invoicesDir, { recursive: true });
    }
    // 1. Fetch Global Settings for Supplier Details
    let settings = null;
    try {
        settings = await prisma_1.prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
    }
    catch (e) {
        console.warn('[InvoiceService] Failed to fetch settings, using fallback');
    }
    const supplierName = 'Tickets Pro';
    const legalEntityName = 'Pradip Enterprises';
    const supplierGstin = settings?.gstNo || '19BOOPA3821C1Z9';
    const supplierAddress = 'MACHHOL, ALTAPUR, WEST BENGAL - 733215';
    const supplierPhone = '+91 73188 15790';
    const supplierEmail = settings?.email || 'support@ticketspro.in';
    const supplierState = 'West Bengal (19)';
    // 2. Invoice Identifiers
    const cleanId = String(data.bookingId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${cleanId}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    // 3. Tax Calculations
    const totalAmount = Math.max(0, Number(data.amount) || 0);
    const upperClass = String(data.trainClass || '').toUpperCase();
    const isAcClass = ['1A', '2A', '3A', '3E', 'CC', 'EC', 'EV', 'FC'].some(c => upperClass.includes(c));
    const isExempt = !isAcClass && ['SL', 'SLEEPER', '2S'].some(c => upperClass.includes(c));
    let gstRate = 5.0; // 5% default for AC rail passenger transport (SAC 996411)
    let taxableAmount = totalAmount;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let isInterState = false;
    let placeOfSupply = 'West Bengal (19)';
    // Determine State and Inter-State from GSTIN or State name
    if (data.clientGstin && data.clientGstin.length >= 2) {
        const stateCode = data.clientGstin.slice(0, 2);
        const stateName = GST_STATE_CODES[stateCode] || 'Other State';
        placeOfSupply = `${stateName} (${stateCode})`;
        if (stateCode !== '19') {
            isInterState = true;
        }
    }
    else if (data.clientState) {
        placeOfSupply = data.clientState;
        if (!data.clientState.toLowerCase().includes('west bengal') && !data.clientState.includes('19')) {
            isInterState = true;
        }
    }
    if (!isExempt && totalAmount > 0) {
        if (isInterState) {
            taxableAmount = Math.round((totalAmount / (1 + gstRate / 100)) * 100) / 100;
            igst = Math.round((totalAmount - taxableAmount) * 100) / 100;
            cgst = 0;
            sgst = 0;
        }
        else {
            // Under Indian GST law: CGST rate and SGST rate are equal (2.5% each)
            // CGST amount and SGST amount MUST be exactly identical.
            const rawBase = totalAmount / (1 + gstRate / 100);
            const rawTaxPerComponent = rawBase * ((gstRate / 2) / 100);
            cgst = Math.round(rawTaxPerComponent * 100) / 100;
            sgst = cgst; // Mandatory exact equality
            const totalTax = cgst + sgst;
            taxableAmount = Math.round((totalAmount - totalTax) * 100) / 100;
        }
    }
    else if (isExempt) {
        gstRate = 0;
        taxableAmount = totalAmount;
        cgst = 0;
        sgst = 0;
        igst = 0;
    }
    const filename = `INV_${data.bookingId}.pdf`;
    const filePath = path_1.default.join(invoicesDir, filename);
    const publicUrl = `/uploads/invoices/${filename}`;
    // 4. Generate Clean Vector PDF using PDFKit
    await new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 36,
            info: {
                Title: `GST Tax Invoice - ${invoiceNumber}`,
                Author: supplierName,
                Subject: `Booking ${data.bookingId}`,
                Keywords: 'GST Invoice, Indian Railways, Tickets Pro, IRCTC'
            }
        });
        const stream = fs_1.default.createWriteStream(filePath);
        doc.pipe(stream);
        // ── Header Banner ──
        doc.rect(36, 36, 523, 50).fill('#0f172a'); // Dark Navy Header
        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 50, 48);
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('ORIGINAL FOR RECIPIENT | ISSUED UNDER SECTION 31 OF CGST ACT, 2017', 50, 68);
        doc.fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold').text(supplierName, 360, 46, { align: 'right', width: 185 });
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`${legalEntityName} | Rail Services`, 360, 64, { align: 'right', width: 185 });
        // ── Supplier & Customer Columns (Boxes) ──
        const topY = 96;
        const colWidth = 256;
        const colHeight = 104;
        // Supplier Box (Left)
        doc.rect(36, topY, colWidth, colHeight).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.rect(36, topY, colWidth, 18).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text('SUPPLIER (ISSUED BY)', 44, topY + 5);
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`${supplierName} (${legalEntityName})`, 44, topY + 24);
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
            .text(`GSTIN: ${supplierGstin}`, 44, topY + 37)
            .text(`Address: ${supplierAddress}`, 44, topY + 49, { width: 240 })
            .text(`State: ${supplierState}`, 44, topY + 73)
            .text(`Email: ${supplierEmail} | Phone: ${supplierPhone}`, 44, topY + 85);
        // Customer Box (Right)
        const rightX = 303;
        doc.rect(rightX, topY, colWidth, colHeight).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.rect(rightX, topY, colWidth, 18).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text('BILLED TO (RECIPIENT)', rightX + 8, topY + 5);
        const clientName = data.clientCompanyName || data.customerName || 'Valued Passenger';
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(clientName, rightX + 8, topY + 24);
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        if (data.clientGstin) {
            doc.text(`GSTIN: ${data.clientGstin}`, rightX + 8, topY + 37);
        }
        else {
            doc.text('Type: Unregistered Consumer (B2C)', rightX + 8, topY + 37);
        }
        doc.text(`Mobile: ${data.customerMobile || 'N/A'}`, rightX + 8, topY + 49);
        doc.text(`Email: ${data.customerEmail || 'N/A'}`, rightX + 8, topY + 61);
        doc.text(`Place of Supply: ${placeOfSupply}`, rightX + 8, topY + 73);
        doc.text(`Reverse Charge Applicable: NO`, rightX + 8, topY + 85);
        // ── Invoice Meta Bar ──
        const metaY = 208;
        doc.rect(36, metaY, 523, 30).fill('#f1f5f9');
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text('Invoice Number:', 44, metaY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(invoiceNumber, 44, metaY + 16);
        doc.fillColor('#475569').font('Helvetica').text('Invoice Date:', 175, metaY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(invoiceDate, 175, metaY + 16);
        doc.fillColor('#475569').font('Helvetica').text('Booking Ref ID:', 300, metaY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(data.bookingId.slice(0, 16), 300, metaY + 16);
        doc.fillColor('#475569').font('Helvetica').text('Payment Txn / Ref:', 430, metaY + 6);
        doc.fillColor('#0d9488').font('Helvetica-Bold').text(data.paymentId || 'PAID / CONFIRMED', 430, metaY + 16);
        // ── Journey Details Card ──
        const journeyY = 246;
        doc.rect(36, journeyY, 523, 62).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.rect(36, journeyY, 523, 16).fill('#e2e8f0');
        doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold').text('JOURNEY & PASSENGER SPECIFICATIONS', 44, journeyY + 4);
        const journeyDateStr = data.journeyDate
            ? new Date(data.journeyDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : 'Scheduled Date';
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text('Train:', 44, journeyY + 22).fillColor('#0f172a').font('Helvetica-Bold').text(`${data.trainName || 'Express'} (#${data.trainNo || 'Special'})`, 75, journeyY + 22);
        doc.fillColor('#475569').font('Helvetica').text('Route:', 260, journeyY + 22).fillColor('#0f172a').font('Helvetica-Bold').text(`${data.fromStation || 'Origin'} to ${data.toStation || 'Destination'}`, 295, journeyY + 22);
        doc.fillColor('#475569').font('Helvetica').text('Date:', 440, journeyY + 22).fillColor('#0f172a').font('Helvetica-Bold').text(journeyDateStr, 465, journeyY + 22);
        doc.fillColor('#475569').font('Helvetica').text('Class:', 44, journeyY + 36).fillColor('#0284c7').font('Helvetica-Bold').text(data.trainClass || 'Standard', 75, journeyY + 36);
        doc.fillColor('#475569').font('Helvetica').text('Status:', 260, journeyY + 36).fillColor('#16a34a').font('Helvetica-Bold').text('CONFIRMED / ACTIVE', 295, journeyY + 36);
        // Passengers Summary line
        let pSummary = '';
        if (Array.isArray(data.passengerList)) {
            pSummary = data.passengerList.map(p => `${p.name} (${p.age || 'Adult'}/${p.gender || 'M'})`).join(', ');
        }
        else if (typeof data.passengerList === 'string') {
            pSummary = data.passengerList;
        }
        else {
            pSummary = `${data.passengers || 1} Passenger(s)`;
        }
        doc.fillColor('#475569').font('Helvetica').text('Passengers:', 44, journeyY + 49).fillColor('#0f172a').font('Helvetica').text(pSummary.slice(0, 110), 100, journeyY + 49, { width: 440 });
        // ── Itemized GST Table ──
        const tableY = 318;
        const thHeight = 20;
        // Table Header
        doc.rect(36, tableY, 523, thHeight).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('S.No', 42, tableY + 6);
        doc.text('Description of Service', 68, tableY + 6);
        doc.text('SAC', 240, tableY + 6);
        doc.text('Qty', 275, tableY + 6);
        doc.text('Taxable (INR)', 305, tableY + 6);
        if (isInterState) {
            doc.text(`IGST (${gstRate}%)`, 385, tableY + 6);
        }
        else {
            doc.text(`CGST (${(gstRate / 2).toFixed(1)}%)`, 375, tableY + 6);
            doc.text(`SGST (${(gstRate / 2).toFixed(1)}%)`, 435, tableY + 6);
        }
        doc.text('Total (INR)', 495, tableY + 6);
        // Table Row 1
        const r1Y = tableY + thHeight;
        const rowHeight = 32;
        doc.rect(36, r1Y, 523, rowHeight).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        doc.text('1', 44, r1Y + 8);
        const serviceDesc = isExempt
            ? `Passenger Transport by Rail (Train ${data.trainNo || ''} - Non-AC Sleeper)`
            : `Passenger Transport by Rail (Train ${data.trainNo || ''} - AC Class)`;
        const subDesc = isExempt
            ? 'Exempt from GST as per Notification No. 12/2017 - Central Tax (Rate)'
            : 'Online railway ticket booking and facilitation (SAC 996411)';
        doc.font('Helvetica-Bold').text(serviceDesc, 68, r1Y + 8)
            .font('Helvetica').fillColor('#64748b').text(subDesc, 68, r1Y + 18);
        doc.fillColor('#334155').text('996411', 240, r1Y + 12);
        doc.text(String(data.passengers || 1), 280, r1Y + 12);
        doc.text(`Rs. ${formatINR(taxableAmount)}`, 305, r1Y + 12);
        if (isInterState) {
            doc.text(`Rs. ${formatINR(igst)}`, 385, r1Y + 12);
        }
        else {
            doc.text(`Rs. ${formatINR(cgst)}`, 375, r1Y + 12);
            doc.text(`Rs. ${formatINR(sgst)}`, 435, r1Y + 12);
        }
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(`Rs. ${formatINR(totalAmount)}`, 495, r1Y + 12);
        // ── Summary Totals Box ──
        const sumY = r1Y + rowHeight + 12;
        const boxW = 220;
        const boxX = 339;
        doc.rect(boxX, sumY, boxW, 82).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text('Taxable Amount:', boxX + 12, sumY + 8);
        doc.fillColor('#0f172a').text(`Rs. ${formatINR(taxableAmount)}`, boxX + 115, sumY + 8, { align: 'right', width: 90 });
        if (isInterState) {
            doc.fillColor('#475569').text(`Integrated GST (IGST ${gstRate}%):`, boxX + 12, sumY + 22);
            doc.fillColor('#0f172a').text(`Rs. ${formatINR(igst)}`, boxX + 115, sumY + 22, { align: 'right', width: 90 });
        }
        else {
            doc.fillColor('#475569').text(`Central GST (CGST ${(gstRate / 2).toFixed(1)}%):`, boxX + 12, sumY + 20);
            doc.fillColor('#0f172a').text(`Rs. ${formatINR(cgst)}`, boxX + 115, sumY + 20, { align: 'right', width: 90 });
            doc.fillColor('#475569').text(`State GST (SGST ${(gstRate / 2).toFixed(1)}%):`, boxX + 12, sumY + 33);
            doc.fillColor('#0f172a').text(`Rs. ${formatINR(sgst)}`, boxX + 115, sumY + 33, { align: 'right', width: 90 });
        }
        doc.rect(boxX, sumY + 48, boxW, 1).strokeColor('#e2e8f0').stroke();
        doc.rect(boxX, sumY + 49, boxW, 33).fill('#f8fafc');
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('Total (INR):', boxX + 12, sumY + 60);
        doc.fillColor('#0284c7').fontSize(11).text(`Rs. ${formatINR(totalAmount)}`, boxX + 100, sumY + 59, { align: 'right', width: 105 });
        // Amount in Words (Left side of summary)
        doc.rect(36, sumY, 290, 82).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('TOTAL AMOUNT IN WORDS', 44, sumY + 8);
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(numberToWordsINR(totalAmount), 44, sumY + 22, { width: 270 });
        doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Payment Gateway Status: CAPTURED & SETTLED', 44, sumY + 60);
        // ── Declarations & Bank Signatory ──
        const decY = sumY + 98;
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('Terms & Declarations:', 36, decY);
        doc.fillColor('#64748b').fontSize(6.5).font('Helvetica')
            .text('1. We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.', 36, decY + 12)
            .text('2. Passenger transportation is governed under the Indian Railways Act, 1989 and IRCTC booking guidelines.', 36, decY + 22)
            .text('3. This is a computer generated invoice issued under Section 31 of CGST Act and does not require physical signature.', 36, decY + 32);
        // Stamp / Signatory Box (Right)
        doc.rect(390, decY, 169, 52).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(`For ${legalEntityName} (${supplierName})`, 398, decY + 6);
        doc.fillColor('#0284c7').fontSize(8).font('Helvetica-Bold').text('Tickets Pro Desk', 398, decY + 24);
        doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Authorized Signatory', 398, decY + 38);
        // ── Footer ──
        doc.rect(36, 780, 523, 0.5).strokeColor('#cbd5e1').stroke();
        doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Tickets Pro | Official Railway Intelligence Platform | www.ticketspro.in | Contact: support@ticketspro.in', 36, 786, { align: 'center', width: 523 });
        doc.end();
        stream.on('finish', () => resolve());
        stream.on('error', (err) => reject(err));
    });
    const pdfBuffer = fs_1.default.readFileSync(filePath);
    return {
        invoiceNumber,
        invoiceDate,
        pdfPath: filePath,
        pdfUrl: publicUrl,
        pdfBuffer,
        taxableAmount,
        gstRate,
        cgst,
        sgst,
        igst,
        totalAmount,
        isInterState
    };
}
