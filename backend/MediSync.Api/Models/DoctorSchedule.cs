namespace MediSync.Api.Models;

/// <summary>
/// Recurring weekly consultation hours and optional break window for a doctor.
/// </summary>
public class DoctorSchedule
{
    public int Id { get; set; }

    public int DoctorId { get; set; }

    public DayOfWeek DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public TimeOnly? BreakStartTime { get; set; }

    public TimeOnly? BreakEndTime { get; set; }

    public bool IsActive { get; set; } = true;

    public Doctor Doctor { get; set; } = null!;
}

