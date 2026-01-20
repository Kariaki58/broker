import { NextRequest, NextResponse } from 'next/server';

// This endpoint should be called by a cron job or scheduled task
// It automatically checks for new deposits and processes them
// 
// Setup instructions:
// 1. Use a cron service (Vercel Cron, GitHub Actions, etc.) to call this endpoint
// 2. Recommended: Run every 1-2 minutes for real-time processing
// 3. Protect with a secret token in production
//
// Example Vercel Cron (vercel.json):
// {
//   "crons": [{
//     "path": "/api/deposits/cron",
//     "schedule": "*/2 * * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret token (if set)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the deposit check endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const checkResponse = await fetch(`${baseUrl}/api/deposits/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      const errorData = await checkResponse.json().catch(() => ({}));
      throw new Error(`Deposit check failed: ${errorData.error || checkResponse.statusText}`);
    }

    const result = await checkResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Deposit check completed',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run deposit check cron job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}

