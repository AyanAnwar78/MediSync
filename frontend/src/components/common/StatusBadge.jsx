const BADGE_CLASSES = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Confirmed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Available: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  Unavailable: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export default function StatusBadge({ status }) {
  const cls = BADGE_CLASSES[status] || 'bg-slate-100 text-slate-700 ring-slate-500/20';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

