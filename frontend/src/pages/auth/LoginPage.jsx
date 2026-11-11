import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleHomePath } from '../../routes/ProtectedRoute';
import { extractErrorMessage } from '../../utils/formatters';
import AlertBanner from '../../components/common/AlertBanner';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@medisync.local', pass: 'Admin@123', icon: ShieldCheck },
  { label: 'Doctor', email: 'sharma@medisync.local', pass: 'Doctor@123', icon: Stethoscope },
  { label: 'Patient', email: 'patient1@medisync.local', pass: 'Patient@123', icon: User },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(getRoleHomePath(user.role), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-2">
      {/* Clinical Hero Side */}
      <div className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">MediSync</p>
            <p className="text-xs text-slate-400">Hospital Scheduling &amp; Allocation Platform</p>
          </div>
        </div>

        <div className="max-w-lg space-y-6">
          <span className="inline-flex items-center rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300 ring-1 ring-teal-500/30">
            Rule-Based Intelligent Scheduling
          </span>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Optimize doctor availability and reduce patient wait times.
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            MediSync coordinates clinical working schedules, approved leave tracking, conflict-free appointment
            allocation, and weighted multi-factor doctor recommendations across hospital departments.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-lg font-bold text-teal-400">0 Overlap</p>
              <p className="mt-1 text-xs text-slate-400">Serializable conflict checks</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-lg font-bold text-teal-400">5-Factor</p>
              <p className="mt-1 text-xs text-slate-400">Weighted slot scoring</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-lg font-bold text-teal-400">3 Portals</p>
              <p className="mt-1 text-xs text-slate-400">Admin, Doctor &amp; Patient</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          MediSync Academic Project • ASP.NET Core Web API + SQL Server + React
        </p>
      </div>

      {/* Sign In Form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 lg:hidden">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to MediSync</h1>
            <p className="mt-1 text-sm text-slate-500">Access your hospital portal dashboard</p>
          </div>

          <AlertBanner type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@medisync.local"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
              Demo Credentials (Quick Fill)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((demo) => {
                const Icon = demo.icon;
                return (
                  <button
                    key={demo.label}
                    type="button"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword(demo.pass);
                      setError('');
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-medium text-slate-700 transition hover:border-teal-500 hover:bg-teal-50/60"
                  >
                    <Icon className="h-4 w-4 text-teal-600" />
                    <span>{demo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-center text-sm text-slate-600">
            New patient?{' '}
            <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700">
              Create patient account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

