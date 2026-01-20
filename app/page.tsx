'use client';

import { useState, useEffect } from 'react';
import AccountBalance from './components/AccountBalance';
import CryptoCard from './components/CryptoCard';
import DepositFunds from './components/DepositFunds';
import WithdrawFunds from './components/WithdrawFunds';
import { ArrowRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from './lib/authContext';
import ProtectedRoute from './components/ProtectedRoute';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export default function Home() {
  const { user, isLoading: userLoading, isAuthenticated } = useAuth();
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    // Handle referral code from URL
    if (!userLoading && user) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode && refCode !== user.referralCode) {
        // Track referral signup
        fetch('/api/referral/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'signup',
            userId: user.id,
            referralCode: refCode,
            email: user.email,
          }),
        }).catch(error => {
          console.error('Error tracking referral:', error);
        });

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    // Simulate fetching crypto data
    const fetchCryptoData = async () => {
      // In a real app, this would fetch from an API
      const mockData: CryptoData[] = [
        { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change24h: 2.45 },
        { symbol: 'ETH', name: 'Ethereum', price: 2650.00, change24h: -1.23 },
        { symbol: 'BNB', name: 'Binance Coin', price: 315.50, change24h: 0.87 },
        { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.12 },
        { symbol: 'ADA', name: 'Cardano', price: 0.52, change24h: -0.45 },
        { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: 1.89 },
      ];
      setCryptoData(mockData);
    };

    fetchCryptoData();
    // Simulate real-time updates
    const interval = setInterval(() => {
      setCryptoData(prev => prev.map(crypto => ({
        ...crypto,
        price: crypto.price * (1 + (Math.random() - 0.5) * 0.02),
        change24h: crypto.change24h + (Math.random() - 0.5) * 0.5,
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [user, userLoading]);

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Manage your crypto investments
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <AccountBalance />
          </div>
        </div>

        {/* Deposit and Withdrawal Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-semibold transition-all ${
                activeTab === 'deposit'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-semibold transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span>Withdraw</span>
            </button>
          </div>

          {/* Success Messages */}
          {depositSuccess && (
            <div className="mx-6 mt-4 mb-0 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
              <ArrowDownCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                  Deposit Detected!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Your account balance will be updated shortly.
                </p>
              </div>
            </div>
          )}

          {withdrawSuccess && (
            <div className="mx-6 mt-4 mb-0 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
              <ArrowUpCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                  Withdrawal Request Submitted!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Your withdrawal will be processed within 24 hours.
                </p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === 'deposit' ? (
              <DepositFunds 
                onDepositSuccess={() => {
                  setDepositSuccess(true);
                  setTimeout(() => setDepositSuccess(false), 5000);
                }} 
              />
            ) : (
              <WithdrawFunds 
                onWithdrawSuccess={() => {
                  setWithdrawSuccess(true);
                  setTimeout(() => setWithdrawSuccess(false), 5000);
                }} 
              />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            href="/mining"
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Start Mining</p>
              <p className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">3% Daily Yield</p>
            </div>
            <ArrowRight className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-5 md:h-5" />
          </Link>
          <Link
            href="/referral"
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Referral Program</p>
              <p className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Earn Rewards</p>
            </div>
            <ArrowRight className="text-blue-600 dark:text-blue-400" size={20} />
          </Link>
        </div>

        {/* Market Overview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              Market Overview
            </h2>
            <Link
              href="/markets"
              className="text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cryptoData.map((crypto) => (
              <CryptoCard
                key={crypto.symbol}
                symbol={crypto.symbol}
                name={crypto.name}
                price={crypto.price}
                change24h={crypto.change24h}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
