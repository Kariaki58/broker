'use client';

import { useState, useEffect } from 'react';
import AccountBalance from '../components/AccountBalance';
import { ArrowLeft, Bot } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import ProtectedRoute from '../components/ProtectedRoute';

interface MiningPlan {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  dailyYield: number;
  duration: number;
}

interface MiningStatus {
  id: string;
  planId: string;
  amount: number;
  startDate: string;
  dailyEarnings: number;
  totalEarnings: number;
  nextWithdrawal: string;
}

export default function MiningPage() {
  const { user, isLoading: userLoading } = useAuth();
  const [activeMining, setActiveMining] = useState<MiningStatus[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [balance, setBalance] = useState(0);

  const miningPlans: MiningPlan[] = [
    {
      id: 'super-model-x',
      name: 'Super Model-X',
      minAmount: 600,
      maxAmount: 2000,
      dailyYield: 2.9,
      duration: 280,
    },
    {
      id: 'super-model-d',
      name: 'Super Model-D',
      minAmount: 300,
      maxAmount: 1000,
      dailyYield: 2.7,
      duration: 180,
    },
    {
      id: 'super-model-c',
      name: 'Super Model-C',
      minAmount: 100,
      maxAmount: 500,
      dailyYield: 2.6,
      duration: 90,
    },
  ];

  useEffect(() => {
    if (!userLoading && user) {
      fetchActiveMining();
      fetchBalance();
    }
  }, [user, userLoading]);

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

  const fetchActiveMining = async () => {
    if (!user) return;

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      const response = await fetch('/api/mining/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActiveMining(data.activeMining || []);
        setTotalEarnings(data.totalEarnings || 0);
      } else {
        const error = await response.json();
        console.error('Error fetching mining status:', error);
      }
    } catch (error) {
      console.error('Error fetching mining status:', error);
    }
  };

  const handleBuyNow = (planId: string) => {
    setShowModal(planId);
    setInvestmentAmount('');
  };

  const handlePurchase = async (planId: string) => {
    if (!investmentAmount) {
      alert('Please enter investment amount');
      return;
    }

    const amount = parseFloat(investmentAmount);
    const plan = miningPlans.find(p => p.id === planId);

    if (!plan) return;

    if (amount < plan.minAmount || amount > plan.maxAmount) {
      alert(`Investment amount must be between ${plan.minAmount} and ${plan.maxAmount} USDT`);
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance. Please deposit funds first.');
      return;
    }

    if (!user) {
      alert('Please log in to purchase mining plan');
      return;
    }

    setIsSubmitting(planId);
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        alert('Please log in to purchase mining plan');
        setIsSubmitting(null);
        return;
      }

      const response = await fetch('/api/mining/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({
          planId,
          amount,
        }),
      });

      if (response.ok) {
        alert('Mining plan purchased successfully!');
        setShowModal(null);
        setInvestmentAmount('');
        fetchActiveMining();
        fetchBalance();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to purchase mining plan');
      }
    } catch (error) {
      console.error('Error purchasing mining plan:', error);
      alert('Failed to purchase mining plan. Please try again.');
    } finally {
      setIsSubmitting(null);
    }
  };

  const getPlanStatus = (planId: string): 'active' | 'not-started' => {
    const hasActiveMining = activeMining.some(m => m.planId === planId);
    return hasActiveMining ? 'active' : 'not-started';
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Mining Plans
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Choose your mining package
              </p>
            </div>
          </div>
          <AccountBalance />
        </div>

        {/* Mining Plans List */}
        <div className="space-y-4 mb-6">
          {miningPlans.map((plan) => {
            const status = getPlanStatus(plan.id);
            const isPurchasing = isSubmitting === plan.id;
            
            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Robot Icon */}
                  <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </div>

                  {/* Plan Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {plan.name}
                        </h3>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">
                          CryptoBroker
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                        status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {status === 'active' ? 'Active' : 'Not started'}
                      </span>
                    </div>

                    {/* Plan Info */}
                    <div className="space-y-1.5 mb-4">
                      <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Daily yield:</span> {plan.dailyYield}%
                      </div>
                      <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Life cycle:</span> {plan.duration} days
                      </div>
                      <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Purchase amount:</span> {plan.minAmount}-{plan.maxAmount} USDT
                      </div>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => handleBuyNow(plan.id)}
                      disabled={isPurchasing || status === 'active'}
                      className={`w-full py-2.5 md:py-3 rounded-lg font-semibold text-sm md:text-base transition-colors ${
                        status === 'active'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isPurchasing ? 'Processing...' : status === 'active' ? 'Already Active' : 'Buy it now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Mining Section */}
        {activeMining.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">Active Mining</h2>
            <div className="space-y-4">
              {activeMining.map((mining, index) => {
                const plan = miningPlans.find(p => p.id === mining.planId);
                const now = new Date();
                const nextWithdrawal = new Date(mining.nextWithdrawal);
                const daysUntil = Math.ceil((nextWithdrawal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const canWithdraw = daysUntil <= 0;
                
                return (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                          {plan?.name || 'Mining Plan'}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          Invested: {mining.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Daily Earnings</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          ${mining.dailyEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total Earnings</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${mining.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Next Withdrawal</span>
                        <span className={`font-semibold ${canWithdraw ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {canWithdraw ? 'Available Now' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!user) {
                          alert('Please log in to withdraw');
                          return;
                        }

                        try {
                          const sessionToken = localStorage.getItem('sessionToken');
                          if (!sessionToken) {
                            alert('Please log in to withdraw');
                            return;
                          }

                          const response = await fetch('/api/mining/withdraw', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-session-token': sessionToken,
                            },
                            body: JSON.stringify({
                              miningId: mining.id,
                            }),
                          });

                          if (response.ok) {
                            alert('Withdrawal successful!');
                            fetchActiveMining();
                            fetchBalance();
                          } else {
                            const error = await response.json();
                            alert(error.error || 'Failed to withdraw');
                          }
                        } catch (error) {
                          console.error('Error withdrawing:', error);
                          alert('Failed to withdraw. Please try again.');
                        }
                      }}
                      disabled={!canWithdraw}
                      className={`w-full py-2 px-4 rounded-lg text-sm md:text-base font-semibold transition-colors ${
                        canWithdraw
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {canWithdraw ? 'Withdraw Earnings' : 'Withdrawal Not Available'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50
        bg-white/30 dark:bg-black/30 backdrop-blur-md">

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
              Purchase {miningPlans.find(p => p.id === showModal)?.name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Investment Amount (USDT)
              </label>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder={`Enter amount (${miningPlans.find(p => p.id === showModal)?.minAmount}-${miningPlans.find(p => p.id === showModal)?.maxAmount})`}
                min={miningPlans.find(p => p.id === showModal)?.minAmount}
                max={miningPlans.find(p => p.id === showModal)?.maxAmount}
                className="w-full px-4 py-3 text-sm md:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Available balance: {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(null);
                  setInvestmentAmount('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm md:text-base transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePurchase(showModal)}
                disabled={isSubmitting === showModal || !investmentAmount}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm md:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting === showModal ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
