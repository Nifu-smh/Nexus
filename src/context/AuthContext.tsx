import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSession, Role } from '../types/index.ts';
import {
  initSupabaseClient,
  saveSupabaseCredentials,
  getSupabaseCredentials,
} from '../lib/supabase.ts';

const USERS_STORAGE_KEY = 'nexus_users_v2';
const SESSION_STORAGE_KEY = 'nexus_session_v2';

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_alex',
    name: 'Alex Morgan',
    email: 'alex@company.com',
    password: 'Password123!',
    role: 'OWNER',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'usr_sanjay',
    name: 'Sanjay Varma',
    email: 'sanjay@company.com',
    password: 'Password123!',
    role: 'MEMBER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-11-02T00:00:00Z',
  },
  {
    id: 'usr_ananya',
    name: 'Ananya Pillai',
    email: 'ananya@company.com',
    password: 'Password123!',
    role: 'MEMBER',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-11-03T00:00:00Z',
  },
];

export const INITIAL_USER = DEFAULT_USERS[0];

interface AuthContextType {
  user: User | null;
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseActive: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password?: string, role?: Role) => Promise<{ success: boolean; error?: string }>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<{ success: boolean; error?: string }>;
  loginWithDemoOAuth: (provider: 'google' | 'github') => Promise<{ success: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseState] = useState(() => initSupabaseClient());

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults with saved users so test accounts always exist
          const merged = [...parsed];
          for (const def of DEFAULT_USERS) {
            if (!merged.some(u => u.email.toLowerCase() === def.email.toLowerCase())) {
              merged.push(def);
            }
          }
          return merged;
        }
      }
      return DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Sync users to storage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  // Sync session to storage
  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [session]);

  // Supabase Auth listener
  useEffect(() => {
    const client = supabaseState.client;
    if (supabaseState.isConfigured && client) {
      client.auth.getSession().then(({ data: { session: supaSession } }) => {
        if (supaSession?.user) {
          const u: User = {
            id: supaSession.user.id,
            email: supaSession.user.email || '',
            name: supaSession.user.user_metadata?.name || supaSession.user.email?.split('@')[0] || 'User',
            role: (supaSession.user.user_metadata?.role as Role) || 'MEMBER',
            createdAt: supaSession.user.created_at,
          };
          setSession({
            user: u,
            token: supaSession.access_token,
            expiresAt: new Date((supaSession.expires_at || 0) * 1000).toISOString(),
          });
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, supaSession) => {
        if (supaSession?.user) {
          const u: User = {
            id: supaSession.user.id,
            email: supaSession.user.email || '',
            name: supaSession.user.user_metadata?.name || supaSession.user.email?.split('@')[0] || 'User',
            role: (supaSession.user.user_metadata?.role as Role) || 'MEMBER',
            createdAt: supaSession.user.created_at,
          };
          setSession({
            user: u,
            token: supaSession.access_token,
            expiresAt: new Date((supaSession.expires_at || 0) * 1000).toISOString(),
          });
        } else {
          setSession(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, [supabaseState]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const client = supabaseState.client;

    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    // 1. Supabase Auth if configured
    if (supabaseState.isConfigured && client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        const u: User = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
          role: (data.user.user_metadata?.role as Role) || 'MEMBER',
          createdAt: data.user.created_at,
        };
        setSession({
          user: u,
          token: data.session.access_token,
          expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
        });
        return { success: true };
      }
    }

    // 2. Local Authentication
    const matched = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!matched) {
      return { success: false, error: 'No account found with this email address. Please sign up.' };
    }

    if (matched.password && matched.password !== password) {
      return { success: false, error: 'Incorrect password. Please verify your credentials.' };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    setSession({
      user: matched,
      token: `nexus_session_${matched.id}_${Date.now()}`,
      expiresAt: expiresAt.toISOString(),
    });

    return { success: true };
  };

  const signup = async (
    name: string,
    email: string,
    password?: string,
    role: Role = 'MEMBER'
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const client = supabaseState.client;

    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    // 1. Supabase Auth if configured
    if (supabaseState.isConfigured && client) {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            role,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const u: User = {
          id: data.user.id,
          email: cleanEmail,
          name: cleanName,
          role,
          createdAt: data.user.created_at,
        };
        if (data.session) {
          setSession({
            user: u,
            token: data.session.access_token,
            expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
          });
        }
        return { success: true };
      }
    }

    // 2. Local Authentication
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email address already exists. Please sign in.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password,
      role,
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    setSession({
      user: newUser,
      token: `nexus_session_${newUser.id}_${Date.now()}`,
      expiresAt: expiresAt.toISOString(),
    });

    return { success: true };
  };

  const loginWithDemoOAuth = async (provider: 'google' | 'github'): Promise<{ success: boolean }> => {
    const providerName = provider === 'google' ? 'Google' : 'GitHub';
    const email = `${provider}_user@company.com`;
    let existing = users.find(u => u.email === email);

    if (!existing) {
      existing = {
        id: `usr_${provider}_${Date.now()}`,
        name: `${providerName} Customer`,
        email,
        role: 'MEMBER',
        avatarUrl: provider === 'google'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        createdAt: new Date().toISOString(),
      };
      setUsers(prev => [...prev, existing!]);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    setSession({
      user: existing,
      token: `nexus_oauth_${existing.id}_${Date.now()}`,
      expiresAt: expiresAt.toISOString(),
    });

    return { success: true };
  };

  const loginWithOAuth = async (provider: 'google' | 'github'): Promise<{ success: boolean; error?: string }> => {
    const client = supabaseState.client;
    if (supabaseState.isConfigured && client) {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'Supabase authentication client is not configured. Please check your credentials.',
    };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address to reset password.' };
    }

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client) {
      const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
    }

    return {
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. Check your inbox.`,
    };
  };

  const logout = async () => {
    if (supabaseState.isConfigured && supabaseState.client) {
      try {
        await supabaseState.client.auth.signOut();
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session?.user,
        isLoading,
        isSupabaseActive: supabaseState.isConfigured,
        login,
        signup,
        loginWithOAuth,
        loginWithDemoOAuth,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
