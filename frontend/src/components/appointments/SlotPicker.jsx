import { Clock } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

export default function SlotPicker({ slotsResponse, selectedStartTime, onSelectSlot, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Checking real-time slot availability...
      </div>
    );
  }

  if (!slotsResponse) {
    return null;
  }

  if (!slotsResponse.isDoctorAvailable || slotsResponse.availableSlots.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {slotsResponse.unavailableReason || 'No available slots found for this date.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {slotsResponse.availableSlots.length} open slot{slotsResponse.availableSlots.length === 1 ? '' : 's'} (
          {slotsResponse.slotDurationMinutes} min each)
        </span>
        <span>
          Daily load: {slotsResponse.dailyBookedCount} / {slotsResponse.maxDailyAppointments} booked
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {slotsResponse.availableSlots.map((slot) => {
          const isSelected = selectedStartTime === slot.startTime;
          return (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                isSelected
                  ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50/50'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(slot.startTime)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

