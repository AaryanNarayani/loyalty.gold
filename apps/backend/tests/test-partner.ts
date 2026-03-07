import { GrailService } from '../src/services/grail';

async function testPartnerInfo() {
  console.log("Fetching Partner Info and Treasury Balance...");
  try {
    const partnerInfo = await GrailService.getPartnerInfo();
    console.log("Partner Info Result:", JSON.stringify(partnerInfo, null, 2));

    if (partnerInfo.centralVaultAddress) {
      console.log("Central Vault Address is configured:", partnerInfo.centralVaultAddress);
    } else {
      console.warn("Central Vault Address missing!");
    }
  } catch (error: any) {
    console.error("Test failed:", error.message);
  }
}

testPartnerInfo();
