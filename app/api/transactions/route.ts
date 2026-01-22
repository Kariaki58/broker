import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/authHelpers';
import { createServerClient } from '@/app/lib/supabaseClient';

/**
 * Get user's transaction history
 * GET /api/transactions
 * 
 * Query params:
 * - limit: number of transactions to return (default: 50)
 * - offset: pagination offset (default: 0)
 * - type: filter by type ('deposit' | 'withdrawal')
 * - network: filter by network ('TRON' | 'BSC' | 'ETH')
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const supabase = createServerClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 'deposit' | 'withdrawal'
    const network = searchParams.get('network'); // 'TRON' | 'BSC' | 'ETH'

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (network) {
      query = query.eq('network', network);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Format transactions for frontend
    const formattedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount || '0'),
      symbol: tx.symbol || 'USD',
      usdValue: parseFloat(tx.usd_value?.toString() || '0'),
      status: tx.status || 'pending',
      network: tx.network || 'TRON',
      txHash: tx.tx_hash,
      fromAddress: tx.from_address,
      toAddress: tx.to_address,
      timestamp: tx.created_at || tx.confirmed_at,
      confirmedAt: tx.confirmed_at,
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      count: formattedTransactions.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

