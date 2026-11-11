import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { leavesApi } from '../../api/leavesApi';
import { extractErrorMessage, formatDate, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import Modal from '../../components/common/Modal';

export default function DoctorLeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ startDate: todayIso(), endDate: todayIso(), reason: '' });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await leavesApi.getAll();
      setLeaves(list);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load leave requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    setError('');
    setSuccess('');
    try {
      await leavesApi.create({
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      setSuccess('Unavailable date request submitted for admin approval.');
      setModalOpen(false);
      setForm({ startDate: todayIso(), endDate: todayIso(), reason: '' });
      await loadLeaves();
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Could not submit leave request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (leaveId) => {
    setError('');
    setSuccess('');
    try {
      await leavesApi.remove(leaveId);
      setSuccess('Pending leave request withdrawn.');
      await loadLeaves();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete leave request.'));
    }
  };

  const columns = [
    {
      key: 'startDate',
      label: 'Unavailable Dates',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {formatDate(row.startDate)} → {formatDate(row.endDate)}
        </span>
      ),
    },
    { key: 'reason', label: 'Reason' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) =>
        row.status !== 'Approved' ? (
          <button
            type="button"
            onClick={() => handleDelete(row.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Withdraw
          </button>
        ) : (
          <span className="text-xs text-slate-400">Approved (contact Admin to modify)</span>
        ),
    },
  ];

  return (
    <DashboardLayout
      title="Unavailable Dates & Leave"
      subtitle="Submit unavailability periods (approved leaves block new appointments)"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{leaves.length} leave record(s)</p>
        <button
          type="button"
          onClick={() => {
            setModalError('');
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Mark Unavailable Dates
        </button>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading leave records..." />
      ) : (
        <DataTable columns={columns} rows={leaves} emptyMessage="No leave requests submitted." />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Mark Unavailable Dates">
        <form onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner type="error" message={modalError} onClose={() => setModalError('')} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Start Date *</label>
              <input
                type="date"
                min={todayIso()}
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">End Date *</label>
              <input
                type="date"
                min={form.startDate || todayIso()}
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Reason *</label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              required
              placeholder="e.g., Medical conference, scheduled surgery, or PTO"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

