export function parsePublicLaunchAt(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

export function isPreLaunchActive(launchAtIso: string | null | undefined, nowMs = Date.now()): boolean {
  const at = parsePublicLaunchAt(launchAtIso);
  return at !== null && nowMs < at.getTime();
}

export function remainingParts(launchAtMs: number, nowMs: number) {
  const diff = Math.max(0, launchAtMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    done: diff <= 0,
  };
}

export function toDatetimeLocalInput(iso: string): string {
  const date = parsePublicLaunchAt(iso);
  if (!date) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function formatLaunchDate(iso: string): string {
  const date = parsePublicLaunchAt(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(date);
}
