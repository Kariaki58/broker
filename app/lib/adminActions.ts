'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use service role key for admin actions to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function getAdminStats() {
  try {
    // Get total users
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Get pending withdrawals count
    const { count: pendingWithdrawals, error: withdrawalsError } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'withdrawal')
      .eq('status', 'pending');

    if (withdrawalsError) throw withdrawalsError;

    return {
      totalUsers: totalUsers || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw new Error('Failed to fetch admin stats');
  }
}

export async function getWithdrawalRequests() {
  try {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        users (
          email,
          role
        )
      `)
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    throw new Error('Failed to fetch withdrawal requests');
  }
}

export async function updateWithdrawalStatus(id: string, status: 'confirmed' | 'failed') {
  try {
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ status, confirmed_at: status === 'confirmed' ? new Date().toISOString() : null })
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    throw new Error('Failed to update withdrawal status');
  }
}
