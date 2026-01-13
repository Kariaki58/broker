// Shared balance store - in production, replace with database
// This prevents server-to-server HTTP calls and provides a single source of truth

interface UserBalance {
  userId: string;
  balance: number;
  lastUpdated: Date;
}

interface ProcessedTransaction {
  txHash: string;
  processedAt: Date;
  userId?: string;
}

// In-memory stores (in production, use database)
const userBalances: Map<string, number> = new Map();
const processedTransactions: Map<string, ProcessedTransaction> = new Map();

export function getUserBalance(userId: string): number {
  return userBalances.get(userId) || 0;
}

export function updateUserBalance(userId: string, amount: number): number {
  const currentBalance = getUserBalance(userId);
  const newBalance = currentBalance + amount;
  userBalances.set(userId, newBalance);
  return newBalance;
}

export function setUserBalance(userId: string, balance: number): void {
  userBalances.set(userId, balance);
}

export function isTransactionProcessed(txHash: string): boolean {
  return processedTransactions.has(txHash.toLowerCase());
}

export function markTransactionProcessed(
  txHash: string,
  userId?: string
): void {
  processedTransactions.set(txHash.toLowerCase(), {
    txHash: txHash.toLowerCase(),
    processedAt: new Date(),
    userId,
  });
}

export function getAllBalances(): Record<string, number> {
  const result: Record<string, number> = {};
  userBalances.forEach((balance, userId) => {
    result[userId] = balance;
  });
  return result;
}

// In production, replace these with database functions:
// - getUserBalanceFromDB(userId)
// - updateUserBalanceInDB(userId, amount)
// - isTransactionProcessedInDB(txHash)
// - markTransactionProcessedInDB(txHash, userId)

