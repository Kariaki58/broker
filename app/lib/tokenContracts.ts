// BEP-20 Token Contract Addresses on Binance Smart Chain (BSC)
// In production, store these in environment variables or database

export const TOKEN_CONTRACTS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC on BSC
} as const;

// ERC-20 Transfer event signature
// Transfer(address indexed from, address indexed to, uint256 value)
export const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Token decimals (for proper formatting)
export const TOKEN_DECIMALS = {
  USDT: 18, // BEP-20 USDT uses 18 decimals on BSC
  USDC: 18, // BEP-20 USDC uses 18 decimals on BSC
  BNB: 18, // Native BNB
  ETH: 18,
} as const;

// Token prices in USD (in production, fetch from price API)
export const TOKEN_PRICES: Record<string, number> = {
  ETH: 2650,
  BNB: 600, // Approximate BNB price
  USDT: 1,
  USDC: 1,
};

// Get token symbol from contract address
export function getTokenSymbol(contractAddress: string): string | null {
  const address = contractAddress.toLowerCase();
  for (const [symbol, addr] of Object.entries(TOKEN_CONTRACTS)) {
    if (addr.toLowerCase() === address) {
      return symbol;
    }
  }
  return null;
}

// Get token decimals
export function getTokenDecimals(symbol: string): number {
  return TOKEN_DECIMALS[symbol as keyof typeof TOKEN_DECIMALS] || 18;
}

