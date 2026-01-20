// Authentication store - in production, use database with hashed passwords
// This provides user authentication and session management

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string; // In production, use bcrypt or similar
  walletAddress?: string;
  referralCode: string;
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
}

// In-memory stores (in production, use database)
const authUsers: Map<string, AuthUser> = new Map(); // userId -> AuthUser
const emailToUserId: Map<string, string> = new Map(); // email -> userId
const sessions: Map<string, string> = new Map(); // sessionToken -> userId
const referralCodeToUserId: Map<string, string> = new Map(); // referralCode -> userId

// Simple hash function (in production, use bcrypt)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Generate session token
function generateSessionToken(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
}

export function registerUser(
  email: string,
  password: string,
  walletAddress?: string,
  referrerCode?: string
): { user: AuthUser; sessionToken: string } | null {
  // Validate email
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }

  // Validate password
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if email already exists
  if (emailToUserId.has(email.toLowerCase())) {
    throw new Error('Email already registered');
  }

  // Generate user ID
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate unique referral code
  let referralCode = '';
  let attempts = 0;
  do {
    const hash = `${userId}-${attempts}`.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    const code = Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
    referralCode = `REF-${code}`;
    attempts++;
  } while (referralCodeToUserId.has(referralCode) && attempts < 20);

  // Create user
  const user: AuthUser = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash: simpleHash(password), // In production, use bcrypt
    walletAddress,
    referralCode,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isActive: true,
  };

  authUsers.set(userId, user);
  emailToUserId.set(email.toLowerCase(), userId);
  referralCodeToUserId.set(referralCode, userId); // Map referral code to user

  // Generate session token
  const sessionToken = generateSessionToken();
  sessions.set(sessionToken, userId);

  // Handle referral if referrer code is provided
  if (referrerCode) {
    // This will be handled by the referral tracking system
  }

  return { user, sessionToken };
}

export function loginUser(email: string, password: string): { user: AuthUser; sessionToken: string } | null {
  // Find user by email
  const userId = emailToUserId.get(email.toLowerCase());
  if (!userId) {
    throw new Error('Invalid email or password');
  }

  const user = authUsers.get(userId);
  if (!user || !user.isActive) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const passwordHash = simpleHash(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date().toISOString();

  // Generate session token
  const sessionToken = generateSessionToken();
  sessions.set(sessionToken, userId);

  return { user, sessionToken };
}

export function validateSession(sessionToken: string): AuthUser | null {
  const userId = sessions.get(sessionToken);
  if (!userId) {
    return null;
  }

  const user = authUsers.get(userId);
  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

export function logoutUser(sessionToken: string): void {
  sessions.delete(sessionToken);
}

export function getUserByEmail(email: string): AuthUser | null {
  const userId = emailToUserId.get(email.toLowerCase());
  if (!userId) {
    return null;
  }
  return authUsers.get(userId) || null;
}

export function getUserById(userId: string): AuthUser | null {
  return authUsers.get(userId) || null;
}

export function getUserIdByReferralCode(code: string): string | null {
  return referralCodeToUserId.get(code) || null;
}

export function getUserByReferralCode(code: string): AuthUser | null {
  const userId = referralCodeToUserId.get(code);
  if (!userId) {
    return null;
  }
  return authUsers.get(userId) || null;
}

// In production, replace these with database functions:
// - registerUserInDB(email, passwordHash, walletAddress, referrerCode)
// - loginUserFromDB(email, password)
// - validateSessionFromDB(sessionToken)
// - logoutUserFromDB(sessionToken)

