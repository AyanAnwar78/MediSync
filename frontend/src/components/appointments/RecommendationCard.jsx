import { CalendarCheck2, Clock, Sparkles, Stethoscope } from 'lucide-react';
import { formatDate, formatTime } from '../../utils/formatters';

function ScoreBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="flex justify-between text-[11px] font-medium text-slate-600">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RecommendationCard({ item, onBook, isBooking }) {
  const isTopPick = item.rank === 1;

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-xs transition ${
        isTopPick ? 'border-teal-500 ring-2 ring-teal-500/15' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
              isTopPick ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            #{item.rank}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-slate-900">{item.doctorName}</h4>
              {isTopPick && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 ring-1 ring-teal-600/20">
                  <Sparkles className="h-3 w-3" />
                  Best Match
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
              <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
              <span>
                {item.departmentName} • {item.specialization} • {item.yearsOfExperience} yrs exp
              </span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-600/20">
            {Number(item.totalScore).toFixed(1)} / 100
          </span>
          <p className="mt-1 text-xs font-medium text-slate-500">Fee: ${Number(item.consultationFee).toFixed(0)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <CalendarCheck2 className="h-4 w-4 text-teal-600" />
          {formatDate(item.appointmentDate)}
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Clock className="h-4 w-4 text-teal-600" />
          {formatTime(item.startTime)} – {formatTime(item.endTime)}
        </span>
        <span className="text-slate-500">
          Daily load: {item.dailyBookedCount}/{item.maxDailyAppointments} booked
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-700">Why recommended:</span> {item.recommendationReason}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <ScoreBar label="Specialty" value={item.scoreBreakdown?.specializationScore} />
        <ScoreBar label="Workload" value={item.scoreBreakdown?.workloadBalanceScore} />
        <ScoreBar label="Time Fit" value={item.scoreBreakdown?.preferredTimeScore} />
        <ScoreBar label="Wait Time" value={item.scoreBreakdown?.earlinessScore} />
        <ScoreBar label="Experience" value={item.scoreBreakdown?.experienceScore} />
      </div>

      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={isBooking}
          onClick={() => onBook(item)}
          className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {isBooking ? 'Booking...' : 'Book Recommended Slot'}
        </button>
      </div>
    </div>
  );
}

