import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schedulesApi } from '../../api/schedulesApi';
import { doctorsApi } from '../../api/doctorsApi';
import { extractErrorMessage, toApiTime, toTimeInput } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import StatusBadge from '../../components/common/StatusBadge';

const DAYS = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
];

function mapWeekRows(existing) {
  return DAYS.map((d) => {
    const match = existing.find((s) => s.dayOfWeek === d.name || Number(s.dayOfWeek) === d.dayOfWeek);
    return {
      dayOfWeek: d.dayOfWeek,
      dayName: d.name,
      enabled: Boolean(match && match.isActive),
      startTime: match ? toTimeInput(match.startTime) : '09:00',
      endTime: match ? toTimeInput(match.endTime) : '17:00',
      hasBreak: Boolean(match?.breakStartTime && match?.breakEndTime),
      breakStartTime: match?.breakStartTime ? toTimeInput(match.breakStartTime) : '13:00',
      breakEndTime: match?.breakEndTime ? toTimeInput(match.breakEndTime) : '14:00',
    };
  });
}

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(() => mapWeekRows([]));
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSchedule = useCallback(async () => {
    if (!user?.doctorId) return;
    setLoading(true);
    setError('');
    try {
      const [scheds, profile] = await Promise.all([
        schedulesApi.getByDoctor(user.doctorId),
        doctorsApi.getById(user.doctorId),
      ]);
      setRows(mapWeekRows(scheds));
      setIsAvailable(profile.isAvailableForBooking);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load working hours.'));
    } finally {
      setLoading(false);
    }
  }, [user?.doctorId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleSave = async () => {
    if (!user?.doctorId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = rows
        .filter((r) => r.enabled)
        .map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: toApiTime(r.startTime),
          endTime: toApiTime(r.endTime),
          breakStartTime: r.hasBreak ? toApiTime(r.breakStartTime) : null,
          breakEndTime: r.hasBreak ? toApiTime(r.breakEndTime) : null,
          isActive: true,
        }));

      const updated = await schedulesApi.upsert(user.doctorId, payload);
      setRows(mapWeekRows(updated));
      setSuccess('Your weekly working hours have been saved.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save working hours.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBooking = async () => {
    if (!user?.doctorId) return;
    setError('');
    setSuccess('');
    try {
      const updated = await doctorsApi.updateAvailability(user.doctorId, !isAvailable);
      setIsAvailable(updated.isAvailableForBooking);
      setSuccess(
        updated.isAvailableForBooking
          ? 'Booking status set to Available.'
          : 'Booking status paused.'
      );
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not toggle availability.'));
    }
  };

  return (
    <DashboardLayout
      title="Working Hours & Availability"
      subtitle="Define your recurring consultation shifts, breaks, and booking status"
    >
      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading your schedule..." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">Accepting New Bookings:</span>
              <StatusBadge status={isAvailable ? 'Available' : 'Unavailable'} />
            </div>
            <button
              type="button"
              onClick={handleToggleBooking}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isAvailable ? 'Pause Bookings' : 'Accept Bookings'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Weekly Consultation Schedule</h2>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div
                  key={row.dayOfWeek}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    row.enabled ? 'border-slate-200 bg-slate-50/70' : 'border-slate-100 bg-slate-50/30 opacity-70'
                  }`}
                >
                  <label className="flex w-32 items-center gap-2.5 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRows((prev) =>
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
                        <span className="text-slate-500">Hours:</span>
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={(e) =>
                            setRows((prev) =>
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
                            setRows((prev) =>
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
                            setRows((prev) =>
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
                              setRows((prev) =>
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
                              setRows((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, breakEndTime: e.target.value } : item))
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Off Duty</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

