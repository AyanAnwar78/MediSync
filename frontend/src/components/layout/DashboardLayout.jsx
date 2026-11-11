import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Stethoscope,
  Users,
  Building2,
  ClipboardList,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_BY_ROLE = {
  Admin: [
    { to: '/admin', label: 'Analytics Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/patients', label: 'Patients', icon: Users },
    { to: '/admin/appointments', label: 'All Appointments', icon: CalendarDays },
    { to: '/admin/schedules-leaves', label: 'Schedules & Leaves', icon: CalendarClock },
  ],
  Doctor: [
    { to: '/doctor', label: 'Doctor Overview', icon: LayoutDashboard, end: true },
    { to: '/doctor/appointments', label: 'My Appointments', icon: ClipboardList },
    { to: '/doctor/schedule', label: 'Working Hours', icon: CalendarClock },
    { to: '/doctor/leaves', label: 'Leave Requests', icon: CalendarDays },
  ],
  Patient: [
    { to: '/patient', label: 'Patient Overview', icon: LayoutDashboard, end: true },
    { to: '/patient/smart-booking', label: 'Smart Booking', icon: Sparkles },
    { to: '/patient/doctors', label: 'Find Doctors', icon: Stethoscope },
    { to: '/patient/appointments', label: 'My Appointments', icon: CalendarDays },
    { to: '/patient/profile', label: 'My Profile', icon: UserCheck },
  ],
};

export default function DashboardLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_BY_ROLE[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white">MediSync</p>
            <p className="text-[11px] font-medium text-slate-400">Hospital Allocation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-5 pb-2">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {user?.role} Portal
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-xl bg-slate-800/60 p-3">
          <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <span className="mt-2 inline-flex items-center rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
            {user?.role}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-rose-600/20 hover:border-rose-500/40 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-64">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3.5 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
                {subtitle && <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

