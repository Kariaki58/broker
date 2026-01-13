'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';

// Trust Wallet address - configure in .env.local as NEXT_PUBLIC_TRUST_WALLET_ADDRESS
// Default address for demo purposes only - REPLACE WITH YOUR ACTUAL TRUST WALLET ADDRESS
const TRUST_WALLET_ADDRESS = process.env.NEXT_PUBLIC_TRUST_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

interface DepositFundsProps {
  onDepositSuccess?: () => void;
}

export default function DepositFunds({ onDepositSuccess }: DepositFundsProps) {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(TRUST_WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkDeposits = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/deposits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.newDeposits && data.newDeposits.length > 0) {
          setPendingDeposits(data.newDeposits);
          onDepositSuccess?.();
          
          // Deposits are already processed by /api/deposits/check
          // No need to call /api/deposits/process again (prevents double-crediting)
          // The balance has already been updated server-side
        }
      }
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking deposits:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Auto-check every 30 seconds
    const interval = setInterval(checkDeposits, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const viewOnExplorer = () => {
    // Open in Etherscan or appropriate blockchain explorer
    const explorerUrl = `https://etherscan.io/address/${TRUST_WALLET_ADDRESS}`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
          <Wallet className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fund Your Account
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Send cryptocurrency to the address below
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deposit Address (Trust Wallet)
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <code className="text-sm text-gray-900 dark:text-white break-all">
                {TRUST_WALLET_ADDRESS}
              </code>
            </div>
            <button
              onClick={copyToClipboard}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              aria-label="Copy address"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Important:</strong> Supported cryptocurrencies: <strong>ETH, USDT, USDC</strong>. 
            Sending unsupported tokens may result in loss of funds. Deposits are automatically detected within 1-3 minutes.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={checkDeposits}
              disabled={isChecking}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
            </button>
            {lastChecked && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={viewOnExplorer}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <span>View on Explorer</span>
            <ExternalLink size={16} />
          </button>
        </div>

        {pendingDeposits.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pending Deposits:
            </p>
            {pendingDeposits.map((deposit, index) => (
              <div
                key={index}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {deposit.amount} {deposit.symbol}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {deposit.status === 'pending' ? 'Pending confirmation...' : 'Confirmed'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                    ${deposit.usdValue?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

