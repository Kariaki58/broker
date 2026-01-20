// User management store - in production, replace with database
// This provides user session management and referral code handling

export interface User {
  id: string;
  email: string;
  walletAddress?: string;
  referralCode: string;
  createdAt: string;
  lastActive: string;
}

// In-memory stores (in production, use database)
const users: Map<string, User> = new Map();
const referralCodeToUserId: Map<string, string> = new Map();

// Generate a unique referral code
function generateReferralCode(userId: string): string {
  // Create a unique code based on userId hash
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const code = Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
  return `REF-${code}`;
}

export function createUser(userId: string, email?: string, walletAddress?: string, referrerCode?: string): User {
  // Check if user already exists
  if (users.has(userId)) {
    return users.get(userId)!;
  }

  // Generate referral code
  let referralCode = generateReferralCode(userId);
  
  // Ensure uniqueness
  let attempts = 0;
  while (referralCodeToUserId.has(referralCode) && attempts < 10) {
    referralCode = generateReferralCode(`${userId}-${attempts}`);
    attempts++;
  }

  const user: User = {
    id: userId,
    email: email || `user-${userId}@example.com`,
    walletAddress,
    referralCode,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  users.set(userId, user);
  referralCodeToUserId.set(referralCode, userId);

  // Handle referral if referrer code is provided
  if (referrerCode) {
    const referrerId = getUserIdByReferralCode(referrerCode);
    if (referrerId && referrerId !== userId) {
      // This will be handled by the referral tracking system
      // We just ensure the referrer exists
    }
  }

  return user;
}

export function getUser(userId: string): User | undefined {
  const user = users.get(userId);
  if (user) {
    // Update last active
    user.lastActive = new Date().toISOString();
  }
  return user;
}

export function getUserByReferralCode(code: string): User | undefined {
  const userId = referralCodeToUserId.get(code);
  if (userId) {
    return getUser(userId);
  }
  return undefined;
}

export function getUserIdByReferralCode(code: string): string | null {
  return referralCodeToUserId.get(code) || null;
}

export function updateUser(userId: string, updates: Partial<User>): User | undefined {
  const user = users.get(userId);
  if (user) {
    Object.assign(user, updates);
    user.lastActive = new Date().toISOString();
    return user;
  }
  return undefined;
}

export function getAllUsers(): User[] {
  return Array.from(users.values());
}

// In production, replace these with database functions:
// - createUserInDB(userId, email, walletAddress, referrerCode)
// - getUserFromDB(userId)
// - getUserByReferralCodeFromDB(code)
// - updateUserInDB(userId, updates)

