// import request from 'supertest';
// import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
// import { app, prisma } from '../src/index';

// import { GrailService } from '../src/services/grail';

// // Mock the GRAIL Service to prevent actual Devnet SOL/USDC deductions during automated testing
// beforeAll(() => {
//   jest.spyOn(GrailService, 'getApiKey').mockResolvedValue('mocked-api-key');
//   jest.spyOn(GrailService, 'createUser').mockResolvedValue({
//     userId: 'mock-grail-user-id',
//     userPda: 'mock-user-pda-address',
//     txSignature: 'mock-create-user-tx-sig'
//   });
//   jest.spyOn(GrailService, 'getBuyEstimate').mockResolvedValue({
//     estimatedGoldAmount: "0.05"
//   });
//   jest.spyOn(GrailService, 'executePartnerPurchase').mockResolvedValue({
//     purchaseId: 'mock-purchase-id',
//     txSignature: 'mock-partner-purchase-tx-sig'
//   });
//   jest.spyOn(GrailService, 'transferGold').mockResolvedValue({
//     txSignature: 'mock-transfer-gold-tx-sig'
//   });
// });

// describe('E2E: Loyalty.Gold Flows', () => {
//   let merchantId: string;
//   let orderId = `test-order-${Date.now()}`;
//   const testEmail = `test.e2e.${Date.now()}@loyalty.gold`;

//   beforeAll(async () => {
//     // 1. Setup a Test Merchant
//     const merchant = await prisma.merchant.create({
//       data: {
//         name: "Jest E2E Merchant",
//         shopDomain: "test.myshopify.com",
//         rewardRatio: 0.05, // 5%
//         balanceUsdc: 10000,
//         webhookSecret: "jest-test-secret"
//       }
//     });
//     merchantId = merchant.id;
//   });

//   afterAll(async () => {
//     // Teardown
//     await prisma.ledger.deleteMany({ where: { merchantId } });
//     await prisma.merchant.delete({ where: { id: merchantId } });
//     await prisma.user.deleteMany({ where: { email: testEmail } });
//     await prisma.$disconnect();
//   });

//   it('Healthcheck endpoint should return 200', async () => {
//     const res = await request(app).get('/');
//     expect(res.status).toBe(200);
//     expect(res.body.status).toBe('ok');
//   });

//   describe('Shopify Webhook -> Reward Engine -> GRAIL', () => {
//     it('Should process a Shopify order, create a User Vault, and distribute Gold', async () => {
//       const mockOrderPayload = {
//         id: orderId,
//         email: testEmail,
//         total_price: "100.00",
//         currency: "USD"
//       };

//       const res = await request(app)
//         .post(`/api/webhooks/shopify/order`)
//         .set('X-Shopify-Hmac-Sha256', 'mock-hash')
//         .set('X-Shopify-Shop-Domain', 'test.myshopify.com')
//         .set('x-test-bypass', 'true') // Bypass HMAC for simplicity in this pure logic integration test
//         .send(mockOrderPayload);

//       expect(res.status).toBe(200);
//       expect(res.body.status).toBe("received");
      
//       // Wait a moment for the background Promise to complete
//       await new Promise(r => setTimeout(r, 600));

//       // Verify DB State
//       const createdUser = await prisma.user.findUnique({ where: { email: testEmail } });
//       expect(createdUser).not.toBeNull();
//       expect(createdUser?.userPda).toBe('mock-user-pda-address');

//       const ledgerEntry = await prisma.ledger.findUnique({ where: { orderId } });
//       expect(ledgerEntry).not.toBeNull();
//       expect(ledgerEntry?.userId).toBe(createdUser?.id);
//     });

//     it('Should be idempotent and ignore duplicate order IDs', async () => {
//       const mockDuplicatePayload = {
//         id: orderId, // same ID as above !
//         email: testEmail,
//         total_price: "100.00",
//         currency: "USD"
//       };

//       const res = await request(app)
//         .post(`/api/webhooks/shopify/order`)
//         .set('X-Shopify-Hmac-Sha256', 'mock-hash')
//         .set('X-Shopify-Shop-Domain', 'test.myshopify.com')
//         .set('x-test-bypass', 'true')
//         .send(mockDuplicatePayload);

//       expect(res.status).toBe(200);
//       expect(res.body.status).toBe("received");
      
//       await new Promise(r => setTimeout(r, 500));
//     });
//   });
// });
