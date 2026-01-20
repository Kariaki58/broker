// Supabase-based authentication store
import { createServerClient } from './supabaseClient';
import { generateDepositAddress } from './depositAddress';
import { Database } from './supabase';

type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserRow = Database['public']['Tables']['users']['Row'];

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

// Generate unique referral code
function generateReferralCode(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const code = Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
  return `REF-${code}`;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  walletAddress?: string;
  depositAddress?: string; // Unique deposit address for this user
  referralCode: string;
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
}

export async function registerUser(
  email: string,
  password: string,
  walletAddress?: string,
  _referrerCode?: string
): Promise<{ user: AuthUser; sessionToken: string }> {
  const supabase = createServerClient();

  // Validate email
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }

  // Validate password
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Generate user ID
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate unique deposit address for this user (like Flutterwave)
  let depositAddress = generateDepositAddress(userId);
  let depositAttempts = 0;
  
  // Ensure deposit address uniqueness (very rare collision, but check anyway)
  while (depositAttempts < 10) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('deposit_address', depositAddress)
      .single();
    
    if (!existing) break;
    
    // If collision, generate new one with modified userId
    depositAddress = generateDepositAddress(`${userId}-${depositAttempts}`);
    depositAttempts++;
  }
  
  // Generate unique referral code
  let referralCode = generateReferralCode(userId);
  let attempts = 0;
  
  // Ensure uniqueness
  while (attempts < 20) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();
    
    if (!existing) break;
    
    referralCode = generateReferralCode(`${userId}-${attempts}`);
    attempts++;
  }

  // Create user
  const now = new Date().toISOString();
  const userData: UserInsert = {
    id: userId,
    email: email.toLowerCase(),
    password_hash: simpleHash(password),
    wallet_address: walletAddress || null,
    deposit_address: depositAddress,
    referral_code: referralCode,
    created_at: now,
    last_login: now,
    is_active: true,
  };
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert(userData as any)
    .select()
    .single();

  if (userError || !user) {
    throw new Error(userError?.message || 'Failed to create user');
  }

  const userRow = user as UserRow;

  // Create initial balance
  await supabase
    .from('balances')
    .insert({
      user_id: userId,
      balance: 0.00,
    } as any);

  // Generate session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

  await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      token: sessionToken,
      expires_at: expiresAt.toISOString(),
    } as any);

  return {
    user: {
      id: userRow.id,
      email: userRow.email,
      passwordHash: userRow.password_hash,
      role: userRow.role,
      walletAddress: userRow.wallet_address || undefined,
      depositAddress: userRow.deposit_address || undefined,
      referralCode: userRow.referral_code,
      createdAt: userRow.created_at,
      lastLogin: userRow.last_login,
      isActive: userRow.is_active,
    },
    sessionToken,
  };
}

export async function loginUser(email: string, password: string): Promise<{ user: AuthUser; sessionToken: string }> {
  const supabase = createServerClient();

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (userError || !user) {
    throw new Error('Invalid email or password');
  }

  const userRow = user as UserRow;

  // Verify password
  const passwordHash = simpleHash(password);
  if (userRow.password_hash !== passwordHash) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  await (supabase
    .from('users') as any)
    .update({ last_login: new Date().toISOString() })
    .eq('id', userRow.id);

  // Generate session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

  await supabase
    .from('sessions')
    .insert({
      user_id: userRow.id,
      token: sessionToken,
      expires_at: expiresAt.toISOString(),
    } as any);

  return {
    user: {
      id: userRow.id,
      email: userRow.email,
      passwordHash: userRow.password_hash,
      role: userRow.role,
      walletAddress: userRow.wallet_address || undefined,
      depositAddress: userRow.deposit_address || undefined,
      referralCode: userRow.referral_code,
      createdAt: userRow.created_at,
      lastLogin: userRow.last_login,
      isActive: userRow.is_active,
    },
    sessionToken,
  };
}

export async function validateSession(sessionToken: string): Promise<AuthUser | null> {
  const supabase = createServerClient();

  const { data: session, error: sessionError } = await (supabase
    .from('sessions')
    .select('*, users(*)') as any)
    .eq('token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return null;
  }

  const sessionData = session as any;
  const user = sessionData.users;
  if (!user || !user.is_active) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
    walletAddress: user.wallet_address || undefined,
    depositAddress: user.deposit_address || undefined,
    referralCode: user.referral_code,
    createdAt: user.created_at,
    lastLogin: user.last_login,
    isActive: user.is_active,
  };
}

export async function logoutUser(sessionToken: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from('sessions')
    .delete()
    .eq('token', sessionToken);
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const supabase = createServerClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user) {
    return null;
  }

  const userRow = user as UserRow;

  return {
    id: userRow.id,
    email: userRow.email,
    passwordHash: userRow.password_hash,
    role: userRow.role,
    walletAddress: userRow.wallet_address || undefined,
    referralCode: userRow.referral_code,
    createdAt: userRow.created_at,
    lastLogin: userRow.last_login,
    isActive: userRow.is_active,
  };
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const supabase = createServerClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return null;
  }

  const userRow = user as UserRow;

  return {
    id: userRow.id,
    email: userRow.email,
    passwordHash: userRow.password_hash,
    role: userRow.role,
    walletAddress: userRow.wallet_address || undefined,
    referralCode: userRow.referral_code,
    createdAt: userRow.created_at,
    lastLogin: userRow.last_login,
    isActive: userRow.is_active,
  };
}

export async function getUserIdByReferralCode(code: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .single();

  if (error || !user) {
    return null;
  }

  const userRow = user as Pick<UserRow, 'id'>;
  return userRow.id;
}

