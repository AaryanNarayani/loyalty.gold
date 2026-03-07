import { PrismaClient } from '@prisma/client';
import { RewardService } from '../src/services/reward';

const prisma = new PrismaClient();

async function run() {
  const merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    console.error("No merchant found to process order.");
    return;
  }

  const payload = {
    id: `live_order_${Date.now()}`,
    email: "aaryannarayani2004@gmail.com",
    total_price: "250.00" // 1.5% of 250 is 3.75 USDC 
  };

  try {
    const result = await RewardService.processShopifyOrder(merchant.id, payload);
    console.log("Reward Engine Result:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("Process failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
