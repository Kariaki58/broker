'use client';

import { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface WithdrawFundsProps {
  onWithdrawSuccess?: () => void;
}

export default function WithdrawFunds({ onWithdrawSuccess }: WithdrawFundsProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState(0);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      const response = await fetch('/api/account/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (withdrawAmount < 10) {
      setError('Minimum withdrawal amount is $10');
      return;
    }

    if (withdrawAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum wallet address');
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        setError('Please log in to withdraw funds');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/account/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          walletAddress: walletAddress.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setAmount('');
        setBalance(data.newBalance || 0);
        onWithdrawSuccess?.();
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(data.error || 'Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setError('Failed to process withdrawal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(balance.toFixed(2));
  };

  return (
    <div>
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/40 rounded-lg flex-shrink-0">
          <ArrowUpCircle className="text-green-600 dark:text-green-400 w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            Withdraw Funds
          </h3>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            Withdraw to your wallet address
          </p>
        </div>
      </div>


      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 md:p-4 flex items-start space-x-2 md:space-x-3">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 w-4 h-4 md:w-5 md:h-5" />
          <p className="text-xs md:text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Available Balance
          </label>
          <div className="px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Withdrawal Amount (USD)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="10"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <button
              type="button"
              onClick={setMaxAmount}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
            >
              Max
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minimum withdrawal: $10.00
          </p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter your Ethereum wallet address (0x...)
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !amount || !walletAddress}
          className="w-full px-4 py-2.5 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm md:text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span>Withdraw Funds</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Withdrawals are processed within 24 hours. Make sure your wallet address is correct as transactions cannot be reversed.
        </p>
      </div>
    </div>
  );
}

