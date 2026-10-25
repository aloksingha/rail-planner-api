"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyPaymentReceived = exports.notifyBookingCancelled = exports.notifyBookingConfirmed = exports.sendSMS = exports.sendWhatsApp = void 0;
const axios_1 = __importDefault(require("axios"));
// ─── Resend SMTP Configuration ──────────────────────────────────────────────────
const isEmailConfigured = !!process.env.RESEND_API_KEY;
const transporter = {
    sendMail: async (options) => {
        return axios_1.default.post('https://api.resend.com/emails', {
            from: options.from,
            to: options.to,
            subject: options.subject,
            html: options.html
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    }
};
const FROM = `"Tickets Pro" <noreply@ticketspro.in>`;
// ─── WhatsGateway WhatsApp Utility ─────────────────────────────────────────────
/**
 * Generic WhatsApp message sender using WhatsGateway REST API
 */
const sendWhatsApp = async (mobile, text) => {
    const gatewayUrl = (process.env.WHATS_GATEWAY_URL || 'https://whats-gateway-f8x4.onrender.com').replace(/\/+$/, '');
    const apiKey = process.env.WHATS_GATEWAY_API_KEY || 'wag_a2MbxmoHVXu4wX8pNLlSzjDz_a_DIuIW';
    const sessionId = process.env.WHATS_GATEWAY_SESSION_ID || '1ootlb';
    if (!mobile || !text) {
        return;
    }
    try {
        let cleanMobile = mobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) {
            cleanMobile = '91' + cleanMobile;
        }
        const jid = `${cleanMobile}@s.whatsapp.net`;
        const url = `${gatewayUrl}/api/messages/${sessionId}/${encodeURIComponent(jid)}/send`;
        const response = await axios_1.default.post(url, {
            message: { text }
        }, {
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        if (response.data?.status) {
            console.log(`✅ WhatsApp successfully delivered to ${cleanMobile} via WhatsGateway (session: ${sessionId})`);
        }
        else {
            console.warn(`⚠️ WhatsApp gateway response for ${cleanMobile}:`, response.data);
        }
    }
    catch (error) {
        console.error('❌ WhatsGateway API Error:', error?.response?.data || error.message);
    }
};
exports.sendWhatsApp = sendWhatsApp;
// ─── Infozy SMS Utility ────────────────────────────────────────────────────────
/**
 * Generic SMS sender using Infozy SMS API
 */
const sendSMS = async (mobile, templateId, params, dltTemplateId) => {
    const apiKey = process.env.INFOZY_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ Infozy API Key not found. SMS skipped.');
        return;
    }
    try {
        let cleanMobile = mobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) {
            cleanMobile = '91' + cleanMobile;
        }
        const payload = {
            template: templateId,
            mobileNumber: cleanMobile,
            variables: params
        };
        const response = await axios_1.default.post('https://infozysms.in/api/sms/send', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.data && response.data.message === 'Message sent successfully') {
            console.log(`✅ SMS successfully triggered for ${cleanMobile} via Infozy template ${templateId}. Campaign ID: ${response.data.campaignId}`);
        }
        else {
            console.log(`✅ SMS successfully triggered for ${cleanMobile} via Infozy template ${templateId}:`, response.data);
        }
    }
    catch (error) {
        console.error('❌ Infozy SMS API Error:', error?.response?.data || error.message);
    }
};
exports.sendSMS = sendSMS;
// ─── Booking Confirmed ────────────────────────────────────────────────────────
const notifyBookingConfirmed = async (email, eventName, mobile, details) => {
    // 1. Send Email via Resend
    if (isEmailConfigured) {
        const journeyDateHtml = details?.journeyDate ? `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Journey Date</p>
              <p style="color:#f1f5f9;font-size:16px;font-weight:700;margin:0;">${details.journeyDate}</p>
            </div>
        ` : '';
        const passengerHtml = details?.passengerDetails ? `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Passenger Details</p>
              <p style="color:#0ea5e9;font-size:14px;font-weight:600;margin:0;line-height:1.6;">${details.passengerDetails}</p>
            </div>
        ` : '';
        const paymentHtml = details?.transactionId ? `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Payment Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#94a3b8;font-size:14px;padding-bottom:8px;">Status</td>
                  <td align="right" style="color:#10b981;font-size:14px;font-weight:700;padding-bottom:8px;">Confirmed (₹${details.amount || '0'})</td>
                </tr>
                <tr>
                  <td style="color:#94a3b8;font-size:14px;">Transaction ID</td>
                  <td align="right" style="color:#f1f5f9;font-size:14px;font-weight:600;">${details.transactionId}</td>
                </tr>
              </table>
            </div>
        ` : '';
        transporter.sendMail({
            from: FROM,
            to: email,
            subject: '✅ Booking Confirmed — Tickets Pro',
            html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#0d9488,#0ea5e9);padding:32px;text-align:center;">
                <div style="font-size:32px;">🎫</div>
                <h1 style="color:#fff;margin:8px 0 0;font-size:24px;font-weight:900;letter-spacing:-0.5px;">Booking Confirmed!</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Your train ticket is booked successfully.</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
                  <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Journey Details</p>
                  <p style="color:#f1f5f9;font-size:18px;font-weight:800;margin:0;">${eventName}</p>
                </div>
                
                ${journeyDateHtml}
                ${passengerHtml}
                ${paymentHtml}

                <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
                  Your booking has been confirmed and payment processed successfully. 
                  Please carry a valid photo ID during your journey.
                </p>
                <div style="text-align:center;">
                  <a href="https://ticketspro.in/bookings" style="background:linear-gradient(135deg,#0d9488,#0ea5e9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
                    View My Bookings →
                  </a>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
                <p style="color:#475569;font-size:12px;margin:0;">© 2026 Tickets Pro · <a href="https://ticketspro.in" style="color:#0ea5e9;text-decoration:none;">ticketspro.in</a></p>
                <p style="color:#334155;font-size:11px;margin:6px 0 0;">This is an automated email. Please do not reply.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`,
        })
            .then(() => {
            console.log(`✅ Booking confirmation email sent to ${email}`);
        })
            .catch((e) => {
            console.error('❌ Email send failed (non-fatal):', e?.message || e);
        });
    }
    // 2. Send SMS via Infozy
    try {
        const template = process.env.INFOZY_TEMPLATE_ID_CONFIRMED;
        if (mobile && template) {
            await (0, exports.sendSMS)(mobile, template, {
                event_name: eventName,
                status: 'Confirmed'
            });
        }
    }
    catch (e) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }
    // 3. Send WhatsApp via WhatsGateway
    try {
        if (mobile) {
            const waMessage = `🎫 *Tickets Pro — Booking Confirmed!*

Dear Passenger,
Your train ticket has been booked successfully!

🚆 *Journey:* ${eventName}
${details?.journeyDate ? `📅 *Date:* ${details.journeyDate}\n` : ''}${details?.passengerDetails ? `👥 *Passengers:* ${details.passengerDetails}\n` : ''}${details?.amount ? `💰 *Total Fare:* ₹${details.amount}\n` : ''}${details?.transactionId ? `💳 *Txn ID:* ${details.transactionId}\n` : ''}
📲 *View & Download E-Ticket:*
https://ticketspro.in/bookings

Please carry a valid government-issued photo ID during travel.

Thank you for booking with *Tickets Pro*!
Support: https://ticketspro.in`;
            await (0, exports.sendWhatsApp)(mobile, waMessage);
        }
    }
    catch (e) {
        console.error('❌ WhatsApp send failed (non-fatal):', e?.message || e);
    }
};
exports.notifyBookingConfirmed = notifyBookingConfirmed;
// ─── Booking Cancelled ────────────────────────────────────────────────────────
const notifyBookingCancelled = async (email, reason, mobile) => {
    // 1. Email via Resend
    if (isEmailConfigured) {
        transporter.sendMail({
            from: FROM,
            to: email,
            subject: '❌ Booking Cancelled — Tickets Pro',
            html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;border:1px solid #3f1515;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px;text-align:center;">
                <div style="font-size:32px;">🚫</div>
                <h1 style="color:#fff;margin:8px 0 0;font-size:24px;font-weight:900;">Booking Cancelled</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Your booking has been cancelled.</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
                  <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Reason</p>
                  <p style="color:#f1f5f9;font-size:16px;font-weight:600;margin:0;">${reason || 'Cancelled by admin or user request.'}</p>
                </div>
                <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
                  If you believe this is an error or need further assistance, please contact our support team.
                </p>
                <div style="text-align:center;">
                  <a href="https://ticketspro.in" style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
                    Return to Tickets Pro →
                  </a>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
                <p style="color:#475569;font-size:12px;margin:0;">© 2026 Tickets Pro · <a href="https://ticketspro.in" style="color:#0ea5e9;text-decoration:none;">ticketspro.in</a></p>
                <p style="color:#334155;font-size:11px;margin:6px 0 0;">This is an automated email. Please do not reply.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`,
        })
            .then(() => {
            console.log(`✅ Cancellation email sent to ${email}`);
        })
            .catch((e) => {
            console.error('❌ Email send failed (non-fatal):', e?.message || e);
        });
    }
    // 2. Send SMS via Infozy
    try {
        const template = process.env.INFOZY_TEMPLATE_ID_CANCELLED;
        if (mobile && template) {
            await (0, exports.sendSMS)(mobile, template, {
                reason: reason || 'Cancelled per request'
            });
        }
    }
    catch (e) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }
    // 3. Send WhatsApp via WhatsGateway
    try {
        if (mobile) {
            const waMessage = `🚫 *Tickets Pro — Booking Cancellation*

Dear Customer,
Your booking has been cancelled.

*Reason:* ${reason || 'Cancelled per customer or admin request.'}

If a refund is applicable, it will be initiated to your original payment source or wallet in accordance with IRCTC refund rules.

For assistance, please visit https://ticketspro.in or reply to this chat.`;
            await (0, exports.sendWhatsApp)(mobile, waMessage);
        }
    }
    catch (e) {
        console.error('❌ WhatsApp send failed (non-fatal):', e?.message || e);
    }
};
exports.notifyBookingCancelled = notifyBookingCancelled;
// ─── Payment Received (Initial Receipt) ───────────────────────────────────────
const notifyPaymentReceived = async (mobile, amount, orderId) => {
    // 1. Send SMS via Infozy
    try {
        const template = process.env.INFOZY_TEMPLATE_ID_PAYMENT;
        if (mobile && template) {
            await (0, exports.sendSMS)(mobile, template, {
                amount: amount.toString(),
                order_id: orderId
            });
        }
    }
    catch (e) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }
    // 2. Send WhatsApp via WhatsGateway
    try {
        if (mobile) {
            const waMessage = `💳 *Tickets Pro — Payment Received*

We have received your payment of *₹${amount.toLocaleString('en-IN')}* for Order *#${orderId}*.

Your ticket booking is currently being processed by our system. You will receive your confirmed E-Ticket details shortly.

Check status: https://ticketspro.in/bookings`;
            await (0, exports.sendWhatsApp)(mobile, waMessage);
        }
    }
    catch (e) {
        console.error('❌ WhatsApp send failed (non-fatal):', e?.message || e);
    }
};
exports.notifyPaymentReceived = notifyPaymentReceived;
