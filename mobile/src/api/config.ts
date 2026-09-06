export function mobileApiBaseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  const isAndroidEmulatorDevelopmentUrl = /^http:\/\/10\.0\.2\.2(?::\d+)?$/.test(url ?? '');
  if (!url?.startsWith('https://') && !isAndroidEmulatorDevelopmentUrl) {
    throw new Error('Mobile service is not configured.');
  }
  return url;
}