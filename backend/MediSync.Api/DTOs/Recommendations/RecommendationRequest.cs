using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Recommendations;

public class RecommendationRequest
{
    public int? DepartmentId { get; set; }

    [MaxLength(150)]
    public string? Specialization { get; set; }

    [Required]
    public DateOnly PreferredDate { get; set; }

    public TimeOnly? PreferredTime { get; set; }

    public int? PatientId { get; set; }

    [Range(1, 30)]
    public int MaxResults { get; set; } = 10;

    public bool SearchNextAvailableDaysIfEmpty { get; set; } = true;
}

