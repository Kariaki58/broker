import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/authHelpers';
import { createServerClient } from '@/app/lib/supabaseClient';
import { encryptString } from '@/app/lib/crypto';

const TRON_RPC_URL = process.env.RPC_URL || 'https://api.trongrid.io';
const TRON_API_KEY = process.env.TRON_PRO_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const supabase = createServerClient();

    // Check if a primary deposit address already exists
    const { data: existing } = await supabase
      .from('user_wallet_addresses')
      .select('id, wallet_address')
      .eq('user_id', userId)
      .eq('purpose', 'deposit')
      .eq('is_primary', true)
      .eq('is_active', true)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        address: (existing as any).wallet_address,
      });
    }

    // Create new Tron account
    const { TronWeb } = await import('tronweb');

    const tronWeb = new TronWeb({
      fullHost: TRON_RPC_URL,
      headers: TRON_API_KEY
        ? { 'TRON-PRO-API-KEY': TRON_API_KEY }
        : undefined,
    });

    const account = await tronWeb.createAccount();
    const depositAddress = account.address.base58;
    const encryptedPk = encryptString(account.privateKey);

    // Mark existing primaries as not primary (safety)
    await (supabase.from('user_wallet_addresses') as any)
      .update({ is_primary: false })
      .eq('user_id', userId)
      .eq('purpose', 'deposit');

    // Store the new deposit address
    const { error: insertError } = await supabase
      .from('user_wallet_addresses')
      .insert({
        user_id: userId,
        wallet_address: depositAddress,
        label: 'Deposit',
        is_active: true,
        is_primary: true,
        purpose: 'deposit',
        private_key_enc: encryptedPk,
      } as any);

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Also store on users table for quick lookup (if column exists)
    // This is optional - the primary source is user_wallet_addresses table
    try {
      await (supabase.from('users') as any)
        .update({ deposit_address: depositAddress })
        .eq('id', userId);
    } catch (error) {
      // Column might not exist yet - that's okay, we have user_wallet_addresses
      console.warn('Could not update users.deposit_address (column may not exist):', error);
    }

    return NextResponse.json({
      success: true,
      address: depositAddress,
      created: true,
    });
  } catch (error) {
    console.error('Deposit address error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get deposit address',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


