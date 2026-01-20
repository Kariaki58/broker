'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  walletAddress?: string;
  referralCode: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, walletAddress?: string, referrerCode?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const sessionToken = localStorage.getItem('sessionToken');
        if (sessionToken) {
          // Validate session
          const response = await fetch('/api/auth/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken }),
          });

          if (response.ok) {
            const userData = await response.json();
            const user = {
              id: userData.id,
              email: userData.email,
              walletAddress: userData.walletAddress,
              referralCode: userData.referralCode || `REF-${userData.id.substring(0, 8).toUpperCase()}`,
            };
            setUser(user);
            
            // Ensure referral code is always available
            if (!userData.referralCode) {
              // Fetch referral code from API
              try {
                const refResponse = await fetch('/api/referral/status', {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-session-token': sessionToken,
                  },
                });
                if (refResponse.ok) {
                  const refData = await refResponse.json();
                  setUser({ ...user, referralCode: refData.referralCode });
                }
              } catch (error) {
                console.error('Error fetching referral code:', error);
              }
            }
          } else {
            // Invalid session, clear it
            localStorage.removeItem('sessionToken');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('sessionToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('sessionToken', data.sessionToken);
    const userData = {
      id: data.user.id,
      email: data.user.email,
      walletAddress: data.user.walletAddress,
      referralCode: data.user.referralCode || `REF-${data.user.id.substring(0, 8).toUpperCase()}`,
    };
    setUser(userData);
    
    // Ensure referral code is always available
    if (!data.user.referralCode) {
      // Fetch referral code from API
      try {
        const refResponse = await fetch('/api/referral/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': data.sessionToken,
          },
        });
        if (refResponse.ok) {
          const refData = await refResponse.json();
          setUser({ ...userData, referralCode: refData.referralCode });
        }
      } catch (error) {
        console.error('Error fetching referral code:', error);
      }
    }
  };

  const register = async (email: string, password: string, walletAddress?: string, referrerCode?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, walletAddress, referrerCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('sessionToken', data.sessionToken);
    const userData = {
      id: data.user.id,
      email: data.user.email,
      walletAddress: data.user.walletAddress,
      referralCode: data.user.referralCode || `REF-${data.user.id.substring(0, 8).toUpperCase()}`,
    };
    setUser(userData);
    
    // Ensure referral code is always available
    if (!data.user.referralCode) {
      // Fetch referral code from API
      try {
        const refResponse = await fetch('/api/referral/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': data.sessionToken,
          },
        });
        if (refResponse.ok) {
          const refData = await refResponse.json();
          setUser({ ...userData, referralCode: refData.referralCode });
        }
      } catch (error) {
        console.error('Error fetching referral code:', error);
      }
    }
  };

  const logout = () => {
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      }).catch(console.error);
    }
    localStorage.removeItem('sessionToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

