'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoCardProps {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon?: string;
}

export default function CryptoCard({ symbol, name, price, change24h, icon }: CryptoCardProps) {
  const isPositive = change24h >= 0;
  const changeColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {icon ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-lg font-bold">{icon}</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{symbol[0]}</span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{symbol}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{name}</p>
          </div>
        </div>
        {isPositive ? (
          <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
        ) : (
          <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-sm font-medium mt-1 ${changeColor}`}>
            {isPositive ? '+' : ''}{change24h.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

