import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Snake.io - Ultimate Serpent Battle Royale',
  description: 'Fast-paced, smooth 60fps slither and worm arena game. Completely offline and responsive.',
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

