import nodemailer from 'nodemailer';
import axios from 'axios';
import { prisma } from '../prisma';

// Configurable SMTP transporter (Zoho defaults)
const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_MAIL_HOST || 'smtp.zoho.in',
    port: parseInt(process.env.ZOHO_MAIL_PORT || '465'),
    secure: process.env.ZOHO_MAIL_SECURE !== 'false', // default to true (for 465)
    auth: {
        user: process.env.ZOHO_MAIL_USER || 'noreply@ticketspro.in',
        pass: process.env.ZOHO_MAIL_PASSWORD || '',
    },
    connectionTimeout: 20000, // Increased to 20s to prevent hanging on high latency
    greetingTimeout: 20000,
    socketTimeout: 20000,
});

const FROM = `"Tickets Pro" <${process.env.ZOHO_MAIL_USER || 'noreply@ticketspro.in'}>`;

// ─── Infozy SMS Utility ────────────────────────────────────────────────────────
/**
 * Generic SMS sender using Infozy SMS API
 */
export const sendSMS = async (mobile: string, templateId: string, params: Record<string, string>, dltTemplateId?: string) => {
    const apiKey = process.env.INFOZY_API_KEY || process.env.MSG91_AUTH_KEY;
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

        const response = await axios.post('https://infozysms.in/api/sms/send', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.message === 'Message sent successfully') {
            console.log(`✅ SMS successfully triggered for ${cleanMobile} via Infozy template ${templateId}. Campaign ID: ${response.data.campaignId}`);
        } else {
            console.log(`✅ SMS successfully triggered for ${cleanMobile} via Infozy template ${templateId}:`, response.data);
        }
    } catch (error: any) {
        console.error('❌ Infozy SMS API Error:', error?.response?.data || error.message);
    }
};

// ─── Msg91 WhatsApp Utility ──────────────────────────────────────────────────
/**
 * Generic WhatsApp sender using Msg91 Flow API
 */
export const sendWhatsApp = async (mobile: string, templateId: string, params: Record<string, string>) => {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        console.warn('⚠️ Msg91 Auth Key not found. WhatsApp skipped.');
        return;
    }

    try {
        // Msg91 expects mobile with country code without +
        let cleanMobile = mobile.replace(/\D/g, ''); 
        if (cleanMobile.length === 10) {
            cleanMobile = '91' + cleanMobile;
        }
        
        const response = await axios.post('https://api.msg91.com/api/v5/flow/', {
            template_id: templateId,
            short_url: '1',
            recipients: [
                {
                    mobiles: cleanMobile,
                    ...params
                }
            ]
        }, {
            headers: {
                'authkey': authKey,
                'content-type': 'application/json'
            }
        });

        if (response.data?.type === 'success') {
            console.log(`✅ WhatsApp successfully triggered for ${cleanMobile} via template ${templateId}`);
        } else {
            console.warn(`⚠️ WhatsApp trigger failed for ${cleanMobile}:`, response.data);
        }
    } catch (error: any) {
        console.error('❌ Msg91 WhatsApp API Error:', error?.response?.data || error.message);
    }
};

