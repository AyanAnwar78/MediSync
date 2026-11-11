import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Search, Sparkles } from 'lucide-react';
import { departmentsApi } from '../../api/departmentsApi';
import { recommendationsApi } from '../../api/recommendationsApi';
import { appointmentsApi } from '../../api/appointmentsApi';
import { extractErrorMessage, formatDate, toApiTime, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import RecommendationCard from '../../components/appointments/RecommendationCard';

export default function SmartBookingPage() {
  const navigate = useNavigate();
  const reasonInputRef = useRef(null);

  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    departmentId: '',
    specialization: '',
    preferredDate: todayIso(),
    preferredTime: '10:00',
    reasonForVisit: '',
    searchNextAvailableDaysIfEmpty: true,
  });

  const [searching, setSearching] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    departmentsApi
      .getAll(true)
      .then(setDepartments)
      .catch(() => {});
  }, []);

  const buildRecommendationPayload = () => ({
    departmentId: form.departmentId ? Number(form.departmentId) : null,
    specialization: form.specialization.trim() || null,
    preferredDate: form.preferredDate,
    preferredTime: toApiTime(form.preferredTime),
    maxResults: 10,
    searchNextAvailableDaysIfEmpty: form.searchNextAvailableDaysIfEmpty,
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setError('');
    setSuccess('');

    try {
      const data = await recommendationsApi.getSlots(buildRecommendationPayload());
      setResult(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to compute slot recommendations.'));
    } finally {
      setSearching(false);
    }
  };

  const handleBookRecommended = async (rec) => {
    if (!form.reasonForVisit.trim()) {
      setError('Please enter a Reason for Visit before confirming your booking.');
      reasonInputRef.current?.focus();
      reasonInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const key = `${rec.doctorId}-${rec.appointmentDate}-${rec.startTime}`;
    setBookingId(key);
    setError('');
    setSuccess('');
    try {
      await appointmentsApi.book({
        doctorId: rec.doctorId,
        appointmentDate: rec.appointmentDate,
        startTime: rec.startTime,
        reasonForVisit: form.reasonForVisit.trim(),
        allocatedBySmartEngine: true,
        recommendationScore: rec.totalScore,
      });
      setSuccess(
        `Appointment booked with ${rec.doctorName} on ${formatDate(rec.appointmentDate)} (Score: ${rec.totalScore}/100).`
      );
      setTimeout(() => navigate('/patient/appointments'), 1200);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not complete recommended booking.'));
      if (err.response?.status === 409) {
        try {
          const refreshed = await recommendationsApi.getSlots(buildRecommendationPayload());
          setResult(refreshed);
        } catch {
          // Preserve conflict message even if refresh fails
        }
      }
    } finally {
      setBookingId(null);
    }
  };

  return (
    <DashboardLayout
      title="Smart Appointment Recommendation Engine"
      subtitle="Weighted rule-based ranking of genuinely available doctors and time slots"
    >
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-xs leading-relaxed text-teal-900">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <div>
            <p className="font-semibold">Rule-Based Multi-Criteria Scoring Engine (Not Machine Learning)</p>
            <p className="mt-0.5 text-teal-800">
              {result?.algorithmDescription ||
                'Evaluates genuinely available slots across Specialization (25%), Doctor Workload Balance (30%), Preferred Time Proximity (25%), Wait-Time Earliness (10%), and Experience (10%), while excluding approved leaves and your own existing bookings.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">Any Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
              Specialization Keyword
            </label>
            <input
              value={form.specialization}
              onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
              placeholder="e.g., Cardiology, Stroke, Sports"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Preferred Date *</label>
            <input
              type="date"
              min={todayIso()}
              value={form.preferredDate}
              onChange={(e) => setForm((p) => ({ ...p, preferredDate: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Preferred Time</label>
            <input
              type="time"
              value={form.preferredTime}
              onChange={(e) => setForm((p) => ({ ...p, preferredTime: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
              Reason for Visit * (used when booking a slot)
            </label>
            <input
              ref={reasonInputRef}
              value={form.reasonForVisit}
              onChange={(e) => setForm((p) => ({ ...p, reasonForVisit: e.target.value }))}
              placeholder="Briefly describe symptoms or consultation purpose..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={searching}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {searching ? 'Ranking Slots...' : 'Get Recommendations'}
            </button>
          </div>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={form.searchNextAvailableDaysIfEmpty}
            onChange={(e) => setForm((p) => ({ ...p, searchNextAvailableDaysIfEmpty: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-teal-600"
          />
          Automatically check upcoming days (up to 5 days ahead) if preferred date has no open slots
        </label>
      </form>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {searching && <LoadingSpinner label="Evaluating available schedules, leaves, and doctor workloads..." />}

      {!searching && result && (
        <div className="space-y-4">
          {result.usedFallbackDate && (
            <AlertBanner
              type="info"
              message={`No slots were open on ${formatDate(result.requestedDate)}. Showing ranked slots for the earliest available date: ${formatDate(result.evaluatedDate)}.`}
            />
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing top {result.recommendations.length} recommendation(s) from {result.totalCandidatesEvaluated}{' '}
              open slot candidate(s)
            </span>
          </div>

          {result.recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              <Search className="mx-auto mb-2 h-6 w-6 text-slate-400" />
              No genuinely available slots matched your criteria. Try broadening the department or date.
            </div>
          ) : (
            <div className="space-y-4">
              {result.recommendations.map((rec) => {
                const key = `${rec.doctorId}-${rec.appointmentDate}-${rec.startTime}`;
                return (
                  <RecommendationCard
                    key={key}
                    item={rec}
                    isBooking={bookingId === key}
                    onBook={handleBookRecommended}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

