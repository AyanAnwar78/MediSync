import { useCallback, useEffect, useState } from 'react';
import { Check, CheckCheck, Eye, XCircle } from 'lucide-react';
import { appointmentsApi } from '../../api/appointmentsApi';
import { extractErrorMessage, formatDate, formatTime } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [detailTarget, setDetailTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [modalError, setModalError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await appointmentsApi.getAll(statusFilter ? { status: statusFilter } : {});
      setAppointments(list);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load appointments.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (appt) => {
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.updateStatus(appt.id, { status: 'Confirmed' });
      setSuccess(`Accepted appointment with ${appt.patientName}.`);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not accept appointment.'));
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!completeTarget) return;
    setProcessing(true);
    setModalError('');
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.updateStatus(completeTarget.id, {
        status: 'Completed',
        notes: completionNotes.trim() || null,
      });
      setSuccess(`Completed consultation for ${completeTarget.patientName}.`);
      setCompleteTarget(null);
      setCompletionNotes('');
      await loadData();
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Could not complete appointment.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.cancel(cancelTarget.id, reason);
      setSuccess(`Cancelled appointment for ${cancelTarget.patientName} and released slot.`);
      setCancelTarget(null);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not cancel appointment.'));
      setCancelTarget(null);
    } finally {
      setProcessing(false);
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
      key: 'patientName',
      label: 'Patient',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.patientName}</p>
          <p className="text-xs text-slate-500">
            {row.patientGender || '—'} • {row.patientBloodGroup || 'Blood group N/A'}
          </p>
        </div>
      ),
    },
    { key: 'reasonForVisit', label: 'Reason for Visit' },
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
          <button
            type="button"
            onClick={() => setDetailTarget(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Details
          </button>
          {row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleAccept(row)}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
          )}
          {row.status === 'Confirmed' && (
            <button
              type="button"
              onClick={() => {
                setModalError('');
                setCompleteTarget(row);
                setCompletionNotes(row.notes || '');
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Complete
            </button>
          )}
          {(row.status === 'Pending' || row.status === 'Confirmed') && (
            <button
              type="button"
              onClick={() => setCancelTarget(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="My Patient Appointments"
      subtitle="Review patient details, accept requests, record clinical notes, or cancel consultations"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <p className="text-sm text-slate-500">{appointments.length} appointment(s)</p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading appointments..." />
      ) : (
        <DataTable columns={columns} rows={appointments} emptyMessage="No appointments found." />
      )}

      {/* Patient Appointment Details Modal */}
      <Modal
        isOpen={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="Patient & Appointment Details"
      >
        {detailTarget && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="font-bold text-slate-900">{detailTarget.patientName}</p>
                <p className="text-xs text-slate-500">
                  {detailTarget.patientEmail} • {detailTarget.patientPhone || 'No phone'}
                </p>
              </div>
              <StatusBadge status={detailTarget.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 text-xs">
              <div>
                <span className="text-slate-500">Appointment Date</span>
                <p className="mt-0.5 font-semibold text-slate-900">{formatDate(detailTarget.appointmentDate)}</p>
              </div>
              <div>
                <span className="text-slate-500">Time Slot</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {formatTime(detailTarget.startTime)} – {formatTime(detailTarget.endTime)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Gender / Blood Group</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {detailTarget.patientGender || '—'} / {detailTarget.patientBloodGroup || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Date of Birth</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {detailTarget.patientDateOfBirth ? formatDate(detailTarget.patientDateOfBirth) : '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Reason for Visit</p>
              <p className="mt-1 rounded-xl bg-slate-50 p-3 text-slate-800">{detailTarget.reasonForVisit}</p>
            </div>

            {detailTarget.notes && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Clinical Notes</p>
                <p className="mt-1 rounded-xl bg-emerald-50 p-3 text-emerald-900">{detailTarget.notes}</p>
              </div>
            )}

            {detailTarget.cancellationReason && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Cancellation Reason</p>
                <p className="mt-1 rounded-xl bg-rose-50 p-3 text-rose-900">{detailTarget.cancellationReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Complete Consultation Modal */}
      <Modal
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title="Complete Consultation"
        subtitle={`Patient: ${completeTarget?.patientName}`}
      >
        <form onSubmit={handleComplete} className="space-y-4">
          <AlertBanner type="error" message={modalError} onClose={() => setModalError('')} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
              Clinical Notes / Summary
            </label>
            <textarea
              rows={4}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Diagnosis, vitals summary, or follow-up guidance..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCompleteTarget(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {processing ? 'Saving...' : 'Mark Completed'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Patient Appointment"
        message={`Cancel appointment with ${cancelTarget?.patientName} on ${formatDate(cancelTarget?.appointmentDate)}?`}
        confirmLabel="Cancel Appointment"
        requireReason
        reasonLabel="Cancellation Reason"
        reasonPlaceholder="Explain reason for cancellation..."
        isSubmitting={processing}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </DashboardLayout>
  );
}

