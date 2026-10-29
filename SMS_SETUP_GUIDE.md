# ─── SMS Gateway Configuration ────────────────────────────────────────────────
# Active Provider: FAST2SMS | INFOZY | MSG91 | TWILIO (Leave empty to auto-detect based on set keys)
SMS_PROVIDER="INFOZY"

# 1. Fast2SMS (Recommended for instant setup in India - no DLT required on Quick Route 'q' / 'otp')
FAST2SMS_API_KEY=""
FAST2SMS_ROUTE="q"
FAST2SMS_SENDER_ID="TKTSPR"

# 2. Infozy SMS
INFOZY_API_KEY=""
INFOZY_TEMPLATE_ID_CONFIRMED=""
INFOZY_TEMPLATE_ID_PAYMENT=""
INFOZY_TEMPLATE_ID_CANCELLED=""

# 3. Msg91 Flow API
MSG91_AUTH_KEY=""
MSG91_SENDER_ID="TKTSPR"
MSG91_TEMPLATE_ID_CONFIRMED=""
MSG91_TEMPLATE_ID_PAYMENT=""
MSG91_TEMPLATE_ID_CANCELLED=""

# 4. Twilio
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
