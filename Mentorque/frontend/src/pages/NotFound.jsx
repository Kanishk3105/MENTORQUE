import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-white mb-2">404</p>
        <p className="text-slate-400 mb-6">This page doesn&apos;t exist.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-navy-950 font-medium transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
