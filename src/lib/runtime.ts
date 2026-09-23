/** Client-safe: Next inlines NODE_ENV at build time. Never show test-payment controls in production. */
export const allowTestPayments = process.env.NODE_ENV !== 'production';
