'use client';

import { useState } from 'react';
import DepositFunds from '../components/DepositFunds';
import AccountBalance from '../components/AccountBalance';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function DepositPage() {
  const [depositSuccess, setDepositSuccess] = useState(false);

  const handleDepositSuccess = () => {
    setDepositSuccess(true);
    setTimeout(() => setDepositSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Deposit Funds
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Add funds to your trading account
            </p>
          </div>
        </div>

        {/* Success Message */}
        {depositSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Deposit Detected!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your account balance will be updated shortly.
              </p>
            </div>
          </div>
        )}

        {/* Account Balance */}
        <div className="mb-6">
          <AccountBalance />
        </div>

        {/* Deposit Form */}
        <DepositFunds onDepositSuccess={handleDepositSuccess} />

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            How to Deposit
          </h3>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
                1
              </span>
              <span>Copy the deposit address above</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
                2
              </span>
              <span>Send your cryptocurrency from your wallet to the address</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
                3
              </span>
              <span>Wait for blockchain confirmation (usually 1-3 minutes)</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
                4
              </span>
              <span>Click "Check Status" or wait for automatic detection</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
                5
              </span>
              <span>Your balance will be updated automatically</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

