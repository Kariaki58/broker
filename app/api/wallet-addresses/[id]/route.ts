import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/authHelpers';
import { createServerClient } from '@/app/lib/supabaseClient';

// Update wallet address (set as primary, update label, or delete)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { isPrimary, label, isActive } = body;

    const supabase = createServerClient();

    // Verify the address belongs to the user
    const { data: address, error: fetchError } = await (supabase
      .from('user_wallet_addresses') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !address) {
      return NextResponse.json(
        { error: 'Wallet address not found' },
        { status: 404 }
      );
    }

    // If setting as primary, unset other primary addresses
    if (isPrimary === true) {
      await (supabase
        .from('user_wallet_addresses') as any)
        .update({ is_primary: false })
        .eq('user_id', userId)
        .neq('id', id);
    }

    // Update the address
    const updateData: any = {};
    if (isPrimary !== undefined) updateData.is_primary = isPrimary;
    if (label !== undefined) updateData.label = label;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: updated, error } = await (supabase
      .from('user_wallet_addresses') as any)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      address: updated,
    });
  } catch (error) {
    console.error('Update wallet address error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error && error.message === 'Unauthorized' 
          ? 'Unauthorized' 
          : 'Failed to update wallet address' 
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

// Delete wallet address (soft delete by setting is_active to false)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const { id } = await params;

    const supabase = createServerClient();

    // Verify the address belongs to the user
    const { data: address } = await (supabase
      .from('user_wallet_addresses') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address not found' },
        { status: 404 }
      );
    }

    // Soft delete (set is_active to false)
    const { error } = await (supabase
      .from('user_wallet_addresses') as any)
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // If this was the primary address, set another one as primary
    if (address.is_primary) {
      const { data: otherAddress } = await (supabase
        .from('user_wallet_addresses') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .neq('id', id)
        .limit(1)
        .single();

      if (otherAddress) {
        await (supabase
          .from('user_wallet_addresses') as any)
          .update({ is_primary: true })
          .eq('id', otherAddress.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet address removed',
    });
  } catch (error) {
    console.error('Delete wallet address error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error && error.message === 'Unauthorized' 
          ? 'Unauthorized' 
          : 'Failed to delete wallet address' 
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

