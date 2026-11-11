namespace MediSync.Api.DTOs.Analytics;

public class DoctorWorkloadDto
{
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public int MaxDailyAppointments { get; set; }
    public int TodayBookedCount { get; set; }
    public int UpcomingActiveCount { get; set; }
    public int TotalAppointments { get; set; }
    public int CompletedAppointments { get; set; }
    public decimal UtilizationRateTodayPercent { get; set; }
    public bool IsAvailableForBooking { get; set; }
    public bool IsOnLeaveToday { get; set; }
}

