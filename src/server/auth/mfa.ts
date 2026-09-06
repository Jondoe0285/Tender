import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';

function encryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for MFA secret encryption');
  return createHash('sha256').update(secret).digest();
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptMfaSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid MFA secret');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

export function hashRecoveryCode(code: string) {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => `${randomBytes(5).toString('hex').toUpperCase()}-${randomBytes(5).toString('hex').toUpperCase()}`);
}

export function buildMfaEnrollment(email: string) {
  const secret = generateSecret();
  return { secret, uri: generateURI({ issuer: 'Trade Tender', label: email, secret }) };
}

export async function verifyMfaCode(secret: string, token: string) {
  return (await verify({ secret, token: token.replace(/\s/g, '') })).valid;
}

export function consumeRecoveryCode(serializedHashes: string | null, code: string) {
  if (!serializedHashes) return { valid: false, remaining: null };
  const hashes = JSON.parse(serializedHashes) as string[];
  const hash = hashRecoveryCode(code);
  const index = hashes.indexOf(hash);
  if (index < 0) return { valid: false, remaining: hashes };
  return { valid: true, remaining: hashes.filter((_, currentIndex) => currentIndex !== index) };
}