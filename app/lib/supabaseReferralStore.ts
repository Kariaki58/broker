// Supabase-based referral store
import { createServerClient } from './supabaseClient';
import { ReferralRecord, ReferralTransaction } from './referralStore';

export async function getReferrals(referrerId: string): Promise<ReferralRecord[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('referral_records')
    .select('*')
    .eq('referrer_id', referrerId)
    .order('joined_date', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((record: any) => ({
    id: record.id,
    referrerId: record.referrer_id,
    referredId: record.referred_id,
    email: record.email,
    joinedDate: record.joined_date,
    status: record.status as 'active' | 'pending',
    totalEarnings: parseFloat(record.total_earnings.toString()),
    pendingEarnings: parseFloat(record.pending_earnings.toString()),
  }));
}

export async function getReferralStats(referrerId: string): Promise<{
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}> {
  const referrals = await getReferrals(referrerId);
  
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const totalEarnings = referrals.reduce((sum, r) => sum + r.totalEarnings, 0);
  const pendingEarnings = referrals.reduce((sum, r) => sum + r.pendingEarnings, 0);

  return {
    totalReferrals,
    activeReferrals,
    totalEarnings,
    pendingEarnings,
  };
}

export async function addReferral(referral: ReferralRecord): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('referral_records')
    .insert({
      id: referral.id,
      referrer_id: referral.referrerId,
      referred_id: referral.referredId,
      email: referral.email,
      joined_date: referral.joinedDate,
      status: referral.status,
      total_earnings: referral.totalEarnings,
      pending_earnings: referral.pendingEarnings,
    } as any);

  if (error) {
    throw new Error(`Failed to create referral record: ${error.message}`);
  }
}

export async function addReferralTransaction(transaction: ReferralTransaction): Promise<void> {
  const supabase = createServerClient();
  
  // Add transaction
  const { error: txError } = await supabase
    .from('referral_transactions')
    .insert({
      id: transaction.id,
      referral_id: transaction.referralId,
      type: transaction.type,
      amount: transaction.amount,
      commission: transaction.commission,
      date: transaction.date,
    } as any);

  if (txError) {
    throw new Error(`Failed to create referral transaction: ${txError.message}`);
  }

  // Update referral record
  const { data: referral } = await supabase
    .from('referral_records')
    .select('total_earnings, pending_earnings, status')
    .eq('id', transaction.referralId)
    .single();

  if (referral) {
    const referralData = referral as any;
    const newTotalEarnings = parseFloat(referralData.total_earnings.toString()) + transaction.commission;
    const newPendingEarnings = parseFloat(referralData.pending_earnings.toString()) + transaction.commission;
    
    // Mark as active if it's an investment transaction
    const updateData: any = {
      total_earnings: newTotalEarnings,
      pending_earnings: newPendingEarnings,
    };
    
    if (transaction.type === 'investment') {
      updateData.status = 'active';
    }

    await (supabase
      .from('referral_records') as any)
      .update(updateData)
      .eq('id', transaction.referralId);
  }
}

export async function withdrawReferralEarnings(referrerId: string): Promise<number> {
  const supabase = createServerClient();
  
  const referrals = await getReferrals(referrerId);
  const totalPending = referrals.reduce((sum, r) => sum + r.pendingEarnings, 0);
  
  // Reset pending earnings for all referrals
  if (referrals.length > 0) {
    await (supabase
      .from('referral_records') as any)
      .update({ pending_earnings: 0 })
      .eq('referrer_id', referrerId);
  }
  
  return totalPending;
}

export async function getReferralByReferredId(referredId: string): Promise<ReferralRecord | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('referral_records')
    .select('*')
    .eq('referred_id', referredId)
    .single();

  if (error || !data) {
    return null;
  }

  const record = data as any;
  return {
    id: record.id,
    referrerId: record.referrer_id,
    referredId: record.referred_id,
    email: record.email,
    joinedDate: record.joined_date,
    status: record.status as 'active' | 'pending',
    totalEarnings: parseFloat(record.total_earnings.toString()),
    pendingEarnings: parseFloat(record.pending_earnings.toString()),
  };
}

