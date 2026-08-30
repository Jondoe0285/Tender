/** Public support address shown in the footer and policy pages. Empty when not configured. */
export function supportEmail(): string | null {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;
}
