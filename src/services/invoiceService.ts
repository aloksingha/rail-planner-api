import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { prisma } from '../prisma';

export interface InvoiceData {
    bookingId: string;
    amount: number;
    trainNo?: string;
    trainName?: string;
    fromStation?: string;
    toStation?: string;
    journeyDate?: string | Date;
    trainClass?: string;
    passengers?: number;
    passengerList?: Array<{ name: string; age?: number | string; gender?: string }> | string;
    paymentId?: string;
    customerName?: string;
    customerEmail?: string;
    customerMobile?: string;
    clientGstin?: string;
    clientCompanyName?: string;
    clientState?: string;
}

export interface InvoiceResult {
    invoiceNumber: string;
    invoiceDate: string;
    pdfPath: string;
    pdfUrl: string;
    pdfBuffer?: Buffer;
    taxableAmount: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
    isInterState: boolean;
}

/**
 * Converts a numeric amount to Indian Currency Words (e.g., "One Thousand Five Hundred Rupees Only")
 */
export function numberToWordsINR(amount: number): string {
    const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertTwoDigits(num: number): string {
        if (num < 10) return singleDigits[num];
        if (num >= 10 && num < 20) return teens[num - 10];
        const t = Math.floor(num / 10);
        const u = num % 10;
        return tens[t] + (u > 0 ? ' ' + singleDigits[u] : '');
    }

    function convertThreeDigits(num: number): string {
        const h = Math.floor(num / 100);
        const rem = num % 100;
        let str = '';
        if (h > 0) str += singleDigits[h] + ' Hundred';
        if (rem > 0) str += (str ? ' ' : '') + convertTwoDigits(rem);
        return str;
    }

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    if (integerPart === 0) return 'Zero Rupees Only';

    let n = integerPart;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundreds = n;

    let res = '';
    if (crore > 0) res += convertThreeDigits(crore) + ' Crore ';
    if (lakh > 0) res += convertTwoDigits(lakh) + ' Lakh ';
    if (thousand > 0) res += convertTwoDigits(thousand) + ' Thousand ';
    if (hundreds > 0) res += convertThreeDigits(hundreds) + ' ';

    res = res.trim() + ' Rupees';
    if (decimalPart > 0) {
        res += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
    }
    return res + ' Only';
}

/**
 * Generates an official GST-compliant Tax Invoice PDF for a booking
 */
