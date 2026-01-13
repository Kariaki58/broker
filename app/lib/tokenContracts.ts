// ERC-20 Token Contract Addresses on Ethereum Mainnet
// In production, store these in environment variables or database

export const TOKEN_CONTRACTS = {
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
} as const;

// ERC-20 Transfer event signature
// Transfer(address indexed from, address indexed to, uint256 value)
export const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Token decimals (for proper formatting)
export const TOKEN_DECIMALS = {
  USDT: 6,
  USDC: 6,
  ETH: 18,
} as const;

// Token prices in USD (in production, fetch from price API)
export const TOKEN_PRICES: Record<string, number> = {
  ETH: 2650,
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

