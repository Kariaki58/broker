import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/authHelpers';
import { createServerClient } from '@/app/lib/supabaseClient';

// Get user's unique deposit address
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('users')
      .select('deposit_address')
      .eq('id', userId)
      .single();

    const user = data as { deposit_address: string | null } | null;

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.deposit_address) {
      return NextResponse.json(
        { error: 'Deposit address not found. Please contact support.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      depositAddress: user.deposit_address,
    });
  } catch (error) {
    console.error('Get deposit address error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error && error.message === 'Unauthorized' 
          ? 'Unauthorized' 
          : 'Failed to get deposit address' 
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

