// Supabase-based mining store
import { createServerClient } from './supabaseClient';
import { MiningRecord } from './miningStore';

// Re-export MiningRecord for use in other files
export type { MiningRecord };

export async function getMiningRecords(userId: string): Promise<MiningRecord[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('mining_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((record: any) => ({
    id: record.id,
    userId: record.user_id,
    planId: record.plan_id,
    amount: parseFloat(record.amount.toString()),
    startDate: record.start_date,
    dailyYield: parseFloat(record.daily_yield.toString()),
    totalEarnings: parseFloat(record.total_earnings.toString()),
    lastWithdrawal: record.last_withdrawal,
    nextWithdrawal: record.next_withdrawal,
  }));
}

export async function addMiningRecord(record: MiningRecord): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('mining_records')
    .insert({
      id: record.id,
      user_id: record.userId,
      plan_id: record.planId,
      amount: record.amount,
      start_date: record.startDate,
      daily_yield: record.dailyYield,
      total_earnings: record.totalEarnings,
      last_withdrawal: record.lastWithdrawal,
      next_withdrawal: record.nextWithdrawal,
    } as any);

  if (error) {
    throw new Error(`Failed to create mining record: ${error.message}`);
  }
}

export async function updateMiningRecord(id: string, updates: Partial<MiningRecord>): Promise<void> {
  const supabase = createServerClient();
  
  const updateData: any = {};
  if (updates.totalEarnings !== undefined) updateData.total_earnings = updates.totalEarnings;
  if (updates.lastWithdrawal !== undefined) updateData.last_withdrawal = updates.lastWithdrawal;
  if (updates.nextWithdrawal !== undefined) updateData.next_withdrawal = updates.nextWithdrawal;

  const { error } = await (supabase
    .from('mining_records') as any)
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update mining record: ${error.message}`);
  }
}

export async function getMiningRecord(id: string): Promise<MiningRecord | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('mining_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const record = data as any;
  return {
    id: record.id,
    userId: record.user_id,
    planId: record.plan_id,
    amount: parseFloat(record.amount.toString()),
    startDate: record.start_date,
    dailyYield: parseFloat(record.daily_yield.toString()),
    totalEarnings: parseFloat(record.total_earnings.toString()),
    lastWithdrawal: record.last_withdrawal,
    nextWithdrawal: record.next_withdrawal,
  };
}

