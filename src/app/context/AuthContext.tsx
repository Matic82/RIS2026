import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import {
  api,
  setToken,
  getToken,
  ApiError,
  setOnSessionInvalid,
  SessionRole,
} from '../lib/api';

export type UserRole = 'member' | 'admin' | null;

export type MemberData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: 'Basic' | 'Bronze' | 'Silver' | 'Gold';
  points: number;
  cardNumber: string;
  cardStatus: 'pending' | 'sent' | 'delivered';
  address: string;
  registrationDate: string;
};

export type AdminData = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  memberData: MemberData | null;
  adminData: AdminData | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    role: 'member' | 'admin'
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: (role: 'member' | 'admin') => void;
  register: (
    data: Partial<MemberData> & { password: string; marketingConsent?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
  refreshMember: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_CHANGE_EVENT = 'maestro-session-change';
const ADMIN_PROFILE_KEY = 'maestro_admin_profile';
const STORAGE_KEYS = ['maestro_admin_token', 'maestro_member_token', ADMIN_PROFILE_KEY];

type TokenPayload = {
  role?: 'CLAN' | 'ADMIN';
  exp?: number;
};

function readTokenPayload(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

function isTokenValid(token: string, expectedRole: 'CLAN' | 'ADMIN'): boolean {
  const payload = readTokenPayload(token);
  if (!payload || payload.role !== expectedRole) return false;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp <= now) return false;
  return true;
}

export function tokenMatchesRole(role: SessionRole): boolean {
  const token = getToken(role);
  if (!token) return false;
  return isTokenValid(token, role === 'admin' ? 'ADMIN' : 'CLAN');
}

function migrateLegacySession() {
  const legacyToken = localStorage.getItem('maestro_token');
  const legacyRole = localStorage.getItem('maestro_role') as SessionRole | null;
  if (legacyToken && (legacyRole === 'admin' || legacyRole === 'member')) {
    setToken(legacyToken, legacyRole);
  }
  localStorage.removeItem('maestro_token');
  localStorage.removeItem('maestro_role');
}

function clearSession(role: SessionRole) {
  setToken(null, role);
  if (role === 'admin') localStorage.removeItem(ADMIN_PROFILE_KEY);
}

function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

function normalizeMember(m: MemberData & { registrationDate?: string | Date }): MemberData {
  return {
    ...m,
    registrationDate:
      typeof m.registrationDate === 'string'
        ? m.registrationDate
        : new Date(m.registrationDate as Date).toISOString().slice(0, 10),
  };
}

function readStoredAdminProfile(): AdminData | null {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminData;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMember = useCallback(async () => {
    const data = await api<MemberData>('/member/me');
    setMemberData(normalizeMember(data));
  }, []);

  const syncAdminSession = useCallback(() => {
    const token = getToken('admin');
    if (!token || !isTokenValid(token, 'ADMIN')) {
      if (token) clearSession('admin');
      setAdminData(null);
      return;
    }
    const profile = readStoredAdminProfile();
    setAdminData(
      profile ?? { id: 'admin', email: '', name: 'Administrator' }
    );
  }, []);

  const syncMemberSession = useCallback(async () => {
    const token = getToken('member');
    if (!token || !isTokenValid(token, 'CLAN')) {
      if (token) clearSession('member');
      setMemberData(null);
      return;
    }
    await refreshMember();
  }, [refreshMember]);

  const syncSessionFromStorage = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      migrateLegacySession();
      syncAdminSession();
      try {
        await syncMemberSession();
      } catch {
        clearSession('member');
        setMemberData(null);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [syncAdminSession, syncMemberSession]
  );

  useEffect(() => {
    void syncSessionFromStorage();
  }, [syncSessionFromStorage]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && STORAGE_KEYS.includes(e.key)) {
        void syncSessionFromStorage({ silent: true });
      }
    };
    const onSessionChange = () => {
      void syncSessionFromStorage({ silent: true });
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SESSION_CHANGE_EVENT, onSessionChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SESSION_CHANGE_EVENT, onSessionChange);
    };
  }, [syncSessionFromStorage]);

  useEffect(() => {
    setOnSessionInvalid((role) => {
      clearSession(role);
      if (role === 'admin') setAdminData(null);
      else setMemberData(null);
      notifySessionChange();
    });
    return () => setOnSessionInvalid(null);
  }, []);

  const login = async (
    email: string,
    password: string,
    userRole: SessionRole
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      const loginPath = userRole === 'admin' ? '/auth/admin/login' : '/auth/login';
      const loginBody =
        userRole === 'admin'
          ? { email, password }
          : { email, password, role: 'member' as const };

      const data = await api<{
        token: string;
        role: string;
        member?: MemberData;
        admin?: AdminData;
      }>(loginPath, {
        method: 'POST',
        body: JSON.stringify(loginBody),
      });

      setToken(data.token, userRole);

      if (userRole === 'member' && data.member) {
        setMemberData(normalizeMember(data.member));
      } else if (userRole === 'admin' && data.admin) {
        setAdminData(data.admin);
        localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(data.admin));
      }

      notifySessionChange();
      return { success: true };
    } catch (e) {
      if (e instanceof ApiError) {
        return { success: false, error: e.message, code: e.code };
      }
      return { success: false, error: 'Unable to connect to server' };
    }
  };

  const logout = (userRole: SessionRole) => {
    api('/auth/logout', { method: 'POST', session: userRole }).catch(() => {});
    clearSession(userRole);
    if (userRole === 'admin') setAdminData(null);
    else setMemberData(null);
    notifySessionChange();
  };

  const register = async (
    data: Partial<MemberData> & { password: string; marketingConsent?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          address: data.address,
          marketingConsent: data.marketingConsent,
        }),
      });
      return { success: true };
    } catch (e) {
      if (e instanceof ApiError) return { success: false, error: e.message };
      return { success: false, error: 'Unable to connect to server' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        memberData,
        adminData,
        loading,
        login,
        logout,
        register,
        refreshMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
