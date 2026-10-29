# TicketsPro SMS Gateway Integration Guide

TicketsPro supports a **Unified Multi-Provider SMS Engine** in `rail-planner-api/src/services/notificationService.ts`.

---

## 1. TextBee SMS Gateway (Android Phone SIM Gateway)

**TextBee** (`https://api.textbee.dev/api/v1`) turns any Android phone into an SMS Gateway, allowing TicketsPro to dispatch real SMS messages through your SIM card with zero carrier restrictions and no DLT template registrations!

### Setup Steps:
1. Register and log in at **[TextBee Dashboard](https://textbee.dev)**.
2. Install the TextBee Android app on your phone and scan the QR code to pair your device.
3. Generate an API Key in the TextBee dashboard under **API Keys**.
4. Configure your `.env` in `rail-planner-api`:
   ```env
   SMS_PROVIDER="TEXTBEE"
   TEXTBEE_BASE_URL="https://api.textbee.dev/api/v1"
   TEXTBEE_API_KEY="your_textbee_api_key_here"
   TEXTBEE_DEVICE_ID=""  # (Optional: Leave blank to use primary active phone)
   ```

### API Endpoints Supported:
- `POST /api/v1/gateway/send-sms` — Dispatches SMS via paired Android phone SIM.
- `GET /api/v1/gateway/devices` — Lists paired devices, battery levels, online status.
- `GET /api/v1/gateway/stats` — Queries total SMS sent/received and gateway stats.

---

## 2. Fast2SMS (Instant India Cloud Route)
```env
SMS_PROVIDER="FAST2SMS"
FAST2SMS_API_KEY="your_fast2sms_api_key_here"
FAST2SMS_ROUTE="q"
```

---

## 3. Infozy SMS (DLT Enterprise Route)
```env
SMS_PROVIDER="INFOZY"
INFOZY_API_KEY="your_infozy_api_key"
INFOZY_TEMPLATE_ID_CONFIRMED="your_dlt_template_id"
INFOZY_TEMPLATE_ID_PAYMENT="your_dlt_template_id"
INFOZY_TEMPLATE_ID_CANCELLED="your_dlt_template_id"
```

---

## 4. Msg91 Flow API
```env
SMS_PROVIDER="MSG91"
MSG91_AUTH_KEY="your_msg91_auth_key"
MSG91_SENDER_ID="TKTSPR"
```

---

## 5. Twilio (Global SMS)
```env
SMS_PROVIDER="TWILIO"
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_FROM_NUMBER="+1XXXXXXXXXX"
```

---

## 6. Admin Live Testing Endpoints
- **Send Test SMS**: `POST /api/admin/test-sms`
  ```json
  {
    "mobile": "7318815790",
    "message": "TicketsPro: Live SMS test via TextBee!"
  }
  ```
- **TextBee Device Stats**: `GET /api/admin/textbee/stats`
- **TextBee Connected Devices**: `GET /api/admin/textbee/devices`
