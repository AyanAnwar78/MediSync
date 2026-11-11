namespace MediSync.Api.DTOs.Recommendations;

public class SlotRecommendationDto
{
    public int Rank { get; set; }
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public decimal ConsultationFee { get; set; }
    public int YearsOfExperience { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int DailyBookedCount { get; set; }
    public int MaxDailyAppointments { get; set; }
    public decimal TotalScore { get; set; }
    public ScoreBreakdownDto ScoreBreakdown { get; set; } = new();
    public string RecommendationReason { get; set; } = string.Empty;
}

