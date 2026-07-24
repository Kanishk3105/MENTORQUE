export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin text-current ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/** Thin indeterminate progress bar for page-level async operations. */
export function ProgressBar({ active }) {
  if (!active) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[300] h-0.5 overflow-hidden bg-transparent">
      <div className="progress-bar-fill h-full w-1/3 bg-primary-500" />
      <style>{`
        @keyframes progress-bar-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .progress-bar-fill { animation: progress-bar-slide 1.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
