import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const STYLES = {
  error: {
    box: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: AlertCircle,
  },
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
  },
  info: {
    box: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: Info,
  },
};

export default function AlertBanner({ type = 'error', message, onClose }) {
  if (!message) return null;
  const variant = STYLES[type] || STYLES.error;
  const Icon = variant.icon;

  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${variant.box}`}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-0.5 opacity-70 transition hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

