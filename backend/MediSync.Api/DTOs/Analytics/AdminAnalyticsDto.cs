namespace MediSync.Api.DTOs.Analytics;

public class AdminAnalyticsDto
{
    public int TotalDoctors { get; set; }
    public int AvailableDoctors { get; set; }
    public int TotalPatients { get; set; }
    public int TotalDepartments { get; set; }
    public int TotalAppointments { get; set; }
    public int PendingAppointments { get; set; }
    public int ConfirmedAppointments { get; set; }
    public int CompletedAppointments { get; set; }
    public int CancelledAppointments { get; set; }
    public int SmartAllocatedAppointments { get; set; }
    public List<DepartmentDemandDto> MostDemandedDepartments { get; set; } = new();
    public List<DoctorWorkloadDto> DoctorWorkloadDistribution { get; set; } = new();
}

