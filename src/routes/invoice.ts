import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { generateGSTInvoice } from '../services/invoiceService';
import { sendWhatsApp } from '../services/notificationService';
import axios from 'axios';

const router = Router();

/**
 * Helper to extract fare amount from event description or payment records
 */
async function getBookingAmount(booking: any): Promise<number> {
    // 1. Try finding in payment records
    if (booking.paymentId) {
        const payment = await prisma.paymentRecord.findFirst({
            where: { paymentId: booking.paymentId }
        });
        if (payment && payment.amount) {
            return payment.amount;
        }
    }

    // 2. Try parsing from event description (e.g. Amount: ₹1500)
    if (booking.event?.description) {
        const amtMatch = booking.event.description.match(/Amount:\s*₹?([\d.]+)/i);
        if (amtMatch && amtMatch[1]) {
            const parsed = parseFloat(amtMatch[1]);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
    }

    return 0;
}

/**
 * Helper to parse train details from event
 */
function parseTrainDetails(event: any) {
    let trainNo = 'Special';
    let trainName = 'Express';
    let fromStation = 'Origin';
    let toStation = 'Destination';

    if (event?.name) {
        // format: "Express (12301) - NDLS to HWH"
        const noMatch = event.name.match(/\(([^)]+)\)/);
        if (noMatch) trainNo = noMatch[1];
        
        const namePart = event.name.split('(')[0]?.trim();
        if (namePart) trainName = namePart;

        const routeMatch = event.name.match(/-\s*([A-Za-z0-9]+)\s+to\s+([A-Za-z0-9]+)/i);
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
        if (trainMatch) trainNo = trainMatch[1];
    }

    return { trainNo, trainName, fromStation, toStation };
}

/**
 * GET /api/invoices/:bookingId
 * Returns invoice JSON or streams PDF if ?download=true or ?view=true
 */
