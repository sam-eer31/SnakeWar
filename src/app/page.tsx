'use client';

import dynamic from 'next/dynamic';

// Dynamically import GameView with SSR disabled to guarantee pure client canvas execution
const GameView = dynamic(
  () => import('@/components/GameView').then((mod) => mod.GameView),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <GameView />
    </main>
  );
}

