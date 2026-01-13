'use client';

import { useState, useEffect } from 'react';
import { Wallet, DollarSign } from 'lucide-react';

interface AccountBalanceProps {
  userId?: string;
}

export default function AccountBalance({ userId }: AccountBalanceProps) {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    // Poll for balance updates every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/account/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg px-4 py-3 border border-blue-200 dark:border-blue-800">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
        <DollarSign className="text-blue-600 dark:text-blue-400" size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-600 dark:text-gray-400">Account Balance</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {isLoading ? 'Loading...' : `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </span>
      </div>
    </div>
  );
}

