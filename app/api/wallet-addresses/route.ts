import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/authHelpers';
import { createServerClient } from '@/app/lib/supabaseClient';

// Get all wallet addresses for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const supabase = createServerClient();

    const { data: addresses, error } = await supabase
      .from('user_wallet_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      addresses: addresses || [],
    });
  } catch (error) {
    console.error('Get wallet addresses error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error && error.message === 'Unauthorized' 
          ? 'Unauthorized' 
          : 'Failed to get wallet addresses' 
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

// Add a new wallet address
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { walletAddress, label } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate address format (Tron TRC20)
    if (!walletAddress.startsWith('T') || walletAddress.length !== 34) {
      return NextResponse.json(
        { error: 'Invalid Tron wallet address format (must start with T and be 34 characters)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if address already exists for this user
    const { data: existing } = await supabase
      .from('user_wallet_addresses')
      .select('id')
      .eq('user_id', userId)
      .eq('wallet_address', walletAddress)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This wallet address is already registered' },
        { status: 400 }
      );
    }

    // Check if this is the first address (make it primary)
    const { count } = await supabase
      .from('user_wallet_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    const isPrimary = (count || 0) === 0;

    // If setting as primary, unset other primary addresses
    if (isPrimary) {
      await (supabase
        .from('user_wallet_addresses') as any)
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    // Add new wallet address
    const { data: newAddress, error } = await supabase
      .from('user_wallet_addresses')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        label: label || null,
        is_active: true,
        is_primary: isPrimary,
      } as any)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      address: newAddress,
    });
  } catch (error) {
    console.error('Add wallet address error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error && error.message === 'Unauthorized' 
          ? 'Unauthorized' 
          : error instanceof Error 
            ? error.message 
            : 'Failed to add wallet address' 
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

