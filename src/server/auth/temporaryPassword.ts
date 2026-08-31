import { randomBytes } from 'node:crypto';

/**
 * Admin-issued temporary password. Uses a CSPRNG: a predictable value here would let an
 * observer derive the credential for an account an administrator just reset.
 */
export function generateTemporaryPassword(): string {
  const segment = () => randomBytes(6).toString('base64url').toUpperCase();
  return `TT-${segment()}-${segment()}`;
}
