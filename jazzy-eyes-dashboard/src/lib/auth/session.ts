// A session is "<expiresAtMs>.<signature>", where the signature is an HMAC-SHA256 of the
// expiry under SESSION_SECRET. It cannot be forged or extended without the secret.
// Tokens are not stored, so logout clears the cookie; rotating SESSION_SECRET ends every session.

export const SESSION_COOKIE = 'jazzy-eyes-session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const TOKEN = /^(\d{1,15})\.([A-Za-z0-9_-]{43})$/;
const encoder = new TextEncoder();

async function key(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
}

export async function createSession(secret: string, now: Date): Promise<string> {
  const expiresAt = String(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(expiresAt));
  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function verifySession(token: string | undefined, secret: string, now: Date): Promise<boolean> {
  const signingKey = await key(secret);
  const match = token ? TOKEN.exec(token) : null;
  if (!match) return false;
  const [, expiresAt, signature] = match;
  if (Number(expiresAt) <= now.getTime()) return false;
  return crypto.subtle.verify('HMAC', signingKey, fromBase64Url(signature), encoder.encode(expiresAt));
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? '';
}
