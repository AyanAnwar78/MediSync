import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTime, todayIso } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AppointmentCalendar({ appointments = [], roleView = 'Patient' }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => todayIso());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const byDate = useMemo(() => {
    const map = {};
    for (const appt of appointments) {
      const key = String(appt.appointmentDate).split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(appt);
    }
    return map;
  }, [appointments]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, iso });
    }
    return cells;
  }, [year, month]);

  const selectedAppointments = byDate[selectedDate] || [];
  const today = todayIso();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-xs text-slate-500">Click any date to inspect scheduled appointments</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(todayIso());
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-slate-50/50" />;
            }

            const dayAppts = byDate[cell.iso] || [];
            const activeCount = dayAppts.filter((a) => a.status !== 'Cancelled').length;
            const isSelected = cell.iso === selectedDate;
            const isToday = cell.iso === today;

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelectedDate(cell.iso)}
                className={`flex h-16 flex-col items-start justify-between rounded-xl border p-2 text-left transition ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                    : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? 'bg-teal-600 text-white' : 'text-slate-700'
                  }`}
                >
                  {cell.day}
                </span>
                {dayAppts.length > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                      activeCount > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {dayAppts.length} appt{dayAppts.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900">Agenda for {selectedDate}</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {selectedAppointments.length} appointment{selectedAppointments.length === 1 ? '' : 's'}
        </p>

        <div className="mt-4 space-y-3">
          {selectedAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No appointments scheduled for this date.
            </div>
          ) : (
            selectedAppointments.map((appt) => (
              <div key={appt.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
                  </span>
                  <StatusBadge status={appt.status} />
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-800">
                  {roleView === 'Doctor' ? appt.patientName : appt.doctorName}
                </p>
                <p className="text-xs text-slate-500">
                  {roleView === 'Doctor' ? appt.reasonForVisit : `${appt.departmentName} • ${appt.doctorSpecialization}`}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

