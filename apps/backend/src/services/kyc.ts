import { keccak_256 } from '@noble/hashes/sha3';
import bs58 from 'bs58';

export class KycService {

  static generateHash(identifier: string): string {
    const kycData = JSON.stringify({
      identifier: identifier.trim().toLowerCase(),
      schemaVersion: "1.0"
    });

    const hashBytes = keccak_256(new TextEncoder().encode(kycData));
    return bs58.encode(hashBytes);
  }
}
