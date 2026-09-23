'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatLaunchDate, remainingParts } from '@/lib/public-launch';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function PreLaunchCountdown({ launchAtIso }: { launchAtIso: string }) {
  const router = useRouter();
  const launchAtMs = Date.parse(launchAtIso);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = nowMs === null ? null : remainingParts(launchAtMs, nowMs);

  useEffect(() => {
    if (!parts?.done || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [parts?.done, router]);

  const tiles = [
    ['Days', parts ? String(parts.days) : '—'],
    ['Hours', parts ? pad(parts.hours) : '—'],
    ['Minutes', parts ? pad(parts.minutes) : '—'],
    ['Seconds', parts ? pad(parts.seconds) : '—'],
  ] as const;

  return (
    <div className="mt-8">
      <p className="text-sm font-semibold text-site-white">
        Opens {formatLaunchDate(launchAtIso)}
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
        {tiles.map(([label, value]) => (
          <div key={label} className="border border-white/15 bg-foundation-navy/70 px-2 py-4 text-center backdrop-blur-sm sm:px-3 sm:py-5">
            <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight text-site-white sm:text-4xl">{value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-site-white">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
