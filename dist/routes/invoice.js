"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const invoiceService_1 = require("../services/invoiceService");
const notificationService_1 = require("../services/notificationService");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
/**
 * Helper to extract fare amount from event description or payment records
 */
async function getBookingAmount(booking) {
    // 1. Try finding in payment records
    if (booking.paymentId) {
        const payment = await prisma_1.prisma.paymentRecord.findFirst({
            where: { paymentId: booking.paymentId }
        });
        if (payment && payment.amount) {
            return payment.amount;
        }
    }
    // 2. Try parsing from event description (e.g. Amount: ₹1500 or Amount: Rs. 1500)
    if (booking.event?.description) {
        const amtMatch = booking.event.description.match(/Amount:\s*(?:₹|Rs\.?)?\s*([\d.]+)/i);
        if (amtMatch && amtMatch[1]) {
            const parsed = parseFloat(amtMatch[1]);
            if (!isNaN(parsed) && parsed > 0)
                return parsed;
        }
    }
    return 0;
}
/**
 * Helper to parse train details from event
 */
function parseTrainDetails(event) {
    let trainNo = 'Special';
    let trainName = 'Express';
    let fromStation = 'Origin';
    let toStation = 'Destination';
    if (event?.name) {
        const noMatch = event.name.match(/\(([^)]+)\)/);
        if (noMatch)
            trainNo = noMatch[1];
        const namePart = event.name.split('(')[0]?.trim();
        if (namePart)
            trainName = namePart;
        const routeMatch = event.name.match(/-\s*([A-Za-z0-9]+)\s+(?:to|→|->)\s+([A-Za-z0-9]+)/i);
        if (routeMatch) {
            fromStation = routeMatch[1].toUpperCase();
            toStation = routeMatch[2].toUpperCase();
        }
    }
    if (event?.description) {
        const routeDescMatch = event.description.match(/Route:\s*([A-Za-z0-9]+)\s*(?:→|->|to)\s*([A-Za-z0-9]+)/i);
        if (routeDescMatch) {
            fromStation = routeDescMatch[1].toUpperCase();
            toStation = routeDescMatch[2].toUpperCase();
        }
        const trainMatch = event.description.match(/Train:\s*([A-Za-z0-9]+)/i);
        if (trainMatch)
            trainNo = trainMatch[1];
    }
    return { trainNo, trainName, fromStation, toStation };
}
/**
 * Helper to extract customer details (mobile, name, passenger list)
 */
function extractCustomerDetails(booking) {
    let customerMobile = booking.user?.mobile || '';
    let customerName = booking.user?.name || '';
    let passengerList = 'Passengers';
    const desc = booking.event?.description || '';
    // Extract mobile from description if user mobile is missing
    if (!customerMobile && desc) {
        const mobMatch = desc.match(/Mobile:\s*([+0-9\s-]+)/i);
        if (mobMatch && mobMatch[1]) {
            customerMobile = mobMatch[1].replace(/\D/g, '').slice(-10);
        }
    }
    // Extract passengers
    const pMatch = desc.match(/Passengers:\s*([^.]+)/i);
    if (pMatch && pMatch[1]) {
        passengerList = pMatch[1].trim();
        // If customer name is missing or is admin/generic, use the first passenger's name
        const firstPassenger = passengerList.split(/[;,]/)[0]?.split('(')[0]?.trim();
        if ((!customerName || customerName.toLowerCase().includes('admin') || customerName.toLowerCase().includes('system')) && firstPassenger) {
            customerName = firstPassenger;
        }
    }
    return {
        customerMobile: customerMobile || undefined,
        customerName: customerName || undefined,
        passengerList
    };
}
/**
 * GET /api/invoices/:bookingId
 * Returns invoice JSON or streams PDF if ?download=true or ?view=true
 */
