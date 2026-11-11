import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsApi } from '../../api/appointmentsApi';
import { doctorsApi } from '../../api/doctorsApi';
import { extractErrorMessage, formatDate, formatTime, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.doctorId) return;
    setLoading(true);
    setError('');
    try {
      const [appts, doc] = await Promise.all([
        appointmentsApi.getAll(),
        doctorsApi.getById(user.doctorId),
      ]);
      setAppointments(appts);
      setDoctorProfile(doc);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load doctor dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [user?.doctorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAvailability = async () => {
    if (!doctorProfile) return;
    setToggling(true);
    setError('');
    setSuccess('');
    try {
      const updated = await doctorsApi.updateAvailability(
        doctorProfile.id,
        !doctorProfile.isAvailableForBooking
      );
      setDoctorProfile((prev) => ({ ...prev, isAvailableForBooking: updated.isAvailableForBooking }));
      setSuccess(
        updated.isAvailableForBooking
          ? 'Your profile is now open for new patient bookings.'
          : 'Your profile is paused from receiving new bookings.'
      );
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update booking availability.'));
    } finally {
      setToggling(false);
    }
  };

  const today = todayIso();
  const todayAppts = appointments.filter(
    (a) => String(a.appointmentDate).split('T')[0] === today && a.status !== 'Cancelled'
  );
  const upcomingAppts = appointments.filter(
    (a) =>
      String(a.appointmentDate).split('T')[0] >= today &&
      (a.status === 'Pending' || a.status === 'Confirmed')
  );
  const pendingCount = appointments.filter((a) => a.status === 'Pending').length;
  const completedCount = appointments.filter((a) => a.status === 'Completed').length;

  return (
    <DashboardLayout
      title={`Welcome, ${user?.fullName || 'Doctor'}`}
      subtitle={`${doctorProfile?.departmentName || user?.departmentName || ''} • ${
        doctorProfile?.specialization || user?.specialization || ''
      }`}
    >
      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading clinical schedule..." />
      ) : (
        <>
          {doctorProfile && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">Booking Availability</h2>
                  <StatusBadge status={doctorProfile.isAvailableForBooking ? 'Available' : 'Unavailable'} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Slot duration: {doctorProfile.slotDurationMinutes} min • Daily cap:{' '}
                  {doctorProfile.maxDailyAppointments} appointments • Active working days:{' '}
                  {doctorProfile.workingDays?.join(', ') || 'None set'}
                </p>
              </div>
              <button
                type="button"
                disabled={toggling}
                onClick={handleToggleAvailability}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  doctorProfile.isAvailableForBooking
                    ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {doctorProfile.isAvailableForBooking ? (
                  <>
                    <ToggleRight className="h-5 w-5 text-teal-600" />
                    Pause Bookings
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-5 w-5" />
                    Enable Bookings
                  </>
                )}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today's Appointments" value={todayAppts.length} icon={Clock} tone="teal" />
            <StatCard title="Upcoming Active" value={upcomingAppts.length} icon={CalendarCheck} tone="sky" />
            <StatCard title="Awaiting Approval" value={pendingCount} icon={Clock} tone="amber" />
            <StatCard title="Completed" value={completedCount} icon={CheckCircle2} tone="emerald" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">Upcoming Consultations</h3>
            <p className="text-xs text-slate-500">Next scheduled patients requiring attention</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {upcomingAppts.slice(0, 6).map((appt) => (
                <div key={appt.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-teal-700">
                      {formatDate(appt.appointmentDate)} • {formatTime(appt.startTime)}
                    </span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{appt.patientName}</p>
                  <p className="mt-1 text-xs text-slate-600">{appt.reasonForVisit}</p>
                </div>
              ))}
              {upcomingAppts.length === 0 && (
                <p className="text-sm text-slate-500">No upcoming appointments queued.</p>
              )}
            </div>
          </div>

          <AppointmentCalendar appointments={appointments} roleView="Doctor" />
        </>
      )}
    </DashboardLayout>
  );
}

