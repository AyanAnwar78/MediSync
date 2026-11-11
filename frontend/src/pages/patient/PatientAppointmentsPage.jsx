import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Sparkles, Table2, XCircle } from 'lucide-react';
import { appointmentsApi } from '../../api/appointmentsApi';
import { extractErrorMessage, formatDate, formatTime } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await appointmentsApi.getAll(statusFilter ? { status: statusFilter } : {});
      setAppointments(list);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load appointment history.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.cancel(cancelTarget.id, reason);
      setSuccess(`Appointment with ${cancelTarget.doctorName} cancelled and time slot released.`);
      setCancelTarget(null);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not cancel appointment.'));
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  const columns = [
    {
      key: 'appointmentDate',
      label: 'Date & Time',
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
      key: 'reasonForVisit',
      label: 'Visit Details',
      render: (row) => (
        <div className="max-w-xs text-xs">
          <p className="font-medium text-slate-800">{row.reasonForVisit}</p>
          {row.notes && <p className="mt-0.5 text-emerald-700">Note: {row.notes}</p>}
          {row.cancellationReason && (
            <p className="mt-0.5 text-rose-600">Cancelled: {row.cancellationReason}</p>
          )}
        </div>
      ),
    },
    {
      key: 'allocatedBySmartEngine',
      label: 'Booking Type',
      render: (row) =>
        row.allocatedBySmartEngine ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
            <Sparkles className="h-3 w-3" />
            Smart ({row.recommendationScore}%)
          </span>
        ) : (
          <span className="text-xs text-slate-500">Direct</span>
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
      render: (row) =>
        row.status === 'Pending' || row.status === 'Confirmed' ? (
          <button
            type="button"
            onClick={() => setCancelTarget(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <DashboardLayout
      title="My Appointment History"
      subtitle="Track booking statuses, view clinical notes, or cancel upcoming consultations"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

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
        <LoadingSpinner label="Loading appointment history..." />
      ) : viewMode === 'calendar' ? (
        <AppointmentCalendar appointments={appointments} roleView="Patient" />
      ) : (
        <DataTable columns={columns} rows={appointments} emptyMessage="You have no appointments yet." />
      )}

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Appointment"
        message={`Cancel your appointment with ${cancelTarget?.doctorName} on ${formatDate(cancelTarget?.appointmentDate)}? The slot will be released immediately.`}
        confirmLabel="Confirm Cancellation"
        requireReason
        reasonLabel="Cancellation Reason"
        reasonPlaceholder="e.g., Schedule conflict, feeling better..."
        isSubmitting={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </DashboardLayout>
  );
}