router.get('/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                event: true,
                user: { select: { email: true, mobile: true, name: true, role: true } }
            }
        });
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        const amount = await getBookingAmount(booking);
        const { trainNo, trainName, fromStation, toStation } = parseTrainDetails(booking.event);
        const { customerMobile, customerName, passengerList } = extractCustomerDetails(booking);
        const invoice = await (0, invoiceService_1.generateGSTInvoice)({
            bookingId: booking.id,
            amount,
            trainNo,
            trainName,
            fromStation,
            toStation,
            journeyDate: booking.event?.date,
            trainClass: booking.class || 'Standard',
            passengerList,
            paymentId: booking.paymentId || 'CONFIRMED',
            customerName: req.query.company || customerName,
            customerEmail: booking.user?.email,
            customerMobile,
            clientGstin: req.query.gstin || undefined,
            clientCompanyName: req.query.company || undefined,
            clientState: req.query.state || undefined
        });
        // If requested as direct file stream
        if (req.query.download === 'true' || req.query.view === 'true') {
            const isDownload = req.query.download === 'true';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${invoice.invoiceNumber}.pdf"`);
            return res.sendFile(path_1.default.resolve(invoice.pdfPath));
        }
        return res.json({
            success: true,
            invoice: {
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate,
                pdfUrl: invoice.pdfUrl,
                taxableAmount: invoice.taxableAmount,
                gstRate: invoice.gstRate,
                cgst: invoice.cgst,
                sgst: invoice.sgst,
                igst: invoice.igst,
                totalAmount: invoice.totalAmount,
                isInterState: invoice.isInterState
            }
        });
    }
    catch (error) {
        console.error('[Invoice API Error]:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to generate invoice' });
    }
});
/**
 * POST /api/invoices/:bookingId/send
 * Dispatches the GST Invoice to the client via WhatsApp and Email
 */
