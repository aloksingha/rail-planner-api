"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyPaymentReceived = exports.notifyBookingCancelled = exports.notifyBookingConfirmed = exports.formatTrainClass = exports.getTextBeeMessages = exports.sendTextBeeBulkSMS = exports.getTextBeeDevices = exports.getTextBeeStats = exports.sendSMS = exports.sendWhatsApp = void 0;
const axios_1 = __importDefault(require("axios"));
const invoiceService_1 = require("./invoiceService");
// ─── Resend SMTP Configuration ──────────────────────────────────────────────────
const isEmailConfigured = !!process.env.RESEND_API_KEY;
const transporter = {
    sendMail: async (options) => {
        const payload = {
            from: options.from,
            to: options.to,
            subject: options.subject,
            html: options.html
        };
        if (options.attachments && options.attachments.length > 0) {
            payload.attachments = options.attachments;
        }
        return axios_1.default.post('https://api.resend.com/emails', payload, {
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
const sendSMS = async (mobile, templateId, params = {}, dltTemplateId, messageText) => {
    if (!mobile) {
        return { success: false, error: 'Mobile number is required' };
    }
    const cleanDigits = mobile.replace(/\D/g, '');
    const mobile10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    const mobile91 = '91' + mobile10;
    // Determine configured SMS provider - Default to TEXTBEE (Airtel SIM)
    const configuredProvider = (process.env.SMS_PROVIDER || 'TEXTBEE').toUpperCase();
    // 1. TextBee SMS Gateway (Android SIM Gateway - https://api.textbee.dev/api/v1)
    if (configuredProvider === 'TEXTBEE') {
        const apiKey = process.env.TEXTBEE_API_KEY || 'txb_1AE95IkIqnRRdJ8oShseooWs4uXeatDM';
        const deviceId = process.env.TEXTBEE_DEVICE_ID || '6ae35654c1ee0a8decf5a45c';
        const simSubId = parseInt(process.env.TEXTBEE_SIM_SUBSCRIPTION_ID || '3');
        if (!apiKey) {
            console.warn('⚠️ TextBee API Key not configured.');
        }
        else {
            try {
                const baseUrl = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');
                const e164Recipient = cleanDigits.startsWith('91') ? `+${cleanDigits}` : `+91${mobile10}`;
                const textToSend = messageText || (params.event_name ? `TicketsPro: Booking for ${params.event_name} is ${params.status || 'Confirmed'}. Check status: https://ticketspro.in` :
                    params.amount ? `TicketsPro: Payment of Rs.${params.amount} received for order ${params.order_id}. Thank you!` :
                        params.reason ? `TicketsPro: Booking cancelled. Reason: ${params.reason}. Refund initiated.` :
                            'TicketsPro: Notification update.');
                const payload = {
                    recipients: [e164Recipient],
                    message: textToSend,
                    deviceId: deviceId,
                    simSubscriptionId: isNaN(simSubId) ? 3 : simSubId // Force Airtel (3), never Jio (1)
                };
                const response = await axios_1.default.post(`${baseUrl}/gateway/send-sms`, payload, {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                if (response.data && (response.status === 200 || response.status === 201 || response.data.success || response.data.data)) {
                    console.log(`✅ [TextBee] SMS dispatched to ${e164Recipient} via TextBee Gateway (Airtel SIM ${payload.simSubscriptionId})`);
                    return { success: true, provider: 'TextBee', raw: response.data };
                }
                else {
                    console.warn(`⚠️ [TextBee] Gateway response for ${e164Recipient}:`, response.data);
                    return { success: false, provider: 'TextBee', error: response.data?.message || 'TextBee delivery unconfirmed', raw: response.data };
                }
            }
            catch (err) {
                console.error('❌ TextBee API Error:', err?.response?.data || err.message);
                return { success: false, provider: 'TextBee', error: err?.response?.data?.message || err.message };
            }
        }
    }
    // 2. Fast2SMS (Recommended for Quick Transactional/OTP in India without DLT blockers)
    if (configuredProvider === 'FAST2SMS' || (!configuredProvider && process.env.FAST2SMS_API_KEY)) {
        const apiKey = process.env.FAST2SMS_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ Fast2SMS API Key not found in environment.');
        }
        else {
            try {
                const route = process.env.FAST2SMS_ROUTE || 'q'; // 'q' = quick, 'dlt' = dlt, 'otp' = otp
                const textToSend = messageText || (params.event_name ? `TicketsPro: Booking for ${params.event_name} is ${params.status || 'Confirmed'}. Check status: https://ticketspro.in` :
                    params.amount ? `TicketsPro: Payment of Rs.${params.amount} received for order ${params.order_id}. Thank you!` :
                        params.reason ? `TicketsPro: Booking cancelled. Reason: ${params.reason}. Refund initiated.` :
                            'TicketsPro: Notification update.');
                const fast2smsPayload = {
                    route,
                    language: 'english',
                    flash: 0,
                    numbers: mobile10
                };
                if (route === 'dlt') {
                    fast2smsPayload.sender_id = process.env.FAST2SMS_SENDER_ID || 'TKTSPR';
                    fast2smsPayload.message = dltTemplateId || templateId || '';
                    fast2smsPayload.variables_values = Object.values(params).join('|');
                }
                else {
                    fast2smsPayload.message = textToSend;
                }
                const response = await axios_1.default.post('https://www.fast2sms.com/dev/bulkV2', fast2smsPayload, {
                    headers: {
                        'authorization': apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                if (response.data && (response.data.return === true || response.data.status_code === 200)) {
                    console.log(`✅ [Fast2SMS] SMS sent to ${mobile10} (Route: ${route}, Request ID: ${response.data.request_id})`);
                    return { success: true, provider: 'Fast2SMS', campaignId: response.data.request_id, raw: response.data };
                }
                else {
                    console.warn(`⚠️ [Fast2SMS] Gateway response for ${mobile10}:`, response.data);
                    return { success: false, provider: 'Fast2SMS', error: response.data?.message || 'Fast2SMS delivery unsuccessful', raw: response.data };
                }
            }
            catch (err) {
                console.error('❌ Fast2SMS API Error:', err?.response?.data || err.message);
                return { success: false, provider: 'Fast2SMS', error: err?.response?.data?.message || err.message };
            }
        }
    }
    // 3. Infozy SMS (Only used if explicitly set as SMS_PROVIDER="INFOZY")
    if (configuredProvider === 'INFOZY') {
        const apiKey = process.env.INFOZY_API_KEY;
        const targetTemplate = templateId || process.env.INFOZY_TEMPLATE_ID_CONFIRMED;
        if (!apiKey) {
            console.warn('⚠️ Infozy API Key not found. SMS skipped.');
        }
        else if (!targetTemplate) {
            console.warn('⚠️ Infozy Template ID not specified. SMS skipped.');
        }
        else {
            try {
                const payload = {
                    template: targetTemplate,
                    mobileNumber: mobile91,
                    variables: params
                };
                const response = await axios_1.default.post('https://infozysms.in/api/sms/send', payload, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                if (response.data && (response.data.message === 'Message sent successfully' || response.data.status === 'success' || response.data.campaignId)) {
                    console.log(`✅ [Infozy] SMS successfully triggered for ${mobile91} via template ${targetTemplate}. Campaign ID: ${response.data.campaignId}`);
                    return { success: true, provider: 'Infozy', campaignId: response.data.campaignId, raw: response.data };
                }
                else {
                    console.log(`⚠️ [Infozy] SMS response for ${mobile91}:`, response.data);
                    return { success: false, provider: 'Infozy', error: response.data?.message || 'Infozy delivery unsuccessful', raw: response.data };
                }
            }
            catch (error) {
                console.error('❌ Infozy SMS API Error:', error?.response?.data || error.message);
                return { success: false, provider: 'Infozy', error: error?.response?.data?.message || error.message };
            }
        }
    }
    // 3. Msg91 Flow API
    if (configuredProvider === 'MSG91' || (!configuredProvider && process.env.MSG91_AUTH_KEY)) {
        const authKey = process.env.MSG91_AUTH_KEY;
        const targetTemplate = templateId || process.env.MSG91_TEMPLATE_ID_CONFIRMED;
        if (!authKey) {
            console.warn('⚠️ Msg91 Auth Key not found.');
        }
        else if (!targetTemplate) {
            console.warn('⚠️ Msg91 Template/Flow ID not found.');
        }
        else {
            try {
                const response = await axios_1.default.post('https://api.msg91.com/api/v5/flow/', {
                    template_id: targetTemplate,
                    sender: process.env.MSG91_SENDER_ID || 'TKTSPR',
                    short_url: '1',
                    recipients: [{ mobiles: mobile91, ...params }]
                }, {
                    headers: {
                        'authkey': authKey,
                        'content-type': 'application/json'
                    },
                    timeout: 10000
                });
                if (response.data?.type === 'success') {
                    console.log(`✅ [Msg91] SMS triggered for ${mobile91} via Flow ${targetTemplate}`);
                    return { success: true, provider: 'Msg91', raw: response.data };
                }
                else {
                    console.warn(`⚠️ [Msg91] Trigger failed for ${mobile91}:`, response.data);
                    return { success: false, provider: 'Msg91', error: response.data?.message || 'Msg91 failed', raw: response.data };
                }
            }
            catch (err) {
                console.error('❌ Msg91 API Error:', err?.response?.data || err.message);
                return { success: false, provider: 'Msg91', error: err?.response?.data?.message || err.message };
            }
        }
    }
    // 4. Twilio SMS
    if (configuredProvider === 'TWILIO' || (!configuredProvider && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER;
        if (!accountSid || !authToken || !fromNumber) {
            console.warn('⚠️ Twilio credentials incomplete.');
        }
        else {
            try {
                const toFormatted = '+' + (cleanDigits.startsWith('91') ? cleanDigits : '91' + mobile10);
                const textToSend = messageText || (params.event_name ? `TicketsPro: Booking for ${params.event_name} is ${params.status || 'Confirmed'}.` :
                    'TicketsPro: Notification update.');
                const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                const paramsData = new URLSearchParams();
                paramsData.append('To', toFormatted);
                paramsData.append('From', fromNumber);
                paramsData.append('Body', textToSend);
                const response = await axios_1.default.post(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, paramsData.toString(), {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                });
                if (response.data?.sid) {
                    console.log(`✅ [Twilio] SMS sent to ${toFormatted}. SID: ${response.data.sid}`);
                    return { success: true, provider: 'Twilio', campaignId: response.data.sid, raw: response.data };
                }
            }
            catch (err) {
                console.error('❌ Twilio SMS Error:', err?.response?.data || err.message);
                return { success: false, provider: 'Twilio', error: err?.response?.data?.message || err.message };
            }
        }
    }
    return {
        success: false,
        error: 'No active SMS provider configured. Please configure TEXTBEE_API_KEY, FAST2SMS_API_KEY, INFOZY_API_KEY, MSG91_AUTH_KEY, or TWILIO_ACCOUNT_SID in environment variables.'
    };
};
exports.sendSMS = sendSMS;
const getTextBeeStats = async () => {
    const apiKey = process.env.TEXTBEE_API_KEY || 'txb_1AE95IkIqnRRdJ8oShseooWs4uXeatDM';
    if (!apiKey)
        return { success: false, error: 'TEXTBEE_API_KEY not configured' };
    const baseUrl = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');
    try {
        const response = await axios_1.default.get(`${baseUrl}/gateway/stats`, {
            headers: { 'x-api-key': apiKey },
            timeout: 8000
        });
        return { success: true, data: response.data };
    }
    catch (e) {
        return { success: false, error: e?.response?.data || e.message };
    }
};
exports.getTextBeeStats = getTextBeeStats;
const getTextBeeDevices = async () => {
    const apiKey = process.env.TEXTBEE_API_KEY || 'txb_1AE95IkIqnRRdJ8oShseooWs4uXeatDM';
    if (!apiKey)
        return { success: false, error: 'TEXTBEE_API_KEY not configured' };
    const baseUrl = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');
    try {
        const response = await axios_1.default.get(`${baseUrl}/gateway/devices`, {
            headers: { 'x-api-key': apiKey },
            timeout: 8000
        });
        return { success: true, data: response.data };
    }
    catch (e) {
        return { success: false, error: e?.response?.data || e.message };
    }
};
exports.getTextBeeDevices = getTextBeeDevices;
const sendTextBeeBulkSMS = async (messages, deviceId) => {
    const apiKey = process.env.TEXTBEE_API_KEY || 'txb_1AE95IkIqnRRdJ8oShseooWs4uXeatDM';
    if (!apiKey)
        return { success: false, error: 'TEXTBEE_API_KEY not configured' };
    const baseUrl = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');
    const targetDeviceId = deviceId || process.env.TEXTBEE_DEVICE_ID || '6ae35654c1ee0a8decf5a45c';
    try {
        const simSubId = parseInt(process.env.TEXTBEE_SIM_SUBSCRIPTION_ID || '3');
        const payload = {
            deviceId: targetDeviceId,
            messages: messages.map(m => ({
                recipients: m.recipients.map(r => {
                    const clean = r.replace(/\D/g, '');
                    return clean.startsWith('91') ? `+${clean}` : (clean.length === 10 ? `+91${clean}` : `+${clean}`);
                }),
                message: m.message,
                simSubscriptionId: simSubId
            }))
        };
        const response = await axios_1.default.post(`${baseUrl}/gateway/send-bulk-sms`, payload, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        return { success: true, data: response.data };
    }
    catch (e) {
        return { success: false, error: e?.response?.data || e.message };
    }
};
exports.sendTextBeeBulkSMS = sendTextBeeBulkSMS;
const getTextBeeMessages = async (query = {}) => {
    const apiKey = process.env.TEXTBEE_API_KEY || 'txb_1AE95IkIqnRRdJ8oShseooWs4uXeatDM';
    if (!apiKey)
        return { success: false, error: 'TEXTBEE_API_KEY not configured' };
    const baseUrl = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');
    try {
        const params = new URLSearchParams();
        if (query.direction)
            params.append('direction', query.direction);
        if (query.page)
            params.append('page', query.page.toString());
        if (query.limit)
            params.append('limit', query.limit.toString());
        if (query.smsBatchId)
            params.append('smsBatchId', query.smsBatchId);
        if (query.status)
            params.append('status', query.status);
        const url = `${baseUrl}/gateway/messages${params.toString() ? '?' + params.toString() : ''}`;
        const response = await axios_1.default.get(url, {
            headers: { 'x-api-key': apiKey },
            timeout: 10000
        });
        return { success: true, data: response.data };
    }
    catch (e) {
        return { success: false, error: e?.response?.data || e.message };
    }
};
exports.getTextBeeMessages = getTextBeeMessages;
// ─── Booking Confirmed ────────────────────────────────────────────────────────
const CLASS_LABELS = {
    'SL': 'Sleeper (SL)',
    'SLEEPER': 'Sleeper (SL)',
    '3A': 'AC 3 Tier (3A)',
    '2A': 'AC 2 Tier (2A)',
    '1A': 'AC First Class (1A)',
    '3E': 'AC 3 Economy (3E)',
    'CC': 'AC Chair Car (CC)',
    '2S': 'Second Sitting (2S)',
    'EC': 'Executive Class (EC)',
    'EV': 'Vistadome AC (EV)',
    'FC': 'First Class (FC)',
    'AC': 'AC Class'
};
const formatTrainClass = (rawClass) => {
    if (!rawClass)
        return '';
    const upper = rawClass.trim().toUpperCase();
    return CLASS_LABELS[upper] || rawClass.trim();
};
exports.formatTrainClass = formatTrainClass;
const notifyBookingConfirmed = async (email, eventName, mobile, details) => {
    // Auto-generate official GST Tax Invoice PDF
    let invoiceInfo = null;
    try {
        const parsedAmt = Number(details?.amount) || 0;
        invoiceInfo = await (0, invoiceService_1.generateGSTInvoice)({
            bookingId: details?.bookingId || details?.transactionId || `BK_${Date.now()}`,
            amount: parsedAmt,
            trainName: eventName.split('(')[0]?.trim(),
            trainNo: (eventName.match(/\(([^)]+)\)/) || [])[1] || '',
            journeyDate: details?.journeyDate,
            trainClass: details?.trainClass,
            passengerList: details?.passengerDetails,
            paymentId: details?.transactionId,
            customerEmail: email,
            customerMobile: mobile,
            clientGstin: details?.clientGstin,
            clientCompanyName: details?.clientCompanyName,
            clientState: details?.clientState
        });
    }
    catch (invErr) {
        console.warn('[Invoice] Auto GST invoice generation failed (non-fatal):', invErr);
    }
    const formattedClass = (0, exports.formatTrainClass)(details?.trainClass);
    // 1. Send Email via Resend
    if (isEmailConfigured) {
        const journeyDateAndClassHtml = (details?.journeyDate || formattedClass) ? `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${details?.journeyDate ? `
                  <td valign="top" style="${formattedClass ? 'width:55%;' : 'width:100%;'}">
                    <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Journey Date</p>
                    <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0;">${details.journeyDate}</p>
                  </td>
                  ` : ''}
                  ${formattedClass ? `
                  <td valign="top" align="${details?.journeyDate ? 'right' : 'left'}" style="${details?.journeyDate ? 'width:45%;' : 'width:100%;'}">
                    <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Booking Class</p>
                    <p style="color:#38bdf8;font-size:15px;font-weight:700;margin:0;">${formattedClass}</p>
                  </td>
                  ` : ''}
                </tr>
              </table>
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
        const gstTaxHtml = invoiceInfo ? `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td><p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0;">GST Tax Breakdown (SAC: 996411)</p></td>
                  <td align="right"><span style="color:#38bdf8;font-size:11px;font-weight:700;">${invoiceInfo.invoiceNumber}</span></td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                <tr>
                  <td style="color:#94a3b8;padding:5px 0;">Taxable Amount</td>
                  <td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.taxableAmount)}</td>
                </tr>
                ${invoiceInfo.isInterState ? `
                <tr>
                  <td style="color:#94a3b8;padding:5px 0;">Integrated GST (IGST ${invoiceInfo.gstRate}%)</td>
                  <td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.igst)}</td>
                </tr>
                ` : `
                <tr>
                  <td style="color:#94a3b8;padding:5px 0;">Central GST (CGST ${(invoiceInfo.gstRate / 2).toFixed(1)}%)</td>
                  <td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.cgst)}</td>
                </tr>
                <tr>
                  <td style="color:#94a3b8;padding:5px 0;">State GST (SGST ${(invoiceInfo.gstRate / 2).toFixed(1)}%)</td>
                  <td align="right" style="color:#f1f5f9;font-weight:600;">Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.sgst)}</td>
                </tr>
                `}
                <tr style="border-top:1px solid #334155;">
                  <td style="color:#fff;font-weight:800;padding:8px 0 0;">Total Paid (Incl. GST)</td>
                  <td align="right" style="color:#10b981;font-size:15px;font-weight:800;padding:8px 0 0;">Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.totalAmount)}</td>
                </tr>
              </table>
              <div style="margin-top:16px;text-align:center;">
                <a href="https://rail-planner-api.onrender.com/api/invoices/${details?.bookingId || details?.transactionId}?download=true" style="background:#0f172a;border:1px solid #38bdf8;color:#38bdf8;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:12px;display:inline-block;">
                  📄 Download Official GST Tax Invoice (PDF)
                </a>
              </div>
            </div>
        ` : '';
        transporter.sendMail({
            from: FROM,
            to: email,
            subject: `✅ Booking Confirmed & GST Invoice ${invoiceInfo ? '(' + invoiceInfo.invoiceNumber + ') ' : ''}— Tickets Pro`,
            attachments: invoiceInfo?.pdfBuffer ? [
                {
                    filename: `TicketsPro_${invoiceInfo.invoiceNumber}.pdf`,
                    content: invoiceInfo.pdfBuffer.toString('base64')
                }
            ] : undefined,
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
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Your train ticket & GST Tax Invoice are ready.</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px;">
                  <p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Journey Details</p>
                  <p style="color:#f1f5f9;font-size:18px;font-weight:800;margin:0;">${eventName}</p>
                </div>
                
                ${journeyDateAndClassHtml}
                ${passengerHtml}
                ${paymentHtml}
                ${gstTaxHtml}

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
    // 2. Send SMS via Active Provider (Fast2SMS / Infozy / Msg91 / Twilio)
    try {
        if (mobile) {
            const template = process.env.INFOZY_TEMPLATE_ID_CONFIRMED || process.env.MSG91_TEMPLATE_ID_CONFIRMED;
            const txnText = details?.transactionId ? ` Ref: ${details.transactionId}.` : '';
            const msgText = `TicketsPro: Booking CONFIRMED for ${eventName}.${txnText} Manage: https://ticketspro.in`;
            await (0, exports.sendSMS)(mobile, template, {
                event_name: eventName,
                status: 'Confirmed'
            }, undefined, msgText);
        }
    }
    catch (e) {
        console.error('❌ SMS send failed (non-fatal):', e?.message || e);
    }
    // 3. Send WhatsApp via WhatsGateway
    try {
        if (mobile) {
            const waPassengers = details?.passengerDetails
                ? details.passengerDetails.replace(/<br\s*\/?>/gi, '\n   ')
                : '';
            const waTaxLine = invoiceInfo
                ? (invoiceInfo.isInterState
                    ? `• IGST (${invoiceInfo.gstRate}%): Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.igst)}`
                    : `• CGST (${(invoiceInfo.gstRate / 2).toFixed(1)}%): Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.cgst)}\n   • SGST (${(invoiceInfo.gstRate / 2).toFixed(1)}%): Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.sgst)}`)
                : '';
            const waInvoiceText = invoiceInfo ?
                `\n🧾 *GST Tax Invoice (${invoiceInfo.invoiceNumber}):*
   • Taxable Fare: Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.taxableAmount)}
   ${waTaxLine}
   • *Total Paid:* Rs. ${(0, invoiceService_1.formatINR)(invoiceInfo.totalAmount)}

📄 *Download Official GST Tax Invoice (PDF):*
https://rail-planner-api.onrender.com/api/invoices/${details?.bookingId || details?.transactionId}?download=true\n` : '';
            const waMessage = `🎫 *Tickets Pro — Booking Confirmed!*

Dear Passenger,
Your train ticket has been booked successfully!

🚆 *Journey:* ${eventName}
${formattedClass ? `💺 *Class:* ${formattedClass}\n` : ''}${details?.journeyDate ? `📅 *Date:* ${details.journeyDate}\n` : ''}${waPassengers ? `👥 *Passengers:*\n   ${waPassengers}\n` : ''}${details?.amount ? `💰 *Total Fare:* ₹${details.amount}\n` : ''}${details?.transactionId ? `💳 *Txn ID:* ${details.transactionId}\n` : ''}${waInvoiceText}
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
    // 2. Send SMS via Active Provider (Fast2SMS / Infozy / Msg91 / Twilio)
    try {
        if (mobile) {
            const template = process.env.INFOZY_TEMPLATE_ID_CANCELLED || process.env.MSG91_TEMPLATE_ID_CANCELLED;
            const msgText = `TicketsPro: Booking has been CANCELLED. Reason: ${reason || 'Per customer request'}. Refund initiated as per policy. Team TicketsPro`;
            await (0, exports.sendSMS)(mobile, template, {
                reason: reason || 'Cancelled per request'
            }, undefined, msgText);
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
    // 1. Send SMS via Active Provider (Fast2SMS / Infozy / Msg91 / Twilio)
    try {
        if (mobile) {
            const template = process.env.INFOZY_TEMPLATE_ID_PAYMENT || process.env.MSG91_TEMPLATE_ID_PAYMENT;
            const msgText = `TicketsPro: Payment of Rs.${amount} received successfully for Order ${orderId}. Thank you for choosing TicketsPro!`;
            await (0, exports.sendSMS)(mobile, template, {
                amount: amount.toString(),
                order_id: orderId
            }, undefined, msgText);
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
