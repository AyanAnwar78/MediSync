using MediSync.Api.Models;

namespace MediSync.Api.Scheduling;

/// <summary>
/// Shared deterministic slot-generation and interval-overlap helpers used by both
/// direct appointment booking and the smart recommendation engine.
/// </summary>
public static class SlotGenerator
{
    public static List<(TimeOnly StartTime, TimeOnly EndTime)> GenerateDailySlots(
        DoctorSchedule schedule,
        int slotDurationMinutes,
        DateOnly targetDate,
        DateOnly today,
        TimeOnly currentTime)
    {
        var slots = new List<(TimeOnly StartTime, TimeOnly EndTime)>();

        if (!schedule.IsActive || slotDurationMinutes <= 0)
        {
            return slots;
        }

        var cursor = schedule.StartTime.ToTimeSpan();
        var endLimit = schedule.EndTime.ToTimeSpan();
        var duration = TimeSpan.FromMinutes(slotDurationMinutes);

        var hasBreak = schedule.BreakStartTime.HasValue && schedule.BreakEndTime.HasValue;
        var breakStart = schedule.BreakStartTime?.ToTimeSpan() ?? TimeSpan.Zero;
        var breakEnd = schedule.BreakEndTime?.ToTimeSpan() ?? TimeSpan.Zero;

        while (cursor + duration <= endLimit)
        {
            var slotStartSpan = cursor;
            var slotEndSpan = cursor + duration;

            if (hasBreak && slotStartSpan < breakEnd && breakStart < slotEndSpan)
            {
                // Skip across the break window so post-break slots begin right when consultation resumes.
                cursor = breakEnd;
                continue;
            }

            var slotStart = TimeOnly.FromTimeSpan(slotStartSpan);
            var slotEnd = TimeOnly.FromTimeSpan(slotEndSpan);

            if (targetDate > today || (targetDate == today && slotStart > currentTime))
            {
                slots.Add((slotStart, slotEnd));
            }

            cursor = slotEndSpan;
        }

        return slots;
    }

    public static bool Overlaps(
        TimeOnly startA,
        TimeOnly endA,
        TimeOnly startB,
        TimeOnly endB)
    {
        return startA < endB && startB < endA;
    }
}

