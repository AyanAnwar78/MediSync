using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Schedules;

public class ScheduleDayRequest
{
    [Range(0, 6)]
    public DayOfWeek DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public TimeOnly? BreakStartTime { get; set; }

    public TimeOnly? BreakEndTime { get; set; }

    public bool IsActive { get; set; } = true;
}

