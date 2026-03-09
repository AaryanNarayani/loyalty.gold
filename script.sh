PAYLOAD='{"id":"test_123","email":"aaryan.narayani.work@gmail.com","total_price":"250.00"}'

SECRET="4dc2d367-be68-4b94-8a08-d1a51e54e365"

# HMAC SIGNATURE MAIN
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

curl -X POST https://loyaltygold-production.up.railway.app/api/webhooks/shopify/order \
  -H "Content-Type: application/json" \
  -H "X-Shop-Domain: myshop.co" \
  -H "X-Oro-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