router.post('/:bookingId/send', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { email: customEmail, mobile: customMobile, clientGstin, clientCompanyName, clientState } = req.body;
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                event: true,
                user: { select: { email: true, mobile: true, name: true, role: true } }
            }
        });
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        const amount = await getBookingAmount(booking);
        const { trainNo, trainName, fromStation, toStation } = parseTrainDetails(booking.event);
        const extracted = extractCustomerDetails(booking);
        const targetEmail = customEmail || booking.user?.email;
        const targetMobile = customMobile || extracted.customerMobile || booking.user?.mobile;
        const clientName = clientCompanyName || extracted.customerName;
        const invoice = await (0, invoiceService_1.generateGSTInvoice)({
            bookingId: booking.id,
            amount,
            trainNo,
            trainName,
            fromStation,
            toStation,
            journeyDate: booking.event?.date,
            trainClass: booking.class || 'Standard',
            passengerList: extracted.passengerList,
            paymentId: booking.paymentId || 'CONFIRMED',
            customerName: clientName,
            customerEmail: targetEmail,
            customerMobile: targetMobile || undefined,
            clientGstin,
            clientCompanyName,
            clientState
        });
        // Direct download URL pointing to the live API
        const directDownloadUrl = `https://rail-planner-api.onrender.com/api/invoices/${booking.id}?download=true`;
        // 1. Send via WhatsApp
        if (targetMobile) {
            const cleanDigits = targetMobile.replace(/\D/g, '').slice(-10);
            const waTaxLine = invoice.isInterState
                ? `*IGST (${invoice.gstRate}%):* Rs. ${(0, invoiceService_1.formatINR)(invoice.igst)}`
                : `*CGST (${(invoice.gstRate / 2).toFixed(1)}%):* Rs. ${(0, invoiceService_1.formatINR)(invoice.cgst)}\n*SGST (${(invoice.gstRate / 2).toFixed(1)}%):* Rs. ${(0, invoiceService_1.formatINR)(invoice.sgst)}`;
            const waText = `🧾 *Tickets Pro — Official GST Tax Invoice*

Dear Valued Customer,
Here is your official GST tax invoice for your train ticket booking:

📋 *Invoice No:* ${invoice.invoiceNumber}
📅 *Date:* ${invoice.invoiceDate}
🚆 *Train:* ${trainName} (${trainNo})
📍 *Route:* ${fromStation} to ${toStation}
💰 *Taxable Fare:* Rs. ${(0, invoiceService_1.formatINR)(invoice.taxableAmount)}
${waTaxLine}
💵 *Total Paid:* Rs. ${(0, invoiceService_1.formatINR)(invoice.totalAmount)}

📄 *Download Official GST Tax Invoice (PDF):*
${directDownloadUrl}

_This is a computer-generated tax invoice issued under Section 31 of CGST Act, 2017._
*Tickets Pro Desk* | https://ticketspro.in`;
            await (0, notificationService_1.sendWhatsApp)(cleanDigits, waText);
        }
        // 2. Send via Email (with attached PDF & HTML summary)
        if (targetEmail && process.env.RESEND_API_KEY) {
            try {
                const FROM = `"Tickets Pro" <noreply@ticketspro.in>`;
                const taxRowHtml = invoice.isInterState
                    ? `<tr><td style="color:#94a3b8;padding:6px 0;">IGST (${invoice.gstRate}%)</td><td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoice.igst)}</td></tr>`
                    : `<tr><td style="color:#94a3b8;padding:6px 0;">CGST (${(invoice.gstRate / 2).toFixed(1)}%)</td><td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoice.cgst)}</td></tr>
                       <tr><td style="color:#94a3b8;padding:6px 0;">SGST (${(invoice.gstRate / 2).toFixed(1)}%)</td><td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoice.sgst)}</td></tr>`;
                const emailHtml = `
                <!DOCTYPE html>
                <html>
                <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
                        <tr>
                          <td style="background:linear-gradient(135deg,#0d9488,#0ea5e9);padding:28px;text-align:center;">
                            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">GST Tax Invoice</h1>
                            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${invoice.invoiceNumber} | Tickets Pro</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:28px;">
                            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:20px;">
                              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 6px;">Journey</p>
                              <p style="color:#f1f5f9;font-size:16px;font-weight:800;margin:0;">${trainName} (${trainNo})</p>
                              <p style="color:#38bdf8;font-size:13px;font-weight:600;margin:4px 0 0;">${fromStation} to ${toStation}</p>
                            </div>

                            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px;">
                              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 12px;">Tax Breakdown (SAC: 996411)</p>
                              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                                <tr>
                                  <td style="color:#94a3b8;padding:6px 0;">Taxable Amount</td>
                                  <td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoice.taxableAmount)}</td>
                                </tr>
                                ${taxRowHtml}
                                <tr style="border-top:1px solid #334155;">
                                  <td style="color:#fff;font-weight:800;padding:10px 0 0;">Total Amount Paid</td>
                                  <td align="right" style="color:#10b981;font-size:16px;font-weight:800;padding:10px 0 0;">Rs. ${(0, invoiceService_1.formatINR)(invoice.totalAmount)}</td>
                                </tr>
                              </table>
                            </div>

                            <div style="text-align:center;margin-bottom:12px;">
                              <a href="${directDownloadUrl}" style="background:linear-gradient(135deg,#0d9488,#0ea5e9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">
                                Download Official GST Invoice (PDF)
                              </a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 28px;border-top:1px solid #1e293b;text-align:center;">
                            <p style="color:#475569;font-size:11px;margin:0;">(c) 2026 Tickets Pro | GSTIN: 19BOOPA3821C1Z9 | ticketspro.in</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>`;
                await axios_1.default.post('https://api.resend.com/emails', {
                    from: FROM,
                    to: targetEmail,
                    subject: `GST Tax Invoice — ${invoice.invoiceNumber} | Tickets Pro`,
                    html: emailHtml,
                    attachments: [
                        {
                            filename: `TicketsPro_${invoice.invoiceNumber}.pdf`,
                            content: invoice.pdfBuffer.toString('base64')
                        }
                    ]
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            catch (emailErr) {
                console.error('[Invoice Email Error]:', emailErr?.response?.data || emailErr.message);
            }
        }
        return res.json({
            success: true,
            message: 'GST Invoice dispatched successfully via WhatsApp and Email.',
            invoiceNumber: invoice.invoiceNumber,
            pdfUrl: invoice.pdfUrl,
            downloadUrl: directDownloadUrl
        });
    }
    catch (error) {
        console.error('[Invoice Send Error]:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch invoice' });
    }
});
exports.default = router;
