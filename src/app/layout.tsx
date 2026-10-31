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
      <body className="antialiased overflow-hidden select-none bg-slate-950">
        {children}
      </body>
    </html>
  );
}

