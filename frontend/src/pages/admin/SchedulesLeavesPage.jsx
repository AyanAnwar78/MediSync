import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { doctorsApi } from '../../api/doctorsApi';
import { schedulesApi } from '../../api/schedulesApi';
import { leavesApi } from '../../api/leavesApi';
import { extractErrorMessage, formatDate, toApiTime, toTimeInput, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const DAYS = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
];

function buildWeekRows(existing) {
  return DAYS.map((d) => {
    const match = existing.find((s) => s.dayOfWeek === d.dayName || Number(s.dayOfWeek) === d.dayOfWeek);
    return {
      dayOfWeek: d.dayOfWeek,
      dayName: d.name,
      enabled: Boolean(match && match.isActive),
      startTime: match ? toTimeInput(match.startTime) : '09:00',
      endTime: match ? toTimeInput(match.endTime) : '17:00',
      breakStartTime: match?.breakStartTime ? toTimeInput(match.breakStartTime) : '13:00',
      breakEndTime: match?.breakEndTime ? toTimeInput(match.breakEndTime) : '14:00',
      hasBreak: Boolean(match?.breakStartTime && match?.breakEndTime),
    };
  });
}

export default function SchedulesLeavesPage() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [weekRows, setWeekRows] = useState(() => buildWeekRows([]));
  const [leaves, setLeaves] = useState([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    doctorId: '',
    startDate: todayIso(),
    endDate: todayIso(),
    reason: '',
  });
  const [leaveModalError, setLeaveModalError] = useState('');
  const [creatingLeave, setCreatingLeave] = useState(false);
  const [deleteLeaveTarget, setDeleteLeaveTarget] = useState(null);

  const loadDoctors = useCallback(async () => {
    try {
      const docList = await doctorsApi.getAll();
      setDoctors(docList);
      setSelectedDoctorId((prev) => prev || (docList.length > 0 ? String(docList[0].id) : ''));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load doctors list.'));
    }
  }, []);

  const loadLeaves = useCallback(async () => {
    try {
      const leaveList = await leavesApi.getAll(leaveStatusFilter ? { status: leaveStatusFilter } : {});
      setLeaves(leaveList);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load leave records.'));
    }
  }, [leaveStatusFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadDoctors(), loadLeaves()]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadDoctors, loadLeaves]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    schedulesApi
      .getByDoctor(selectedDoctorId)
      .then((list) => setWeekRows(buildWeekRows(list)))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load doctor schedule.')));
  }, [selectedDoctorId]);

  const handleSaveSchedule = async () => {
    if (!selectedDoctorId) return;
    setSavingSchedule(true);
    setError('');
    setSuccess('');
    try {
      const payload = weekRows
        .filter((r) => r.enabled)
        .map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: toApiTime(r.startTime),
          endTime: toApiTime(r.endTime),
          breakStartTime: r.hasBreak ? toApiTime(r.breakStartTime) : null,
          breakEndTime: r.hasBreak ? toApiTime(r.breakEndTime) : null,
          isActive: true,
        }));

      const updated = await schedulesApi.upsert(selectedDoctorId, payload);
      setWeekRows(buildWeekRows(updated));
      setSuccess('Doctor weekly consultation hours updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save weekly schedule.'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleLeaveStatus = async (leaveId, status) => {
    setError('');
    setSuccess('');
    try {
      await leavesApi.updateStatus(leaveId, status);
      setSuccess(`Leave request #${leaveId} marked as ${status}.`);
      await loadLeaves();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update leave status.'));
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    setCreatingLeave(true);
    setLeaveModalError('');
    setError('');
    setSuccess('');
    try {
      await leavesApi.create({
        doctorId: Number(leaveForm.doctorId),
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason.trim(),
      });
      setSuccess('Approved leave record added.');
      setLeaveModalOpen(false);
      await loadLeaves();
    } catch (err) {
      setLeaveModalError(extractErrorMessage(err, 'Unable to create leave record.'));
    } finally {
      setCreatingLeave(false);
    }
  };

  const handleDeleteLeave = async () => {
    if (!deleteLeaveTarget) return;
    try {
      await leavesApi.remove(deleteLeaveTarget.id);
      setSuccess('Leave record deleted.');
      setDeleteLeaveTarget(null);
      await loadLeaves();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete leave record.'));
      setDeleteLeaveTarget(null);
    }
  };

  const leaveColumns = [
    {
      key: 'doctorName',
      label: 'Doctor',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.doctorName}</p>
          <p className="text-xs text-slate-500">{row.departmentName}</p>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Dates',
      render: (row) => (
        <span className="text-xs font-medium text-slate-800">
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
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === 'Pending' && (
            <>
              <button
                type="button"
                onClick={() => handleLeaveStatus(row.id, 'Approved')}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleLeaveStatus(row.id, 'Rejected')}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setDeleteLeaveTarget(row)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Delete leave"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Doctor Schedules & Leave Records"
      subtitle="Manage weekly consultation hours and approve or block leave windows"
    >
      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading schedules & leave requests..." />
      ) : (
        <>
          {/* Weekly Schedule Editor */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Weekly Consultation Hours</h2>
                <p className="text-xs text-slate-500">Select a doctor to customize their working shifts and lunch breaks</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-teal-600 focus:outline-none"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {d.departmentName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={savingSchedule}
                  onClick={handleSaveSchedule}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingSchedule ? 'Saving...' : 'Save Weekly Schedule'}
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {weekRows.map((row, idx) => (
                <div
                  key={row.dayOfWeek}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    row.enabled ? 'border-slate-200 bg-slate-50/60' : 'border-slate-100 bg-slate-50/30 opacity-70'
                  }`}
                >
                  <label className="flex w-32 items-center gap-2.5 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWeekRows((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, enabled: checked } : item))
                        );
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600"
                    />
                    {row.dayName}
                  </label>

                  {row.enabled ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-500">Shift:</span>
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, startTime: e.target.value } : item))
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={row.endTime}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, endTime: e.target.value } : item))
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={row.hasBreak}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, hasBreak: e.target.checked } : item))
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600"
                        />
                        Break
                      </label>

                      {row.hasBreak && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={row.breakStartTime}
                            onChange={(e) =>
                              setWeekRows((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, breakStartTime: e.target.value } : item
                                )
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={row.breakEndTime}
                            onChange={(e) =>
                              setWeekRows((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, breakEndTime: e.target.value } : item))
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Off Duty</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Records Section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Doctor Leave Records</h2>
                <p className="text-xs text-slate-500">Approved leave dates automatically block bookings and recommendations</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={leaveStatusFilter}
                  onChange={(e) => setLeaveStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setLeaveModalError('');
                    setLeaveForm({
                      doctorId: selectedDoctorId || String(doctors[0]?.id || ''),
                      startDate: todayIso(),
                      endDate: todayIso(),
                      reason: '',
                    });
                    setLeaveModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Leave
                </button>
              </div>
            </div>

            <DataTable columns={leaveColumns} rows={leaves} emptyMessage="No leave records found." />
          </div>
        </>
      )}

      <Modal isOpen={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Add Approved Doctor Leave">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <AlertBanner type="error" message={leaveModalError} onClose={() => setLeaveModalError('')} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Doctor *</label>
            <select
              value={leaveForm.doctorId}
              onChange={(e) => setLeaveForm((p) => ({ ...p, doctorId: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.departmentName})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Start Date *</label>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">End Date *</label>
              <input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Reason *</label>
            <textarea
              rows={3}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
              required
              placeholder="e.g., Medical conference or planned PTO"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLeaveModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingLeave}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {creatingLeave ? 'Saving...' : 'Save Approved Leave'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteLeaveTarget)}
        title="Delete Leave Record"
        message={`Remove leave record for ${deleteLeaveTarget?.doctorName}?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteLeave}
        onCancel={() => setDeleteLeaveTarget(null)}
      />
    </DashboardLayout>
  );
}

