'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  walletAddress?: string;
  referralCode: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user from localStorage or create new one
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Check for referral code in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');

        // Check for existing user in localStorage
        const storedUserId = localStorage.getItem('userId');
        const storedUser = storedUserId ? localStorage.getItem(`user-${storedUserId}`) : null;

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoading(false);
          
          // If there's a referral code and user wasn't referred before, track it
          if (refCode && refCode !== parsedUser.referralCode) {
            try {
              await fetch('/api/referral/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'signup',
                  userId: parsedUser.id,
                  referralCode: refCode,
                  email: parsedUser.email,
                }),
              });
            } catch (error) {
              console.error('Error tracking referral:', error);
            }
          }
        } else {
          // Create new user with referral code if present
          const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const response = await fetch('/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: newUserId,
              referrerCode: refCode || undefined,
            }),
          });

          if (response.ok) {
            const newUser = await response.json();
            setUser(newUser);
            localStorage.setItem('userId', newUser.id);
            localStorage.setItem(`user-${newUser.id}`, JSON.stringify(newUser));
          } else {
            console.error('Failed to create user');
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/user/${user.id}`);
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem(`user-${updatedUser.id}`, JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, isLoading, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

