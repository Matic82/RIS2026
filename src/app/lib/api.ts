const API_BASE = import.meta.env.VITE_API_URL || '/api';

export type SessionRole = 'admin' | 'member';

const TOKEN_KEYS: Record<SessionRole, string> = {
  admin: 'maestro_admin_token',
  member: 'maestro_member_token',
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function sessionForPath(path: string): SessionRole | null {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/member') || path.startsWith('/users')) return 'member';
  return null;
}

export function getToken(role: SessionRole): string | null {
  return localStorage.getItem(TOKEN_KEYS[role]);
}

export function setToken(token: string | null, role: SessionRole): void {
  if (token) localStorage.setItem(TOKEN_KEYS[role], token);
  else localStorage.removeItem(TOKEN_KEYS[role]);
}

let onSessionInvalid: ((role: SessionRole) => void) | null = null;

export function setOnSessionInvalid(
  handler: ((role: SessionRole) => void) | null
): void {
  onSessionInvalid = handler;
}

export type ApiOptions = RequestInit & {
  /** Which stored session token to attach (required for /auth/logout). */
  session?: SessionRole;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { session: sessionOverride, ...fetchOptions } = options;
  const session = sessionOverride ?? sessionForPath(path);
  const token = session ? getToken(session) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = typeof data.error === 'string' ? data.error : '';
    const isAuthForbidden =
      res.status === 403 &&
      session === 'admin' &&
      (errMsg === 'Forbidden' || errMsg === 'Unauthorized');
    if (session && (res.status === 401 || isAuthForbidden)) {
      onSessionInvalid?.(session);
    }
    throw new ApiError(
      data.error || res.statusText,
      res.status,
      data.code
    );
  }
  return data as T;
}

export type LoginMemberResponse = {
  token: string;
  role: 'member';
  member: import('../context/AuthContext').MemberData;
};

export type LoginAdminResponse = {
  token: string;
  role: 'admin';
  admin: import('../context/AuthContext').AdminData;
};
