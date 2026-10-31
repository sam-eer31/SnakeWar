import Link from 'next/link';

export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <h1 className="text-4xl font-black mb-2">404 - Arena Not Found</h1>
      <p className="text-slate-400 mb-4">The serpent you are looking for has slithered away.</p>
      <Link
        href="/"
        className="px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110"
      >
        Return to Arena
      </Link>
    </div>
  );
}

