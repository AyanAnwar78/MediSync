import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarX2, CheckCircle2, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsApi } from '../../api/appointmentsApi';
import { extractErrorMessage, formatDate, formatTime, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await appointmentsApi.getAll();
      setAppointments(list);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load your appointments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = todayIso();
  const upcoming = appointments.filter(
    (a) =>
      String(a.appointmentDate).split('T')[0] >= today &&
      (a.status === 'Pending' || a.status === 'Confirmed')
  );
  const completed = appointments.filter((a) => a.status === 'Completed');
  const cancelled = appointments.filter((a) => a.status === 'Cancelled');
  const smartCount = appointments.filter((a) => a.allocatedBySmartEngine).length;

  return (
    <DashboardLayout
      title={`Hello, ${user?.fullName || 'Patient'}`}
      subtitle="Manage your consultations, explore specialists, and book smart time slots"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-900 p-6 text-white shadow-sm">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Appointment Allocation
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Need the shortest wait time with the right specialist?</h2>
          <p className="mt-1 text-sm text-slate-300">
            Our rule-based scheduling engine ranks genuinely available slots based on specialty, doctor workload, and your preferred time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/patient/smart-booking"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
          >
            <Sparkles className="h-4 w-4" />
            Find Smart Slot
          </Link>
          <Link
            to="/patient/doctors"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Stethoscope className="h-4 w-4" />
            Browse Doctors
          </Link>
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <LoadingSpinner label="Loading your portal..." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Upcoming Visits" value={upcoming.length} icon={CalendarCheck} tone="teal" />
            <StatCard title="Completed Visits" value={completed.length} icon={CheckCircle2} tone="emerald" />
            <StatCard title="Cancelled" value={cancelled.length} icon={CalendarX2} tone="rose" />
            <StatCard title="Smart Allocated" value={smartCount} icon={Sparkles} tone="sky" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Upcoming Appointments</h3>
              <Link to="/patient/appointments" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                View All History →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">You have no upcoming appointments scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {upcoming.slice(0, 4).map((appt) => (
                  <div key={appt.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-teal-700">
                        {formatDate(appt.appointmentDate)} • {formatTime(appt.startTime)}
                      </span>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-900">{appt.doctorName}</p>
                    <p className="text-xs text-slate-500">
                      {appt.departmentName} • {appt.doctorSpecialization}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-600">{appt.reasonForVisit}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <AppointmentCalendar appointments={appointments} roleView="Patient" />
        </>
      )}
    </DashboardLayout>
  );
}

