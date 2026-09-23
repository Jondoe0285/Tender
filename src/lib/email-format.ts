const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_OWNER_DOMAINS = new Set(['example.test', 'example.com', 'localhost']);

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Real mailbox for Owner MFA — rejects reserved example/localhost domains used by local seed. */
export function isAssignablePlatformOwnerEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!isValidEmail(email)) return false;
  const domain = email.slice(email.lastIndexOf('@') + 1);
  return !PLACEHOLDER_OWNER_DOMAINS.has(domain);
}