// ─── Booking Confirmed ────────────────────────────────────────────────────────
export const notifyBookingConfirmed = async (email: string, eventName: string, mobile?: string) => {
    let additionalDetailsHTML = '';
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const latestBooking = await prisma.booking.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                include: { event: true }
            });
            if (latestBooking) {
                let amountStr = '';
                if (latestBooking.paymentId) {
                    const payment = await prisma.paymentRecord.findUnique({ where: { paymentId: latestBooking.paymentId } });
                    if (payment) {
                        amountStr = `<p style="color:#f1f5f9;font-size:14px;font-weight:500;margin:12px 0 0;line-height:1.6;border-top:1px solid #334155;padding-top:12px;"><strong>Payment Status:</strong> Confirmed (₹${payment.amount})<br><strong>Transaction ID:</strong> ${payment.paymentId}</p>`;
                    }
                }

                additionalDetailsHTML = `
                <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
                  <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Additional Details</p>
                  <p style="color:#f1f5f9;font-size:14px;font-weight:500;margin:0;line-height:1.6;">${latestBooking.event.description}</p>
                  ${amountStr}
                </div>`;
            }
        }
    } catch (dbErr) {
        console.error('Error fetching additional booking details for email:', dbErr);
    }

    const htmlContent = `
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
            ${additionalDetailsHTML}
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
</html>`;

    // 1. Send Email (non-blocking Promise)
    if (process.env.RESEND_API_KEY) {
        // Use Resend HTTP API to bypass Render SMTP block
        axios.post('https://api.resend.com/emails', {
            from: FROM,
            to: email,
            subject: '✅ Booking Confirmed — Tickets Pro',
            html: htmlContent
        }, {
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
        }).then(() => {
            console.log(`✅ Booking confirmation email sent to ${email} via Resend API`);
        }).catch((e: any) => {
            console.error('❌ Resend Email API failed:', e?.response?.data || e.message);
        });
    } else {
        // Fallback to Zoho SMTP
        transporter.sendMail({
            from: FROM,
            to: email,
            subject: '✅ Booking Confirmed — Tickets Pro',
            html: htmlContent,
        })
        .then(() => {
            console.log(`✅ Booking confirmation email sent to ${email} via SMTP`);
        })
        .catch((e: any) => {
            console.error('❌ SMTP Email send failed (non-fatal):', e?.message || e);
        });
    }

    // 2. Send SMS via Infozy
    try {
        const template = process.env.INFOZY_TEMPLATE_ID_CONFIRMED || process.env.MSG91_TEMPLATE_ID_CONFIRMED;
        if (mobile && template) {
            await sendSMS(
                mobile, 
                template, 
                {
                    event_name: eventName,
                    status: 'Confirmed'
                }
            );
        }
    } catch (e: any) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }
};

// ─── Booking Cancelled ────────────────────────────────────────────────────────
export const notifyBookingCancelled = async (email: string, reason: string, mobile?: string) => {
    const htmlContent = `
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
</html>`;

    // 1. Send Email (non-blocking Promise)
    if (process.env.RESEND_API_KEY) {
        // Use Resend HTTP API to bypass Render SMTP block
        axios.post('https://api.resend.com/emails', {
            from: FROM,
            to: email,
            subject: '❌ Booking Cancelled — Tickets Pro',
            html: htmlContent
        }, {
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
        }).then(() => {
            console.log(`✅ Cancellation email sent to ${email} via Resend API`);
        }).catch((e: any) => {
            console.error('❌ Resend Email API failed:', e?.response?.data || e.message);
        });
    } else {
        transporter.sendMail({
            from: FROM,
            to: email,
            subject: '❌ Booking Cancelled — Tickets Pro',
            html: htmlContent,
        })
        .then(() => {
            console.log(`✅ Cancellation email sent to ${email} via SMTP`);
        })
        .catch((e: any) => {
            console.error('❌ SMTP Email send failed (non-fatal):', e?.message || e);
        });
    }

    // 2. Send SMS via Infozy
    try {
        const template = process.env.INFOZY_TEMPLATE_ID_CANCELLED || process.env.MSG91_TEMPLATE_ID_CANCELLED;
        if (mobile && template) {
            await sendSMS(
                mobile, 
                template, 
                {
                    reason: reason || 'Cancelled per request'
                }
            );
        }
    } catch (e: any) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }
};

// ─── Payment Received (Initial Receipt) ───────────────────────────────────────
export const notifyPaymentReceived = async (mobile: string, amount: number, orderId: string) => {
    // 1. Send SMS via Infozy
    try {
        const template = process.env.INFOZY_TEMPLATE_ID_PAYMENT || process.env.MSG91_TEMPLATE_ID_PAYMENT;
        if (mobile && template) {
            await sendSMS(
                mobile, 
                template, 
                {
                    amount: amount.toString(),
                    order_id: orderId
                }
            );
        }
    } catch (e: any) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }

    /*
    // 2. WhatsApp - Removed per request for API-less operation
    if (mobile && process.env.MSG91_WHATSAPP_TEMPLATE_ID_PAYMENT) {
        await sendWhatsApp(mobile, process.env.MSG91_WHATSAPP_TEMPLATE_ID_PAYMENT, {
            amount: amount.toString(),
            order_id: orderId
        });
    }
    */
};
