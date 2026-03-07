PAYLOAD='{"id":"test_123","email":"aaryannarayani2004@gmail.com","total_price":"250.00"}'

SECRET=""

# HMAC SIGNATURE MAIN
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

curl -X POST http://localhost:3001/api/webhooks/shopify/order \
  -H "Content-Type: application/json" \
  -H "X-Shop-Domain: wellnessfromhome.in" \
  -H "X-Oro-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
