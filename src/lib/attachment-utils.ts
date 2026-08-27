export function buildSafeAttachmentName(input: string): string {
  const cleaned = input
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();

  return cleaned && cleaned.length > 0 ? cleaned : 'attachment';
}
