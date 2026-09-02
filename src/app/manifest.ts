import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Trade Tender',
    short_name: 'Trade Tender',
    description: 'The tender platform for construction supply.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#062f4f',
    icons: [
      {
        src: '/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}