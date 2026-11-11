namespace MediSync.Api.DTOs.Recommendations;

public class ScoreBreakdownDto
{
    public decimal SpecializationScore { get; set; }
    public decimal WorkloadBalanceScore { get; set; }
    public decimal PreferredTimeScore { get; set; }
    public decimal EarlinessScore { get; set; }
    public decimal ExperienceScore { get; set; }
}

