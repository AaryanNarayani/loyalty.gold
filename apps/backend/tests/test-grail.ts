import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';

// Read config from .env or override
import * as dotenv from 'dotenv';
dotenv.config();

const ORO_API_URL = process.env.ORO_API_URL!;
const ORO_PARTNER_ID = process.env.ORO_PARTNER_ID!;
const ORO_PARTNER_WALLET = process.env.ORO_PARTNER_WALLET!;
const ORO_PARTNER_PRIVATE_KEY = process.env.ORO_PARTNER_PRIVATE_KEY!;

async function main() {
  console.log("Configuration:");
  console.log({ ORO_API_URL, ORO_PARTNER_ID, ORO_PARTNER_WALLET });

  let apiKey = process.env.ORO_EXECUTING_API_KEY;
  console.log("Using API Key from ENV:", apiKey);
  
  // Create Wallet
  const userWallet = Keypair.generate();
  const publicKeyStr = userWallet.publicKey.toBase58();
  
  // KYC Hash
  const email = "test-standalone@loyalty.gold";
  const kycData = JSON.stringify({ identifier: email.trim().toLowerCase(), schemaVersion: "1.0" });
  const hashBytes = keccak_256(new TextEncoder().encode(kycData));
  const kycHash = bs58.encode(hashBytes);

  console.log("Payload to GRAIL:", {
    kycHash,
    userWalletAddress: publicKeyStr,
    metadata: { tags: ["loyalty-gold"] }
  });

  // Call GRAIL API
  const res = await fetch(`${ORO_API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey!
    },
    body: JSON.stringify({
      kycHash,
      userWalletAddress: publicKeyStr,
      metadata: { tags: ["loyalty-gold"] }
    })
  });

  const body = await res.text();
  console.log("GRAIL API RESPONSE STATUS:", res.status);
  console.log("GRAIL API RESPONSE BODY:", body);
}

main().catch(console.error);
