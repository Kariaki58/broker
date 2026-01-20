'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // If true, requires auth. If false, requires no auth (for login/signup pages)
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for auth to load

    if (requireAuth && !isAuthenticated) {
      // User must be authenticated but isn't - redirect to login
      router.push('/login');
    } else if (!requireAuth && isAuthenticated) {
      // User must NOT be authenticated but is - redirect to home
      router.push('/');
    }
  }, [isAuthenticated, isLoading, requireAuth, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If auth requirements aren't met, don't render children (redirect will happen)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

