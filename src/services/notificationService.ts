import nodemailer from 'nodemailer';
import axios from 'axios';

// Zoho SMTP transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.in',
    port: 465,
    secure: true,
    auth: {
        user: process.env.ZOHO_MAIL_USER || 'noreply@ticketspro.in',
        pass: process.env.ZOHO_MAIL_PASSWORD || '',
    },
});

const FROM = `"Tickets Pro" <${process.env.ZOHO_MAIL_USER || 'noreply@ticketspro.in'}>`;

// ─── Msg91 SMS Utility ────────────────────────────────────────────────────────
/**
 * Generic SMS sender using Msg91 API
 */
export const sendSMS = async (mobile: string, templateId: string, params: Record<string, string>) => {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        console.warn('⚠️ Msg91 Auth Key not found in Environment Variables. SMS skipped.');
        return;
    }

    try {
        // Msg91 expects mobile with country code without +
        let cleanMobile = mobile.replace(/\D/g, ''); 
        // Force Indian country code if missing
        if (cleanMobile.length === 10) {
            cleanMobile = '91' + cleanMobile;
        }
        
        console.log(`[Msg91] Debug: Prepared payload for ${cleanMobile} using template ${templateId}`);

        const response = await axios.post('https://api.msg91.com/api/v5/flow/', {
            template_id: templateId,
            sender: process.env.MSG91_SENDER_ID || 'TKTSPR',
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

        console.log(`[Msg91] API Raw Response:`, JSON.stringify(response.data));

        if (response.data?.type === 'success') {
            console.log(`✅ SMS successfully triggered for ${cleanMobile}`);
        } else {
            console.warn(`⚠️ SMS trigger failed for ${cleanMobile}:`, response.data);
        }
    } catch (error: any) {
        console.error('❌ Msg91 API Error Details:', error?.response?.data || error.message);
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
        const cleanMobile = mobile.replace(/\D/g, ''); 
        
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
            console.log(`✅ WhatsApp successfully triggered for ${mobile} via template ${templateId}`);
        } else {
            console.warn(`⚠️ WhatsApp trigger failed for ${mobile}:`, response.data);
        }
    } catch (error: any) {
        console.error('❌ Msg91 WhatsApp API Error:', error?.response?.data || error.message);
    }
};

