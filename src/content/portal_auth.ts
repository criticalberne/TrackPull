export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

interface TokenCandidate {
  token: string;
  score: number;
}

function looksLikeJwt(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function keyPathLooksLikeAccessToken(keyPath: string): boolean {
  const lower = keyPath.toLowerCase();
  return !lower.includes("refresh") &&
    (
      lower.includes("accesstoken") ||
      lower.includes("access_token") ||
      lower.includes(".access.token") ||
      (lower.includes("access") && lower.includes("token"))
    );
}

function looksLikeOpaqueAccessToken(value: string): boolean {
  return value.length >= 24 &&
    value.length <= 4096 &&
    /^[A-Za-z0-9._~+/=-]+$/.test(value);
}

function cleanToken(value: string, keyPath: string): string | null {
  const trimmed = value.trim();
  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  const token = bearerMatch ? bearerMatch[1].trim() : trimmed;
  if (looksLikeJwt(token)) return token;
  if (keyPathLooksLikeAccessToken(keyPath) && looksLikeOpaqueAccessToken(token)) {
    return token;
  }
  return null;
}

function scoreTokenKey(keyPath: string): number {
  const lower = keyPath.toLowerCase();
  let score = 0;
  if (lower.includes("access")) score += 40;
  if (lower.includes("token")) score += 20;
  if (lower.includes("auth")) score += 10;
  if (lower.includes("idtoken") || lower.includes("id_token")) score += 5;
  if (lower.includes("refresh")) score -= 100;
  return score;
}

function collectTokenCandidates(
  value: unknown,
  keyPath: string,
  candidates: TokenCandidate[]
): void {
  if (typeof value === "string") {
    const direct = cleanToken(value, keyPath);
    if (direct) {
      candidates.push({ token: direct, score: scoreTokenKey(keyPath) });
      return;
    }

    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        collectTokenCandidates(JSON.parse(trimmed), keyPath, candidates);
      } catch {
        // Not JSON despite looking close enough. Ignore and keep scanning.
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTokenCandidates(item, `${keyPath}.${index}`, candidates));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      collectTokenCandidates(nested, `${keyPath}.${key}`, candidates);
    }
  }
}

export function findTrackmanAuthTokenFromStorage(...stores: StorageLike[]): string | null {
  const candidates: TokenCandidate[] = [];

  for (const store of stores) {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key) continue;
      const value = store.getItem(key);
      if (value === null) continue;
      collectTokenCandidates(value, key, candidates);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.token ?? null;
}
