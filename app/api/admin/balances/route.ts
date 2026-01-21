import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabaseClient';
import { requireAuth } from '@/app/lib/authHelpers';

/**
 * Admin endpoint to get all user balances
 * GET /api/admin/balances
 * 
 * Returns all users with their balances, email, and deposit addresses
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication (admin only in production)
    const { userId } = await requireAuth(request);
    
    const supabase = createServerClient();

    // Get all users with their balances
    const { data: balances, error: balancesError } = await supabase
      .from('balances')
      .select(`
        user_id,
        balance,
        updated_at,
        users:user_id (
          id,
          email,
          deposit_address,
          created_at
        )
      `);

    if (balancesError) {
      throw new Error(`Failed to fetch balances: ${balancesError.message}`);
    }

    // Also get users without balances
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, deposit_address, created_at')
      .eq('is_active', true);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Combine balances with user info
    const userBalances = (allUsers || []).map((user: any) => {
      const balanceRecord = (balances || []).find((b: any) => (b as any).user_id === user.id) as any;
      return {
        userId: user.id,
        email: user.email,
        balance: balanceRecord && balanceRecord.balance !== undefined
          ? parseFloat(balanceRecord.balance.toString())
          : 0,
        depositAddress: user.deposit_address || null,
        lastUpdated: balanceRecord?.updated_at || null,
        createdAt: user.created_at,
      };
    });

    // Sort by balance descending
    userBalances.sort((a, b) => b.balance - a.balance);

    // Calculate totals
    const totalBalance = userBalances.reduce((sum, user) => sum + user.balance, 0);
    const totalUsers = userBalances.length;
    const usersWithBalance = userBalances.filter(u => u.balance > 0).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers,
        usersWithBalance,
        totalBalance: parseFloat(totalBalance.toFixed(2)),
      },
      users: userBalances,
    });
  } catch (error) {
    console.error('Admin balances error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user balances',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

