/**
 * Single source of truth for the application's public origin.
 *
 * Every absolute URL the server emits — email links, Stripe redirect URLs, origin
 * checks — resolves through here so no environment-specific host is ever compiled in.
 */

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Throws rather than falling back to a default: a wrong origin silently sends
 * verification and contact-release links to the wrong host.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXTAUTH_URL;
  if (!configured) {
    throw new Error('NEXTAUTH_URL is not configured. Set it to the full public origin of this environment.');
  }

  const origin = parseOrigin(configured);
  if (!origin) {
    throw new Error('NEXTAUTH_URL must be an absolute http(s) URL, for example https://tender.example.');
  }
  return origin;
}

export function appUrl(path: string): string {
  // Reject protocol-relative and absolute inputs so a caller-supplied path cannot redirect off-origin.
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('appUrl expects a root-relative path beginning with a single "/".');
  }
  return new URL(path, getAppUrl()).toString();
}

/** Extra origins the same deployment answers on, such as a custom domain alongside the platform host. */
export function additionalAllowedOrigins(): string[] {
  const configured = process.env.ADDITIONAL_ALLOWED_ORIGINS;
  if (!configured) return [];

  return configured
    .split(',')
    .map((entry) => parseOrigin(entry.trim()))
    .filter((origin): origin is string => origin !== null);
}
