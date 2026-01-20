// Supabase-based balance store
import { createServerClient } from './supabaseClient';

export async function getUserBalance(userId: string): Promise<number> {
  const supabase = createServerClient();
  
  const { data: balance, error } = await supabase
    .from('balances')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error || !balance) {
    // Create balance record if it doesn't exist
    await supabase
      .from('balances')
      .insert({
        user_id: userId,
        balance: 0.00,
      } as any);
    return 0;
  }

  const balanceRow = balance as any;
  return parseFloat(balanceRow.balance.toString());
}

export async function updateUserBalance(userId: string, amount: number): Promise<number> {
  const supabase = createServerClient();
  
  // Get current balance
  const currentBalance = await getUserBalance(userId);
  const newBalance = currentBalance + amount;

  // Update balance
  const { error } = await supabase
    .from('balances')
    .upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    } as any, {
      onConflict: 'user_id',
    });

  if (error) {
    throw new Error(`Failed to update balance: ${error.message}`);
  }

  return newBalance;
}

export async function setUserBalance(userId: string, balance: number): Promise<void> {
  const supabase = createServerClient();
  
  await supabase
    .from('balances')
    .upsert({
      user_id: userId,
      balance: balance,
      updated_at: new Date().toISOString(),
    } as any, {
      onConflict: 'user_id',
    });
}

export async function isTransactionProcessed(txHash: string): Promise<boolean> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('processed_transactions')
    .select('id')
    .eq('tx_hash', txHash.toLowerCase())
    .single();

  return !error && !!data;
}

export async function markTransactionProcessed(txHash: string, userId?: string): Promise<void> {
  const supabase = createServerClient();
  
  await supabase
    .from('processed_transactions')
    .insert({
      tx_hash: txHash.toLowerCase(),
      user_id: userId || null,
      processed_at: new Date().toISOString(),
    } as any);
}

export async function getAllBalances(): Promise<Record<string, number>> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('balances')
    .select('user_id, balance');

  if (error || !data) {
    return {};
  }

  const result: Record<string, number> = {};
  data.forEach((row: any) => {
    result[row.user_id] = parseFloat(row.balance.toString());
  });

  return result;
}

