import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("Seeding Test Merchant...");
  const merchant = await prisma.merchant.create({
    data: {
      name: "Acme Testing Co",
      rewardRatio: 0.015, // 1.5% callback
      balanceUsdc: 15000,
    }
  });

  console.log(`Merchant Created: ${merchant.id}`);

  const mockShopifyPayload = {
    id: 999123888,
    email: "test.webhook@loyalty.gold",
    total_price: "150.00",
    currency: "USD"
  };

  console.log(`Firing webhook for Order: $150.00 to ${mockShopifyPayload.email}`);

  const res = await fetch(`http://localhost:3001/api/webhooks/shopify/order?merchantId=${merchant.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Hmac-Sha256': 'mock-hash',
      'x-test-bypass': 'true' // bypass hmac for test
    },
    body: JSON.stringify(mockShopifyPayload)
  });

  const body = await res.text();
  console.log("Webhook Response:", body);
}

run().catch(console.error);
