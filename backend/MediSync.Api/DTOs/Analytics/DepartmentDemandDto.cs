namespace MediSync.Api.DTOs.Analytics;

public class DepartmentDemandDto
{
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int DoctorCount { get; set; }
    public int TotalAppointments { get; set; }
    public int CompletedAppointments { get; set; }
    public int ActiveAppointments { get; set; }
}