// ─── Booking Confirmed ────────────────────────────────────────────────────────
// ─── Booking Confirmed ────────────────────────────────────────────────────────
export const notifyBookingConfirmed = async (email: string, eventName: string, mobile?: string, details?: any) => {
    try {
        if (email) {
            // Data Normalization Helpers
            const jDate = details?.journeyDate || details?.journey_date || details?.date || details?.event?.date || null;
            const tClass = details?.trainClass || details?.class || details?.category || 'N/A';
            const pList = Array.isArray(details?.passengerList) ? details.passengerList : (Array.isArray(details?.passengers) ? details.passengers : []);
            
            // Amount can be in details.amount or passed separately
            const rawAmount = details?.amount || details?.totalAmount || details?.amountPaid || 0;
            const displayAmount = Number(rawAmount).toLocaleString('en-IN');

            const passengerRows = pList.length > 0
                ? pList.map((p: any) => {
                    const name = p.name || p.passengerName || 'Unknown';
                    const age = p.age || p.passengerAge || '?';
                    const gender = (p.gender || p.passengerGender || 'N/A').toUpperCase();
                    const genderLabel = gender.startsWith('M') ? 'Male' : (gender.startsWith('F') ? 'Female' : (gender.startsWith('O') ? 'Other' : 'N/A'));
                    
                    return `
                    <tr>
                        <td style="padding:12px;border-bottom:1px solid #334155;color:#f1f5f9;font-size:14px;font-weight:600;">${name}</td>
                        <td style="padding:12px;border-bottom:1px solid #334155;color:#94a3b8;font-size:13px;text-align:center;">${age}</td>
                        <td style="padding:12px;border-bottom:1px solid #334155;color:#94a3b8;font-size:13px;text-align:center;">${genderLabel}</td>
                    </tr>`;
                }).join('')
                : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;">${details?.passengerCount || 1} Passenger(s)</td></tr>`;

            await transporter.sendMail({
                from: FROM,
                to: email,
                subject: '📩 Booking Request Received — Tickets Pro',
                html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;border:1px solid #1e293b;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#0c4a6e);padding:32px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">✅</div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;text-transform:uppercase;tracking:1px;">Booking Request Received</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Thank you for choosing Tickets Pro</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <div style="background:rgba(15,23,42,0.5);border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Journey Details</p>
              <p style="color:#f1f5f9;font-size:18px;font-weight:800;margin:0;">${eventName}</p>
              <div style="margin-top:16px;display:flex;gap:20px;">
                <div>
                  <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;margin:0;">Journey Date</p>
                  <p style="color:#fff;font-size:14px;font-weight:700;margin:4px 0 0;">${jDate ? new Date(jDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div style="margin-left:24px;">
                  <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;margin:0;">Class</p>
                  <p style="color:#fff;font-size:14px;font-weight:700;margin:4px 0 0;">${tClass}</p>
                </div>
              </div>
            </div>

            <!-- Passengers Section -->
            <div style="margin-bottom:24px;">
              <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;text-align:center;">Passenger Manifest</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
                <thead>
                  <tr style="background:rgba(51,65,85,0.5);">
                    <th style="padding:12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;">Name</th>
                    <th style="padding:12px;text-align:center;color:#94a3b8;font-size:11px;text-transform:uppercase;">Age</th>
                    <th style="padding:12px;text-align:center;color:#94a3b8;font-size:11px;text-transform:uppercase;">Gen</th>
                  </tr>
                </thead>
                <tbody>
                  ${passengerRows}
                </tbody>
              </table>
            </div>

            <div style="background:linear-gradient(to right, rgba(16,185,129,0.1), rgba(16,185,129,0.05));border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
               <p style="color:#10b981;font-size:10px;text-transform:uppercase;font-weight:900;letter-spacing:2px;margin:0 0 4px;">Total Paid</p>
               <p style="color:#fff;font-size:24px;font-weight:900;margin:0;font-style:italic;">₹${displayAmount}</p>
            </div>
            
            <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px;text-align:center;">
              Please carry a <span style="color:#fff;font-weight:700;">valid original photo ID</span> during your journey. Safe travels!
            </p>
            
            <div style="text-align:center;">
              <a href="https://rail-planner-pro.web.app/bookings" style="background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;box-shadow:0 4px 12px rgba(14,165,233,0.3);">
                View My Bookings →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #1e293b;text-align:center;background:rgba(15,23,42,0.5);">
            <p style="color:#475569;font-size:12px;margin:0;">© 2026 Tickets Pro · <a href="https://rail-planner-pro.web.app" style="color:#0ea5e9;text-decoration:none;">ticketspro.in</a></p>
            <p style="color:#334155;font-size:11px;margin:6px 0 0;">This is an automated email. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
            });
            console.log(`✅ Detailed booking confirmation email sent to ${email}`);
        } else {
            console.warn('⚠️ No email provided for notifyBookingConfirmed');
        }

        // SMS (Optional)
        if (mobile && process.env.MSG91_TEMPLATE_ID_CONFIRMED) {
            console.log(`[NotificationService] Attempting SMS for ${mobile} with template ${process.env.MSG91_TEMPLATE_ID_CONFIRMED}`);
            await sendSMS(mobile, process.env.MSG91_TEMPLATE_ID_CONFIRMED, {
                event_name: eventName,
                status: 'Confirmed'
            });
        } else {
            console.log(`[NotificationService] SMS skipped: Mobile=${!!mobile}, TemplateID=${!!process.env.MSG91_TEMPLATE_ID_CONFIRMED}`);
        }

        /* 
        // WhatsApp (Optional) - Removed per request for API-less operation
        if (mobile && process.env.MSG91_WHATSAPP_TEMPLATE_ID_CONFIRMED) {
            await sendWhatsApp(mobile, process.env.MSG91_WHATSAPP_TEMPLATE_ID_CONFIRMED, {
                event_name: eventName,
                status: 'Confirmed'
            });
        }
        */
    } catch (e: any) {
        console.error('Email send failed (non-fatal):', e?.message || e);
    }
};

// ─── Booking Cancelled ────────────────────────────────────────────────────────
export const notifyBookingCancelled = async (email: string, reason: string, mobile?: string) => {
    try {
        // Email
        await transporter.sendMail({
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
        });
        console.log(`✅ Cancellation email sent to ${email}`);

        // SMS (Optional)
        if (mobile && process.env.MSG91_TEMPLATE_ID_CANCELLED) {
            await sendSMS(mobile, process.env.MSG91_TEMPLATE_ID_CANCELLED, {
                reason: reason || 'Cancelled per request'
            });
        }

        /*
        // WhatsApp (Optional) - Removed per request for API-less operation
        if (mobile && process.env.MSG91_WHATSAPP_TEMPLATE_ID_CANCELLED) {
            await sendWhatsApp(mobile, process.env.MSG91_WHATSAPP_TEMPLATE_ID_CANCELLED, {
                reason: reason || 'Cancelled per request'
            });
        }
        */
    } catch (e: any) {
        console.error('Email send failed (non-fatal):', e?.message || e);
    }
};

// ─── Payment Received (Initial Receipt) ───────────────────────────────────────
export const notifyPaymentReceived = async (mobile: string, amount: number, orderId: string) => {
    // 1. SMS
    if (mobile && process.env.MSG91_TEMPLATE_ID_PAYMENT) {
        await sendSMS(mobile, process.env.MSG91_TEMPLATE_ID_PAYMENT, {
            amount: amount.toString(),
            order_id: orderId
        });
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

// Diagnostic: Verify SMTP on startup
export const verifySMTP = async () => {
    console.log(`[Diagnostic] Testing SMTP connection for: ${FROM}`);
    try {
        await transporter.verify();
        console.log('✅ SMTP Connection Verified: Zoho is ready to send emails.');
    } catch (error: any) {
        console.error('❌ SMTP Connection Failed (Zoho):', error.message);
        if (error.code === 'EAUTH') {
            console.error('👉 Tip: Check your ZOHO_MAIL_PASSWORD. It must be an App-Specific Password.');
        }
    }
};
