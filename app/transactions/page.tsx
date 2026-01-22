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
  symbol: string;
  usdValue: number;
  status: 'pending' | 'confirmed' | 'failed';
  network: string;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  timestamp: string;
  confirmedAt?: string;
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
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      const response = await fetch('/api/transactions', {
        headers: { 
          'x-session-token': sessionToken,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        console.error('Failed to fetch transactions:', response.statusText);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
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
                {transactions.map((transaction) => {
                  const getExplorerUrl = (txHash: string, network: string) => {
                    if (network === 'TRON') {
                      return `https://tronscan.org/#/transaction/${txHash}`;
                    } else if (network === 'BSC') {
                      return `https://bscscan.com/tx/${txHash}`;
                    } else if (network === 'ETH') {
                      return `https://etherscan.io/tx/${txHash}`;
                    }
                    return '#';
                  };

                  const formatAddress = (address: string | null | undefined) => {
                    if (!address) return 'N/A';
                    return `${address.slice(0, 6)}...${address.slice(-4)}`;
                  };

                  return (
                    <div
                      key={transaction.id}
                      className="p-3 md:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          {transaction.type === 'deposit' ? (
                            <ArrowDownCircle className="text-blue-600 dark:text-blue-400 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                          ) : (
                            <ArrowUpCircle className="text-green-600 dark:text-green-400 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                                {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                              </p>
                              <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded">
                                {transaction.network}
                              </span>
                              {transaction.symbol && transaction.symbol !== 'USD' && (
                                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                  {transaction.symbol}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(transaction.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs md:text-sm font-semibold ${
                            transaction.type === 'deposit'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}${transaction.usdValue.toFixed(2)}
                          </p>
                          <p className={`text-xs mt-1 ${
                            transaction.status === 'confirmed'
                              ? 'text-green-600 dark:text-green-400'
                              : transaction.status === 'pending'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.status}
                          </p>
                        </div>
                      </div>
                      
                      {/* Transaction Details */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                        {transaction.txHash && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Transaction:</span>
                            <a
                              href={getExplorerUrl(transaction.txHash, transaction.network)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                            >
                              {formatAddress(transaction.txHash)}
                            </a>
                          </div>
                        )}
                        {transaction.fromAddress && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">From:</span>
                            <span className="text-gray-700 dark:text-gray-300 font-mono">
                              {formatAddress(transaction.fromAddress)}
                            </span>
                          </div>
                        )}
                        {transaction.toAddress && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">To:</span>
                            <span className="text-gray-700 dark:text-gray-300 font-mono">
                              {formatAddress(transaction.toAddress)}
                            </span>
                          </div>
                        )}
                        {transaction.amount > 0 && transaction.symbol && transaction.symbol !== 'USD' && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {transaction.amount.toFixed(6)} {transaction.symbol}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
