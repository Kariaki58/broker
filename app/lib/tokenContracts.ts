// Token Contract Addresses
export const TOKEN_CONTRACTS_TRON = {
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT on Tron
  USDC: 'TEkxiTe7yvxSfsMvBkUM9YH997k6S8tV9X', // USDC on Tron
} as const;

export const TOKEN_CONTRACTS_BSC = {
  USDT: '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC on BSC
} as const;

export const TOKEN_CONTRACTS_ETH = {
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Ethereum
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
} as const;

// Token decimals (for proper formatting)
export const TOKEN_DECIMALS = {
  USDT: { TRON: 6, BSC: 18, ETH: 6 },
  USDC: { TRON: 6, BSC: 18, ETH: 6 },
  BNB: 18,
  ETH: 18,
  TRX: 6,
} as const;

// Token prices in USD
export const TOKEN_PRICES: Record<string, number> = {
  ETH: 2650,
  BNB: 650, 
  TRX: 0.15,
  USDT: 1,
  USDC: 1,
};

// BSC Testnet Addresses (Legacy)
export const TOKEN_CONTRACTS_BSC_TESTNET = {
  USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  USDC: '0x64544969ed7ebf5f083679233325356ebe738930',
} as const;

// Helper: Get contract address by network and symbol
export function getTokenContract(network: 'BSC' | 'ETH' | 'BSC_TESTNET' | 'TRON', symbol: string): string | null {
  if (network === 'TRON') {
    return TOKEN_CONTRACTS_TRON[symbol as keyof typeof TOKEN_CONTRACTS_TRON] || null;
  }
  if (network === 'BSC') {
    return TOKEN_CONTRACTS_BSC[symbol as keyof typeof TOKEN_CONTRACTS_BSC] || null;
  } else if (network === 'BSC_TESTNET') {
    return TOKEN_CONTRACTS_BSC_TESTNET[symbol as keyof typeof TOKEN_CONTRACTS_BSC_TESTNET] || null;
  } else {
    return TOKEN_CONTRACTS_ETH[symbol as keyof typeof TOKEN_CONTRACTS_ETH] || null;
  }
}

// Helper: Get decimals by network and symbol
export function getTokenDecimals(network: 'BSC' | 'ETH' | 'BSC_TESTNET' | 'TRON', symbol: string): number {
  if (symbol === 'BNB') return 18;
  if (symbol === 'ETH') return 18;
  if (symbol === 'TRX') return 6;
  
  const decimals = TOKEN_DECIMALS[symbol as keyof typeof TOKEN_DECIMALS] as any;
  if (!decimals) return 18;
  
  if (typeof decimals === 'number') return decimals;
  if (network === 'TRON') return decimals.TRON || 6;
  if (network === 'BSC') return decimals.BSC || 18;
  if (network === 'ETH') return decimals.ETH || 6;
  if (network === 'BSC_TESTNET') return 18;
  
  return 18;
}

// Helper: Get symbol by contract address
export function getTokenSymbol(address: string): string | null {
  const addr = address; // Note: Tron addresses are case-sensitive, but let's check both
  
  // Check TRON contracts
  for (const [symbol, contractAddr] of Object.entries(TOKEN_CONTRACTS_TRON)) {
    if (contractAddr === addr) return symbol;
  }

  const addrLower = address.toLowerCase();
  
  // Check BSC contracts
  for (const [symbol, contractAddr] of Object.entries(TOKEN_CONTRACTS_BSC)) {
    if (contractAddr.toLowerCase() === addrLower) return symbol;
  }

  // Check BSC Testnet contracts
  for (const [symbol, contractAddr] of Object.entries(TOKEN_CONTRACTS_BSC_TESTNET)) {
    if (contractAddr.toLowerCase() === addrLower) return symbol;
  }
  
  // Check ETH contracts
  for (const [symbol, contractAddr] of Object.entries(TOKEN_CONTRACTS_ETH)) {
    if (contractAddr.toLowerCase() === addrLower) return symbol;
  }
  
  return null;
}


