// In production, use a database
export interface MiningRecord {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  startDate: string;
  dailyYield: number;
  totalEarnings: number;
  lastWithdrawal: string | null;
  nextWithdrawal: string;
}

let miningRecords: MiningRecord[] = [];

export function getMiningRecords(userId: string): MiningRecord[] {
  return miningRecords.filter(m => m.userId === userId);
}

export function getAllMiningRecords(): MiningRecord[] {
  return miningRecords;
}

export function addMiningRecord(record: MiningRecord): void {
  miningRecords.push(record);
}

export function updateMiningRecord(id: string, updates: Partial<MiningRecord>): void {
  const index = miningRecords.findIndex(r => r.id === id);
  if (index !== -1) {
    miningRecords[index] = { ...miningRecords[index], ...updates };
  }
}

export function getMiningRecord(id: string): MiningRecord | undefined {
  return miningRecords.find(r => r.id === id);
}

