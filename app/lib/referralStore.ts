// In production, use a database
export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredId: string;
  email: string;
  joinedDate: string;
  status: 'active' | 'pending';
  totalEarnings: number;
  pendingEarnings: number;
}

export interface ReferralTransaction {
  id: string;
  referralId: string;
  type: 'investment' | 'withdrawal';
  amount: number;
  commission: number;
  date: string;
}

let referralRecords: ReferralRecord[] = [];
let referralTransactions: ReferralTransaction[] = [];

import { getUser, getUserByReferralCode, getUserIdByReferralCode } from './userStore';
import { getUserById as getAuthUserById, getUserIdByReferralCode as getAuthUserIdByReferralCode } from './authStore';

export function getReferralCode(userId: string): string {
  // Try auth store first (for authenticated users)
  const authUser = getAuthUserById(userId);
  if (authUser) {
    return authUser.referralCode;
  }
  
  // Try user store (for legacy users)
  const user = getUser(userId);
  if (user) {
    return user.referralCode;
  }
  
  // Fallback: generate code (shouldn't happen in production)
  return `REF-${userId.substring(0, 8).toUpperCase()}`;
}

export function getReferralByCode(code: string): string | null {
  // Try auth store first
  const authUserId = getAuthUserIdByReferralCode(code);
  if (authUserId) {
    return authUserId;
  }
  
  // Try user store
  return getUserIdByReferralCode(code);
}

export function addReferral(referral: ReferralRecord): void {
  referralRecords.push(referral);
}

export function getReferrals(referrerId: string): ReferralRecord[] {
  return referralRecords.filter(r => r.referrerId === referrerId);
}

export function getReferralStats(referrerId: string): {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
} {
  const referrals = getReferrals(referrerId);
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const totalEarnings = referrals.reduce((sum, r) => sum + r.totalEarnings, 0);
  const pendingEarnings = referrals.reduce((sum, r) => sum + r.pendingEarnings, 0);

  return {
    totalReferrals,
    activeReferrals,
    totalEarnings,
    pendingEarnings,
  };
}

export function addReferralTransaction(transaction: ReferralTransaction): void {
  referralTransactions.push(transaction);
  
  // Update referral record
  const referral = referralRecords.find(r => r.id === transaction.referralId);
  if (referral) {
    referral.totalEarnings += transaction.commission;
    referral.pendingEarnings += transaction.commission;
  }
}

export function withdrawReferralEarnings(referrerId: string): number {
  const referrals = getReferrals(referrerId);
  const totalPending = referrals.reduce((sum, r) => sum + r.pendingEarnings, 0);
  
  // Reset pending earnings
  referrals.forEach(r => {
    r.pendingEarnings = 0;
  });
  
  return totalPending;
}

export function getReferralByReferredId(referredId: string): ReferralRecord | undefined {
  return referralRecords.find(r => r.referredId === referredId);
}

