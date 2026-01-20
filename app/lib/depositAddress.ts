import { ethers } from 'ethers';
import { createHash } from 'crypto';

/**
 * Generates a unique deposit address for each user
 * Uses deterministic address generation based on user ID + secret
 * This ensures each user gets a unique, consistent address
 */
export function generateDepositAddress(userId: string): string {
  // Use a secret key from environment or default (in production, use strong secret)
  const secret = process.env.DEPOSIT_ADDRESS_SECRET || 'default-secret-change-in-production';
  
  // Create deterministic hash from userId + secret
  const hash = createHash('sha256')
    .update(userId + secret)
    .digest('hex');
  
  // Use first 40 characters (20 bytes) to create address
  // Pad to 42 characters (0x + 40 hex chars) to match Ethereum address format
  const address = '0x' + hash.slice(0, 40);
  
  // Validate it's a valid address format
  if (!ethers.isAddress(address)) {
    // If somehow invalid, use a fallback method
    return generateFallbackAddress(userId);
  }
  
  return address.toLowerCase();
}

/**
 * Fallback method if primary generation fails
 */
function generateFallbackAddress(userId: string): string {
  const secret = process.env.DEPOSIT_ADDRESS_SECRET || 'default-secret';
  const combined = userId + secret + Date.now().toString();
  const hash = createHash('sha256').update(combined).digest('hex');
  return '0x' + hash.slice(0, 40).toLowerCase();
}

/**
 * Validates if an address is a valid Ethereum/BSC address format
 */
export function isValidDepositAddress(address: string): boolean {
  return ethers.isAddress(address);
}

