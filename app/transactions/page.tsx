'use client';

import { useState, useEffect, Suspense } from 'react';
import DepositFunds from '../components/DepositFunds';
import WithdrawFunds from '../components/WithdrawFunds';
import AccountBalance from '../components/AccountBalance';
import WalletAddressManager from '../components/WalletAddressManager';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '../components/ProtectedRoute';
import { useSearchParams } from 'next/navigation';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  txHash?: string;
  walletAddress?: string;
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action') || 'deposit';
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>(action === 'withdraw' ? 'withdraw' : 'deposit');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Set active tab based on URL parameter
    if (action === 'withdraw') {
      setActiveTab('withdraw');
    } else if (action === 'history') {
      setActiveTab('history');
    } else {
      setActiveTab('deposit');
    }
  }, [action]);

  useEffect(() => {
    // Fetch transaction history
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async () => {
    // In production, this would fetch from an API
    // For now, we'll use mock data or localStorage
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      // TODO: Implement actual API endpoint for transaction history
      // const response = await fetch('/api/transactions', {
      //   headers: { 'x-session-token': sessionToken },
      // });
      
      // Mock transactions for now
      const mockTransactions: Transaction[] = [];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleDepositSuccess = () => {
    setDepositSuccess(true);
    setTimeout(() => setDepositSuccess(false), 5000);
    fetchTransactionHistory();
  };

  const handleWithdrawSuccess = () => {
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 5000);
    fetchTransactionHistory();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors self-start"
          >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Transactions
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Deposit, withdraw, and view your transaction history
            </p>
          </div>
        </div>

        {/* Account Balance */}
        <div className="mb-6">
          <AccountBalance />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-lg font-semibold transition-colors ${
                activeTab === 'deposit'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-lg font-semibold transition-colors ${
                activeTab === 'withdraw'
                  ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-lg font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Receipt className="w-4 h-4 md:w-5 md:h-5" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Success Messages */}
        {depositSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 md:p-4 flex items-center space-x-2 md:space-x-3">
            <ArrowDownCircle className="text-green-600 dark:text-green-400 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div>
              <p className="text-xs md:text-sm font-medium text-green-800 dark:text-green-200">
                Deposit Detected!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Your account balance will be updated shortly.
              </p>
            </div>
          </div>
        )}

        {withdrawSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 md:p-4 flex items-center space-x-2 md:space-x-3">
            <ArrowUpCircle className="text-green-600 dark:text-green-400 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div>
              <p className="text-xs md:text-sm font-medium text-green-800 dark:text-green-200">
                Withdrawal Request Submitted!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Your withdrawal will be processed within 24 hours.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'deposit' && (
          <div className="space-y-6">
            {/* Wallet Address Manager */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
              <WalletAddressManager />
            </div>
            
            <DepositFunds onDepositSuccess={handleDepositSuccess} />
            
            {/* Instructions */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                How to Deposit
              </h3>
              <ol className="space-y-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold text-xs">
                    1
                  </span>
                  <span className="flex-1">Copy the deposit address above</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold text-xs">
                    2
                  </span>
                  <span className="flex-1">Send your cryptocurrency from your wallet to the address</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold text-xs">
                    3
                  </span>
                  <span className="flex-1">Wait for blockchain confirmation (usually 1-3 minutes)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold text-xs">
                    4
                  </span>
                  <span className="flex-1">Click "Check Status" or wait for automatic detection</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold text-xs">
                    5
                  </span>
                  <span className="flex-1">Your balance will be updated automatically</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="space-y-6">
            <WithdrawFunds onWithdrawSuccess={handleWithdrawSuccess} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Transaction History
            </h3>
            
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="mx-auto text-gray-400 dark:text-gray-600 mb-4 w-12 h-12 md:w-12 md:h-12" />
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  No transactions yet
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Your deposit and withdrawal history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      {transaction.type === 'deposit' ? (
                        <ArrowDownCircle className="text-blue-600 dark:text-blue-400 w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <ArrowUpCircle className="text-green-600 dark:text-green-400 w-5 h-5 md:w-6 md:h-6" />
                      )}
                      <div>
                        <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs md:text-sm font-semibold ${
                        transaction.type === 'deposit'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </p>
                      <p className={`text-xs ${
                        transaction.status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : transaction.status === 'pending'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      }>
        <TransactionsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
