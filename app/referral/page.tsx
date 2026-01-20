'use client';

import { useState, useEffect } from 'react';
import AccountBalance from '../components/AccountBalance';
import { ArrowLeft, Users, Copy, CheckCircle, TrendingUp, DollarSign, Gift, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import ProtectedRoute from '../components/ProtectedRoute';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

interface Referral {
  id: string;
  email: string;
  joinedDate: string;
  status: 'active' | 'pending';
  earnings: number;
}

export default function ReferralPage() {
  const { user, isLoading: userLoading } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const statCards = [
    {
      label: 'Total Referrals',
      value: () => stats.totalReferrals.toString(),
      icon: Users,
      gradient: 'from-blue-600 to-purple-600',
      helper: 'All-time referrals',
    },
    {
      label: 'Active Referrals',
      value: () => stats.activeReferrals.toString(),
      icon: CheckCircle,
      gradient: 'from-green-600 to-emerald-600',
      helper: 'Currently active',
    },
    {
      label: 'Total Earnings',
      value: () =>
        `$${stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      gradient: 'from-orange-600 to-red-600',
      helper: 'All-time earnings',
    },
    {
      label: 'Pending',
      value: () =>
        `$${stats.pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Gift,
      gradient: 'from-purple-600 to-pink-600',
      helper: 'Available to withdraw',
    },
  ];

  useEffect(() => {
    if (!userLoading && user) {
      fetchReferralData();
    }
  }, [user, userLoading]);

  const fetchReferralData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.error('No session token found');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/referral/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const code = data.referralCode || user.referralCode || `REF-${user.id.substring(0, 8).toUpperCase()}`;
        const link = data.referralLink || `${window.location.origin}/register?ref=${code}`;
        setReferralCode(code);
        setReferralLink(link);
        setStats(data.stats || stats);
        setReferrals(data.referrals || []);
      } else {
        const error = await response.json();
        console.error('Error fetching referral data:', error);
        // Fallback to user's referral code if API fails
        const fallbackCode = user.referralCode || `REF-${user.id.substring(0, 8).toUpperCase()}`;
        setReferralCode(fallbackCode);
        setReferralLink(`${window.location.origin}/register?ref=${fallbackCode}`);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      // Fallback to user's referral code if request fails
      const fallbackCode = user.referralCode || `REF-${user.id.substring(0, 8).toUpperCase()}`;
      setReferralCode(fallbackCode);
      setReferralLink(`${window.location.origin}/register?ref=${fallbackCode}`);
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareReferralLink = async () => {
    if (!referralLink) {
      alert('Referral link is not available. Please wait a moment and try again.');
      return;
    }

    // Try native share API first (mobile devices)
    if (navigator.share && navigator.canShare && navigator.canShare({ url: referralLink })) {
      try {
        await navigator.share({
          title: 'Join Crypto Mining Platform',
          text: 'Earn 3% daily yield with crypto mining! Use my referral link:',
          url: referralLink,
        });
        // If share was successful, also show copied feedback
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        return;
      } catch (error: any) {
        // User cancelled or error occurred, fall through to copy
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await copyToClipboard(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy referral link:', error);
      alert('Failed to copy referral link. Please copy it manually.');
    }
  };

  const handleWithdrawEarnings = async () => {
    if (!user) {
      alert('Please log in to withdraw earnings');
      return;
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        alert('Please log in to withdraw earnings');
        return;
      }

      const response = await fetch('/api/referral/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully withdrawn $${data.amount}!`);
        fetchReferralData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to withdraw earnings');
      }
    } catch (error) {
      console.error('Error withdrawing earnings:', error);
      alert('Failed to withdraw earnings. Please try again.');
    }
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Referral Program
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Invite friends and earn rewards
              </p>
            </div>
          </div>
          <AccountBalance />
        </div>

        {/* Stats Overview */}
        {/* Mobile carousel - horizontal scroll */}
        <div className="md:hidden mb-6">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="min-w-[280px] flex-shrink-0 snap-center">
                  <div className={`bg-gradient-to-br ${card.gradient} rounded-xl p-4 md:p-6 text-white shadow-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-5 h-5 md:w-6 md:h-6 opacity-80" />
                      <span className="text-xs md:text-sm opacity-80">{card.label}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold">{card.value()}</h3>
                    <p className="text-xs md:text-sm opacity-80 mt-1">{card.helper}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Medium (2 columns) and Desktop (4 columns) grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`bg-gradient-to-br ${card.gradient} rounded-xl p-4 md:p-6 text-white shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 opacity-80" />
                  <span className="text-xs md:text-sm opacity-80">{card.label}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold">{card.value()}</h3>
                <p className="text-xs md:text-sm opacity-80 mt-1">{card.helper}</p>
              </div>
            );
          })}
        </div>

        {/* Referral Code Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
            Your Referral Code
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Referral Code
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="flex-1 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
                <button
                  onClick={() => copyToClipboard(referralCode)}
                  className="px-3 md:px-4 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center space-x-1.5 md:space-x-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Referral Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={shareReferralLink}
                  className="px-3 md:px-4 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center space-x-1.5 md:space-x-2"
                  disabled={!referralLink}
                >
                  {linkCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-2">Share Your Link</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Share your unique referral code or link with friends and family
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">2</span>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-2">They Sign Up</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                When they register using your link, they become your referral
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white mb-2">Earn Rewards</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Earn 10% commission on their mining investments and withdrawals
              </p>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                Your Referrals
              </h2>
              {stats.pendingEarnings > 0 && (
                <button
                  onClick={handleWithdrawEarnings}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Withdraw Earnings (${stats.pendingEarnings.toFixed(2)})
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Joined</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-gray-900 dark:text-white">{referral.email}</td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        {new Date(referral.joinedDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          referral.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {referral.status}
                        </span>
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-green-600 dark:text-green-400 text-right">
                        ${referral.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commission Info */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 md:p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-2">
            💰 Commission Structure
          </h3>
          <ul className="space-y-2 text-xs md:text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span><strong>10% commission</strong> on all mining investments made by your referrals</span>
            </li>
            <li className="flex items-start">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
              <span><strong>5% commission</strong> on all withdrawals made by your referrals</span>
            </li>
            <li className="flex items-start">
              <Gift className="w-4 h-4 md:w-5 md:h-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Earnings are credited instantly and can be withdrawn weekly</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

