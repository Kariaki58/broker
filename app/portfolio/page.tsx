'use client';

import { useState, useEffect } from 'react';
import AccountBalance from '../components/AccountBalance';
import PortfolioCard from '../components/PortfolioCard';
import { TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Holding {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  value: number;
  change24h: number;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValue, setTotalValue] = useState(12500.00);
  const [totalChange, setTotalChange] = useState(250.00);
  const [totalChangePercent, setTotalChangePercent] = useState(2.04);

  useEffect(() => {
    // Simulate portfolio data
    const mockHoldings: Holding[] = [
      { symbol: 'BTC', name: 'Bitcoin', amount: 0.25, price: 43250.00, value: 10812.50, change24h: 2.45 },
      { symbol: 'ETH', name: 'Ethereum', amount: 2.5, price: 2650.00, value: 6625.00, change24h: -1.23 },
      { symbol: 'SOL', name: 'Solana', amount: 50, price: 98.75, value: 4937.50, change24h: 5.12 },
    ];
    setHoldings(mockHoldings);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setHoldings(prev => prev.map(holding => {
        const newPrice = holding.price * (1 + (Math.random() - 0.5) * 0.02);
        return {
          ...holding,
          price: newPrice,
          value: holding.amount * newPrice,
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newTotal = holdings.reduce((sum, h) => sum + h.value, 0);
    setTotalValue(newTotal);
  }, [holdings]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Portfolio
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your cryptocurrency holdings
              </p>
            </div>
          </div>
          <AccountBalance />
        </div>

        {/* Portfolio Summary */}
        <div className="mb-6">
          <PortfolioCard 
            totalValue={totalValue}
            totalChange={totalChange}
            totalChangePercent={totalChangePercent}
          />
        </div>

        {/* Holdings List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Holdings
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {holdings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No holdings yet. Start trading to build your portfolio!
                </p>
              </div>
            ) : (
              holdings.map((holding) => {
                const isPositive = holding.change24h >= 0;
                return (
                  <div
                    key={holding.symbol}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {holding.symbol[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {holding.symbol}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {holding.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {holding.amount} {holding.symbol}
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ${holding.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ${holding.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className={`flex items-center space-x-1 ${
                            isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isPositive ? (
                              <TrendingUp size={16} />
                            ) : (
                              <TrendingDown size={16} />
                            )}
                            <span className="text-sm font-medium">
                              {isPositive ? '+' : ''}{holding.change24h.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

