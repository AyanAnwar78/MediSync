namespace MediSync.Api.DTOs.Appointments;

public class AvailableSlotDto
{
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsAvailable { get; set; }
}

