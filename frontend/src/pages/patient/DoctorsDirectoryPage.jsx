import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, Search, Stethoscope } from 'lucide-react';
import { doctorsApi } from '../../api/doctorsApi';
import { departmentsApi } from '../../api/departmentsApi';
import { appointmentsApi } from '../../api/appointmentsApi';
import { extractErrorMessage, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import SlotPicker from '../../components/appointments/SlotPicker';

export default function DoctorsDirectoryPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manual Slot Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookDate, setBookDate] = useState(todayIso());
  const [slotsResponse, setSlotsResponse] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [modalError, setModalError] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docList, deptList] = await Promise.all([
        doctorsApi.getAll({
          search: debouncedSearch || undefined,
          departmentId: departmentId || undefined,
          availableOnly,
        }),
        departmentsApi.getAll(true),
      ]);
      setDoctors(docList);
      setDepartments(deptList);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load doctors directory.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, departmentId, availableOnly]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const fetchSlots = useCallback(async (docId, dateStr) => {
    if (!docId || !dateStr) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setModalError('');
    try {
      const res = await doctorsApi.getAvailableSlots(docId, dateStr);
      setSlotsResponse(res);
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Unable to load available time slots.'));
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const openBookingModal = (doc) => {
    const today = todayIso();
    setSelectedDoctor(doc);
    setBookDate(today);
    setReasonForVisit('');
    setModalError('');
    setSelectedSlot(null);
    setSlotsResponse(null);
    fetchSlots(doc.id, today);
  };

  const handleDateChange = (nextDate) => {
    setBookDate(nextDate);
    if (selectedDoctor) {
      fetchSlots(selectedDoctor.id, nextDate);
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) return;

    setBooking(true);
    setModalError('');
    setError('');
    try {
      await appointmentsApi.book({
        doctorId: selectedDoctor.id,
        appointmentDate: bookDate,
        startTime: selectedSlot.startTime,
        reasonForVisit: reasonForVisit.trim(),
        allocatedBySmartEngine: false,
      });
      setSuccess(`Appointment requested with ${selectedDoctor.fullName} on ${bookDate}.`);
      setSelectedDoctor(null);
      setTimeout(() => navigate('/patient/appointments'), 1100);
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Failed to book appointment.'));
      if (err.response?.status === 409) {
        fetchSlots(selectedDoctor.id, bookDate);
      }
    } finally {
      setBooking(false);
    }
  };

  return (
    <DashboardLayout
      title="Find a Doctor & Book Slot"
      subtitle="Search hospital specialists by department and inspect live slot availability"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctor or specialization..."
              className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600"
          />
          Available doctors only
        </label>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading specialists..." />
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No doctors match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-teal-400"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{doc.fullName}</h3>
                      <p className="text-xs font-medium text-teal-700">{doc.departmentName}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.isAvailableForBooking && doc.isUserActive ? 'Available' : 'Unavailable'} />
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-700">{doc.specialization}</p>
                {doc.bio && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{doc.bio}</p>}

                <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Experience</span>
                    <span className="font-semibold text-slate-900">{doc.yearsOfExperience} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultation Fee</span>
                    <span className="font-semibold text-slate-900">${Number(doc.consultationFee).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Slot
                    </span>
                    <span className="font-semibold text-slate-900">{doc.slotDurationMinutes} mins</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> Days
                    </span>
                    <span className="text-right font-medium text-slate-800">
                      {doc.workingDays?.length ? doc.workingDays.map((w) => w.slice(0, 3)).join(', ') : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!doc.isAvailableForBooking || !doc.isUserActive}
                onClick={() => openBookingModal(doc)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                View Available Slots &amp; Book
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(selectedDoctor)}
        onClose={() => setSelectedDoctor(null)}
        title={`Book Appointment — ${selectedDoctor?.fullName || ''}`}
        subtitle={`${selectedDoctor?.departmentName || ''} • ${selectedDoctor?.specialization || ''}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleConfirmBooking} className="space-y-5">
          <AlertBanner type="error" message={modalError} onClose={() => setModalError('')} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Select Date *</label>
            <input
              type="date"
              min={todayIso()}
              value={bookDate}
              onChange={(e) => handleDateChange(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm sm:max-w-xs"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-slate-600">
              Available Time Slots *
            </label>
            <SlotPicker
              slotsResponse={slotsResponse}
              selectedStartTime={selectedSlot?.startTime}
              onSelectSlot={setSelectedSlot}
              isLoading={loadingSlots}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">
              Reason for Visit *
            </label>
            <textarea
              rows={3}
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              required
              placeholder="Describe your symptoms or consultation request..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedDoctor(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSlot || booking}
              className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {booking ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

