// Helper functions for authentication in API routes
import { validateSession } from './supabaseAuthStore';
import { NextRequest } from 'next/server';

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get session token from various sources
  const bearer = request.headers.get('authorization');
  const bearerToken = bearer?.toLowerCase().startsWith('bearer ')
    ? bearer.slice(7).trim()
    : null;
  const urlToken = request.nextUrl.searchParams.get('sessionToken');
  const sessionToken = 
    request.headers.get('x-session-token') ||
    bearerToken ||
    urlToken ||
    request.cookies.get('sessionToken')?.value ||
    null;

  if (!sessionToken) {
    return null;
  }

  const user = await validateSession(sessionToken);
  return user?.id || null;
}

export async function requireAuth(request: NextRequest): Promise<{ userId: string }> {
  const userId = await getUserIdFromRequest(request);
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  return { userId };
}

