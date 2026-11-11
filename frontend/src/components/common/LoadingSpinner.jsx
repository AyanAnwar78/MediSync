export default function LoadingSpinner({ label = 'Loading...', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-[3px]' : 'h-7 w-7 border-2';

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-6 text-slate-500">
      <div
        className={`${sizeClass} animate-spin rounded-full border-slate-200 border-t-teal-600`}
        role="status"
        aria-label={label}
      />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

