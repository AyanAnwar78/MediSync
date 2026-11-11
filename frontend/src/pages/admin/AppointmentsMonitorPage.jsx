import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Sparkles, Table2 } from 'lucide-react';
import { appointmentsApi } from '../../api/appointmentsApi';
import { doctorsApi } from '../../api/doctorsApi';
import { extractErrorMessage, formatDate, formatTime } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';

export default function AppointmentsMonitorPage() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [appts, docList] = await Promise.all([
        appointmentsApi.getAll({
          status: statusFilter || undefined,
          doctorId: doctorFilter || undefined,
        }),
        doctorsApi.getAll(),
      ]);
      setAppointments(appts);
      setDoctors(docList);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load hospital appointments.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, doctorFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (id, nextStatus) => {
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.updateStatus(id, { status: nextStatus });
      setSuccess(`Appointment #${id} marked as ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update appointment status.'));
    }
  };

  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.cancel(cancelTarget.id, reason);
      setSuccess(`Appointment #${cancelTarget.id} cancelled and slot released.`);
      setCancelTarget(null);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not cancel appointment.'));
      setCancelTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'appointmentDate',
      label: 'Schedule',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{formatDate(row.appointmentDate)}</p>
          <p className="text-xs text-slate-500">
            {formatTime(row.startTime)} – {formatTime(row.endTime)}
          </p>
        </div>
      ),
    },
    {
      key: 'doctorName',
      label: 'Doctor',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.doctorName}</p>
          <p className="text-xs text-slate-500">
            {row.departmentName} • {row.doctorSpecialization}
          </p>
        </div>
      ),
    },
    {
      key: 'patientName',
      label: 'Patient',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.patientName}</p>
          <p className="text-xs text-slate-500">{row.reasonForVisit}</p>
        </div>
      ),
    },
    {
      key: 'allocatedBySmartEngine',
      label: 'Allocation',
      render: (row) =>
        row.allocatedBySmartEngine ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
            <Sparkles className="h-3 w-3" />
            Smart ({row.recommendationScore}%)
          </span>
        ) : (
          <span className="text-xs text-slate-500">Manual</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleStatusChange(row.id, 'Confirmed')}
              className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
            >
              Confirm
            </button>
          )}
          {row.status === 'Confirmed' && (
            <button
              type="button"
              onClick={() => handleStatusChange(row.id, 'Completed')}
              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Complete
            </button>
          )}
          {(row.status === 'Pending' || row.status === 'Confirmed') && (
            <button
              type="button"
              onClick={() => setCancelTarget(row)}
              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Hospital Appointments Monitor"
      subtitle="Track, calendar-inspect, and manage all appointments across departments"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.departmentName})
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              viewMode === 'table' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              viewMode === 'calendar' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading appointments..." />
      ) : viewMode === 'calendar' ? (
        <AppointmentCalendar appointments={appointments} roleView="Admin" />
      ) : (
        <DataTable columns={columns} rows={appointments} emptyMessage="No appointments match the current filters." />
      )}

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Appointment"
        message={`Cancel appointment for ${cancelTarget?.patientName} with ${cancelTarget?.doctorName}? This immediately frees the time slot.`}
        confirmLabel="Cancel Appointment"
        requireReason
        reasonLabel="Cancellation Reason"
        reasonPlaceholder="e.g., Doctor emergency / patient requested reschedule"
        isSubmitting={submitting}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </DashboardLayout>
  );
}