export async function generateGSTInvoice(data: InvoiceData): Promise<InvoiceResult> {
    const invoicesDir = path.join(__dirname, '..', '..', 'uploads', 'invoices');
    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
    }

    // 1. Fetch Global Settings for Supplier Details
    let settings: any = null;
    try {
        settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
    } catch (e) {
        console.warn('[InvoiceService] Failed to fetch settings, using fallback');
    }

    const supplierName = settings?.youpiMerchantName || 'Tickets Pro';
    const supplierGstin = settings?.gstNo || '19BOOPA3821C1Z9';
    const supplierAddress = settings?.address || 'MACHHOL, ALTAPUR, WEST BENGAL 733215';
    const supplierPhone = settings?.phone || '+91 73188 15790';
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

    // 3. Tax Calculations (5% GST for AC rail classes, or standard agency facilitation)
    const totalAmount = Math.max(0, Number(data.amount) || 0);
    const upperClass = String(data.trainClass || '').toUpperCase();
    const isAcClass = ['1A', '2A', '3A', '3E', 'CC', 'EC', 'EV', 'FC'].some(c => upperClass.includes(c));
    const isExempt = !isAcClass && ['SL', 'SLEEPER', '2S'].some(c => upperClass.includes(c));

    let gstRate = 5.0; // 5% default for AC transport / ticketing
    let taxableAmount = totalAmount;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let isInterState = false;

    // Check Inter-State: If client state is provided and not West Bengal
    if (data.clientState && !data.clientState.toLowerCase().includes('west bengal') && !data.clientState.includes('19')) {
        isInterState = true;
    }

    if (!isExempt && totalAmount > 0) {
        taxableAmount = Math.round((totalAmount / (1 + gstRate / 100)) * 100) / 100;
        const totalTax = Math.round((totalAmount - taxableAmount) * 100) / 100;
        if (isInterState) {
            igst = totalTax;
        } else {
            cgst = Math.round((totalTax / 2) * 100) / 100;
            sgst = Math.round((totalTax - cgst) * 100) / 100;
        }
    } else if (isExempt) {
        gstRate = 0;
        taxableAmount = totalAmount;
    }

    const filename = `INV_${data.bookingId}.pdf`;
    const filePath = path.join(invoicesDir, filename);
    const publicUrl = `/uploads/invoices/${filename}`;

    // 4. Generate PDF using PDFKit
    await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 36,
            info: {
                Title: `GST Tax Invoice - ${invoiceNumber}`,
                Author: supplierName,
                Subject: `Booking ${data.bookingId}`,
                Keywords: 'GST Invoice, Indian Railways, Tickets Pro, IRCTC'
            }
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // ── Header Banner ──
        doc.rect(36, 36, 523, 50).fill('#0f172a'); // Dark Navy Header
        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 50, 48);
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('ORIGINAL FOR RECIPIENT · ISSUED UNDER SECTION 31 OF CGST ACT, 2017', 50, 68);

        doc.fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold').text(supplierName, 360, 46, { align: 'right', width: 185 });
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Smart Rail & Travel Intelligence', 360, 64, { align: 'right', width: 185 });

        // ── Supplier & Customer Columns (Boxes) ──
        const topY = 96;
        const colWidth = 256;
        const colHeight = 100;

        // Supplier Box (Left)
        doc.rect(36, topY, colWidth, colHeight).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.rect(36, topY, colWidth, 18).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text('SUPPLIER (ISSUED BY)', 44, topY + 5);

        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(supplierName, 44, topY + 24);
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
            .text(`GSTIN: ${supplierGstin}`, 44, topY + 36)
            .text(`Address: ${supplierAddress}`, 44, topY + 47, { width: 240 })
            .text(`State: ${supplierState}`, 44, topY + 70)
            .text(`Email: ${supplierEmail} | Phone: ${supplierPhone}`, 44, topY + 81);

        // Customer Box (Right)
        const rightX = 303;
        doc.rect(rightX, topY, colWidth, colHeight).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.rect(rightX, topY, colWidth, 18).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text('BILLED TO (RECIPIENT)', rightX + 8, topY + 5);

        const clientName = data.clientCompanyName || data.customerName || 'Valued Passenger';
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(clientName, rightX + 8, topY + 24);
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        if (data.clientGstin) {
            doc.text(`GSTIN: ${data.clientGstin}`, rightX + 8, topY + 36);
        } else {
            doc.text('Type: Unregistered Consumer (B2C)', rightX + 8, topY + 36);
        }
        doc.text(`Mobile: ${data.customerMobile || 'N/A'}`, rightX + 8, topY + 47);
        doc.text(`Email: ${data.customerEmail || 'N/A'}`, rightX + 8, topY + 58);
        doc.text(`Place of Supply: ${data.clientState || 'West Bengal (19)'}`, rightX + 8, topY + 69);
        doc.text(`Reverse Charge Applicable: NO`, rightX + 8, topY + 80);

        // ── Invoice Meta Bar ──
        const metaY = 204;
        doc.rect(36, metaY, 523, 30).fill('#f1f5f9');
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        
        doc.text('Invoice Number:', 44, metaY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(invoiceNumber, 44, metaY + 16);

        doc.fillColor('#475569').font('Helvetica').text('Invoice Date:', 180, metaY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(invoiceDate, 180, metaY + 16);

        doc.fillColor('#475569').font('Helvetica').text('Booking Ref ID:', 310, metaY + 6);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(data.bookingId.slice(0, 16), 310, metaY + 16);

        doc.fillColor('#475569').font('Helvetica').text('Payment Txn / Ref:', 440, metaY + 6);
        doc.fillColor('#0d9488').font('Helvetica-Bold').text(data.paymentId || 'PAID / CONFIRMED', 440, metaY + 16);

        // ── Journey Details Card ──
        const journeyY = 242;
        doc.rect(36, journeyY, 523, 62).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.rect(36, journeyY, 523, 16).fill('#e2e8f0');
        doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold').text('JOURNEY & PASSENGER SPECIFICATIONS', 44, journeyY + 4);

        const journeyDateStr = data.journeyDate 
            ? new Date(data.journeyDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : 'Scheduled Date';

        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text(`Train:`, 44, journeyY + 22).fillColor('#0f172a').font('Helvetica-Bold').text(`${data.trainName || 'Express'} (#${data.trainNo || 'Special'})`, 75, journeyY + 22);
        doc.fillColor('#475569').font('Helvetica').text(`Route:`, 260, journeyY + 22).fillColor('#0f172a').font('Helvetica-Bold').text(`${data.fromStation || 'Origin'} → ${data.toStation || 'Destination'}`, 295, journeyY + 22);
        doc.fillColor('#475569').font('Helvetica').text(`Date:`, 440, journeyY + 22).fillColor('#0f172a').font('Helvetica-Bold').text(journeyDateStr, 465, journeyY + 22);

        doc.fillColor('#475569').font('Helvetica').text(`Class:`, 44, journeyY + 36).fillColor('#0284c7').font('Helvetica-Bold').text(data.trainClass || 'Standard', 75, journeyY + 36);
        doc.fillColor('#475569').font('Helvetica').text(`Status:`, 260, journeyY + 36).fillColor('#16a34a').font('Helvetica-Bold').text('CONFIRMED / ACTIVE', 295, journeyY + 36);

        // Passengers Summary line
        let pSummary = '';
        if (Array.isArray(data.passengerList)) {
            pSummary = data.passengerList.map(p => `${p.name} (${p.age || 'Adult'}/${p.gender || 'M'})`).join(', ');
        } else if (typeof data.passengerList === 'string') {
            pSummary = data.passengerList;
        } else {
            pSummary = `${data.passengers || 1} Passenger(s)`;
        }
        doc.fillColor('#475569').font('Helvetica').text(`Passengers:`, 44, journeyY + 49).fillColor('#0f172a').font('Helvetica').text(pSummary.slice(0, 110), 100, journeyY + 49, { width: 440 });

        // ── Itemized GST Table ──
        const tableY = 314;
        const thHeight = 20;

        // Table Header
        doc.rect(36, tableY, 523, thHeight).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('S.No', 42, tableY + 6);
        doc.text('Description of Service', 68, tableY + 6);
        doc.text('SAC', 240, tableY + 6);
        doc.text('Qty', 280, tableY + 6);
        doc.text('Taxable (₹)', 315, tableY + 6);
        if (isInterState) {
            doc.text(`IGST (${gstRate}%)`, 385, tableY + 6);
        } else {
            doc.text(`CGST (${gstRate/2}%)`, 375, tableY + 6);
            doc.text(`SGST (${gstRate/2}%)`, 435, tableY + 6);
        }
        doc.text('Total (₹)', 495, tableY + 6);

        // Table Row 1
        const r1Y = tableY + thHeight;
        const rowHeight = 32;
        doc.rect(36, r1Y, 523, rowHeight).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        
        doc.text('1', 44, r1Y + 8);
        doc.font('Helvetica-Bold').text(`Passenger Transport by Rail (Train ${data.trainNo || ''})`, 68, r1Y + 8)
           .font('Helvetica').fillColor('#64748b').text('Online ticket booking and reservation facilitation', 68, r1Y + 18);
        doc.fillColor('#334155').text('996411', 240, r1Y + 12);
        doc.text(String(data.passengers || 1), 285, r1Y + 12);
        doc.text(`₹${taxableAmount.toFixed(2)}`, 315, r1Y + 12);

        if (isInterState) {
            doc.text(`₹${igst.toFixed(2)}`, 390, r1Y + 12);
        } else {
            doc.text(`₹${cgst.toFixed(2)}`, 375, r1Y + 12);
            doc.text(`₹${sgst.toFixed(2)}`, 435, r1Y + 12);
        }
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(`₹${totalAmount.toFixed(2)}`, 495, r1Y + 12);

        // ── Summary Totals Box ──
        const sumY = r1Y + rowHeight + 12;
        const boxW = 220;
        const boxX = 339;
        doc.rect(boxX, sumY, boxW, 80).strokeColor('#cbd5e1').lineWidth(1).stroke();

        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text('Taxable Amount:', boxX + 12, sumY + 8);
        doc.fillColor('#0f172a').text(`₹${taxableAmount.toFixed(2)}`, boxX + 130, sumY + 8, { align: 'right', width: 75 });

        if (isInterState) {
            doc.fillColor('#475569').text(`Integrated GST (IGST ${gstRate}%):`, boxX + 12, sumY + 22);
            doc.fillColor('#0f172a').text(`₹${igst.toFixed(2)}`, boxX + 130, sumY + 22, { align: 'right', width: 75 });
        } else {
            doc.fillColor('#475569').text(`Central GST (CGST ${gstRate/2}%):`, boxX + 12, sumY + 20);
            doc.fillColor('#0f172a').text(`₹${cgst.toFixed(2)}`, boxX + 130, sumY + 20, { align: 'right', width: 75 });

            doc.fillColor('#475569').text(`State GST (SGST ${gstRate/2}%):`, boxX + 12, sumY + 33);
            doc.fillColor('#0f172a').text(`₹${sgst.toFixed(2)}`, boxX + 130, sumY + 33, { align: 'right', width: 75 });
        }

        doc.rect(boxX, sumY + 48, boxW, 1).strokeColor('#e2e8f0').stroke();
        doc.rect(boxX, sumY + 49, boxW, 31).fill('#f8fafc');
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('Total (INR):', boxX + 12, sumY + 59);
        doc.fillColor('#0284c7').fontSize(11).text(`₹${totalAmount.toFixed(2)}`, boxX + 110, sumY + 58, { align: 'right', width: 95 });

        // Amount in Words (Left side of summary)
        doc.rect(36, sumY, 290, 80).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('TOTAL AMOUNT IN WORDS', 44, sumY + 8);
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(numberToWordsINR(totalAmount), 44, sumY + 22, { width: 270 });
        doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Payment Gateway Status: CAPTURED & SETTLED', 44, sumY + 58);

        // ── Declarations & Bank Signatory ──
        const decY = sumY + 95;
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('Terms & Declarations:', 36, decY);
        doc.fillColor('#64748b').fontSize(6.5).font('Helvetica')
            .text('1. We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.', 36, decY + 12)
            .text('2. Passenger transportation is governed under the Indian Railways Act, 1989 and IRCTC booking guidelines.', 36, decY + 22)
            .text('3. This is a computer generated invoice and does not require a physical signature.', 36, decY + 32);

        // Stamp / Signatory Box (Right)
        doc.rect(390, decY, 169, 52).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(`For ${supplierName}`, 398, decY + 6);
        doc.fillColor('#0284c7').fontSize(8).font('Helvetica-Bold').text('Tickets Pro Desk', 398, decY + 24);
        doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Authorized Signatory', 398, decY + 38);

        // ── Footer ──
        doc.rect(36, 780, 523, 0.5).strokeColor('#cbd5e1').stroke();
        doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Tickets Pro · Official Railway Intelligence Platform · www.ticketspro.in · Contact: support@ticketspro.in', 36, 786, { align: 'center', width: 523 });

        doc.end();

        stream.on('finish', () => resolve());
        stream.on('error', (err) => reject(err));
    });

    const pdfBuffer = fs.readFileSync(filePath);

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
