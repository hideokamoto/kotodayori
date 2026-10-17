/**
 * HMAC-SHA256 helpers built on Web Crypto, so the same code runs on Node.js (20+),
 * StackBlitz WebContainers, Cloudflare Workers and other edge runtimes.
 */
const encoder = new TextEncoder();

function toBytes(data: string | Uint8Array): Uint8Array<ArrayBuffer> {
  return typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
}

function importKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function hmacSha256(secret: string, data: string | Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await importKey(secret, 'sign'), toBytes(data)));
}

/** Compares in constant time: Web Crypto's `verify` does the comparison, not our code. */
export async function verifyHmacSha256(
  secret: string,
  data: string | Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  return crypto.subtle.verify('HMAC', await importKey(secret, 'verify'), toBytes(signature), toBytes(data));
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Returns null for anything that is not an even-length hex string. */
export function hexToBytes(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/../g)!.map((pair) => parseInt(pair, 16)));
}

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Returns null for anything that is not valid base64. */
export function base64ToBytes(base64: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
