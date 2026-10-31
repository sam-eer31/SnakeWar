import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SnakeWar - Ultimate Serpent Battle Royale',
  description: 'Fast-paced, smooth 60fps realistic serpent battle royale arena game.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/game-font.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased overflow-hidden select-none bg-[#0a0e1a] text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}