router.get('/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                event: true,
                user: { select: { email: true, mobile: true, name: true } }
            }
        });

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const amount = await getBookingAmount(booking);
        const { trainNo, trainName, fromStation, toStation } = parseTrainDetails(booking.event);

        // Passengers
        let passengerList = 'Passengers';
        const pMatch = booking.event?.description?.match(/Passengers:\s*([^.]+)/i);
        if (pMatch && pMatch[1]) {
            passengerList = pMatch[1].trim();
        }

        const invoice = await generateGSTInvoice({
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
            customerName: booking.user?.name || undefined,
            customerEmail: booking.user?.email,
            customerMobile: booking.user?.mobile || undefined,
            clientGstin: (req.query.gstin as string) || undefined,
            clientCompanyName: (req.query.company as string) || undefined,
            clientState: (req.query.state as string) || undefined
        });

        // If requested as direct file stream
        if (req.query.download === 'true' || req.query.view === 'true') {
            const isDownload = req.query.download === 'true';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `${isDownload ? 'attachment' : 'inline'}; filename="${invoice.invoiceNumber}.pdf"`
            );
            return res.sendFile(path.resolve(invoice.pdfPath));
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
    } catch (error: any) {
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

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                event: true,
                user: { select: { email: true, mobile: true, name: true } }
            }
        });

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const targetEmail = customEmail || booking.user?.email;
        const targetMobile = customMobile || booking.user?.mobile;
        const amount = await getBookingAmount(booking);
        const { trainNo, trainName, fromStation, toStation } = parseTrainDetails(booking.event);

        let passengerList = 'Passengers';
        const pMatch = booking.event?.description?.match(/Passengers:\s*([^.]+)/i);
        if (pMatch && pMatch[1]) {
            passengerList = pMatch[1].trim();
        }

        const invoice = await generateGSTInvoice({
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
            customerName: booking.user?.name || undefined,
            customerEmail: targetEmail,
            customerMobile: targetMobile || undefined,
            clientGstin,
            clientCompanyName,
            clientState
        });

        const publicInvoiceUrl = `https://ticketspro.in${invoice.pdfUrl}`;

        // 1. Send via WhatsApp
        if (targetMobile) {
            const cleanDigits = targetMobile.replace(/\D/g, '').slice(-10);
            const waTaxLine = invoice.isInterState
                ? `• IGST (${invoice.gstRate}%): ₹${invoice.igst.toFixed(2)}`
                : `• CGST (${invoice.gstRate / 2}%): ₹${invoice.cgst.toFixed(2)}\n• SGST (${invoice.gstRate / 2}%): ₹${invoice.sgst.toFixed(2)}`;

            const waText = 
`🧾 *Tickets Pro — Official GST Tax Invoice*

Dear Valued Customer,
Here is your official GST tax invoice for your train ticket booking:

📋 *Invoice No:* ${invoice.invoiceNumber}
📅 *Date:* ${invoice.invoiceDate}
🚆 *Train:* ${trainName} (${trainNo})
📍 *Route:* ${fromStation} → ${toStation}
💰 *Taxable Fare:* ₹${invoice.taxableAmount.toFixed(2)}
${waTaxLine}
💵 *Total Paid:* ₹${invoice.totalAmount.toFixed(2)}

📄 *Download / View GST PDF Invoice:*
${publicInvoiceUrl}

_This is a computer-generated tax invoice issued in accordance with Section 31 of the CGST Act._
*Tickets Pro Desk* · https://ticketspro.in`;

            await sendWhatsApp(cleanDigits, waText);
        }

        // 2. Send via Email (with attached PDF & HTML summary)
        if (targetEmail && process.env.RESEND_API_KEY) {
            try {
                const FROM = `"Tickets Pro" <noreply@ticketspro.in>`;
                const taxRowHtml = invoice.isInterState
                    ? `<tr><td style="color:#94a3b8;padding:6px 0;">IGST (${invoice.gstRate}%)</td><td align="right" style="color:#f1f5f9;font-weight:600;">₹${invoice.igst.toFixed(2)}</td></tr>`
                    : `<tr><td style="color:#94a3b8;padding:6px 0;">CGST (${invoice.gstRate/2}%)</td><td align="right" style="color:#f1f5f9;font-weight:600;">₹${invoice.cgst.toFixed(2)}</td></tr>
                       <tr><td style="color:#94a3b8;padding:6px 0;">SGST (${invoice.gstRate/2}%)</td><td align="right" style="color:#f1f5f9;font-weight:600;">₹${invoice.sgst.toFixed(2)}</td></tr>`;

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
                            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${invoice.invoiceNumber} · Tickets Pro</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:28px;">
                            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:20px;">
                              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 6px;">Journey</p>
                              <p style="color:#f1f5f9;font-size:16px;font-weight:800;margin:0;">${trainName} (${trainNo})</p>
                              <p style="color:#38bdf8;font-size:13px;font-weight:600;margin:4px 0 0;">${fromStation} → ${toStation}</p>
                            </div>

                            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px;">
                              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 12px;">Tax Breakdown (SAC: 996411)</p>
                              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                                <tr>
                                  <td style="color:#94a3b8;padding:6px 0;">Taxable Amount</td>
                                  <td align="right" style="color:#f1f5f9;font-weight:600;">₹${invoice.taxableAmount.toFixed(2)}</td>
                                </tr>
                                ${taxRowHtml}
                                <tr style="border-top:1px solid #334155;">
                                  <td style="color:#fff;font-weight:800;padding:10px 0 0;">Total Amount Paid</td>
                                  <td align="right" style="color:#10b981;font-size:16px;font-weight:800;padding:10px 0 0;">₹${invoice.totalAmount.toFixed(2)}</td>
                                </tr>
                              </table>
                            </div>

                            <div style="text-align:center;margin-bottom:12px;">
                              <a href="${publicInvoiceUrl}" style="background:linear-gradient(135deg,#0d9488,#0ea5e9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">
                                📄 Download Official GST Invoice (PDF)
                              </a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 28px;border-top:1px solid #1e293b;text-align:center;">
                            <p style="color:#475569;font-size:11px;margin:0;">© 2026 Tickets Pro · GSTIN: 19BOOPA3821C1Z9 · ticketspro.in</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>`;

                await axios.post('https://api.resend.com/emails', {
                    from: FROM,
                    to: targetEmail,
                    subject: `📄 GST Tax Invoice — ${invoice.invoiceNumber}`,
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
            } catch (emailErr: any) {
                console.error('[Invoice Email Error]:', emailErr?.response?.data || emailErr.message);
            }
        }

        return res.json({
            success: true,
            message: 'GST Invoice dispatched successfully via WhatsApp and Email.',
            invoiceNumber: invoice.invoiceNumber,
            pdfUrl: invoice.pdfUrl,
            downloadUrl: publicInvoiceUrl
        });
    } catch (error: any) {
        console.error('[Invoice Send Error]:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch invoice' });
    }
});

export default router;
