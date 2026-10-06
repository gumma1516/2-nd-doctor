import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="text-center">
        <p className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-teal-400">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-zinc-400">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          id="not-found-home-link"
          className="mt-8 inline-flex bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-full font-semibold transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
