namespace MediSync.Api.DTOs.Doctors;

public class DoctorDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsUserActive { get; set; }
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public decimal ConsultationFee { get; set; }
    public int SlotDurationMinutes { get; set; }
    public int MaxDailyAppointments { get; set; }
    public int YearsOfExperience { get; set; }
    public string? Bio { get; set; }
    public bool IsAvailableForBooking { get; set; }
    public List<string> WorkingDays { get; set; } = new();
}

