namespace MediSync.Api.DTOs.Appointments;

public class DoctorAvailableSlotsResponse
{
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int SlotDurationMinutes { get; set; }
    public int DailyBookedCount { get; set; }
    public int MaxDailyAppointments { get; set; }
    public bool IsDoctorAvailable { get; set; }
    public string? UnavailableReason { get; set; }
    public List<AvailableSlotDto> AvailableSlots { get; set; } = new();
}

