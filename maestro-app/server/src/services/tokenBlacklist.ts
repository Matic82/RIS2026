import { createHash } from 'crypto';

const blacklistedTokens = new Set<string>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function blacklistToken(token: string): void {
  blacklistedTokens.add(hashToken(token));
}

export function isTokenBlacklisted(token: string): boolean {
  return blacklistedTokens.has(hashToken(token));
}

export function clearBlacklist(): void {
  blacklistedTokens.clear();
}
