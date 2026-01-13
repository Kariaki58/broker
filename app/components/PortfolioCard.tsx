'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioCardProps {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
}

export default function PortfolioCard({ totalValue, totalChange, totalChangePercent }: PortfolioCardProps) {
  const isPositive = totalChange >= 0;
  const changeColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div className="mb-4">
        <p className="text-sm opacity-90 mb-1">Total Portfolio Value</p>
        <h2 className="text-3xl font-bold">
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
      </div>
      <div className="flex items-center space-x-2">
        {isPositive ? (
          <TrendingUp size={20} className="text-green-200" />
        ) : (
          <TrendingDown size={20} className="text-red-200" />
        )}
        <span className={`text-lg font-semibold ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
          {isPositive ? '+' : ''}${totalChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`text-lg font-semibold ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
          ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}

