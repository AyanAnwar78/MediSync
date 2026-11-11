using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Appointments;

public class BookAppointmentRequest
{
    [Required]
    public int DoctorId { get; set; }

    public int? PatientId { get; set; }

    [Required]
    public DateOnly AppointmentDate { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    [MaxLength(500)]
    public string ReasonForVisit { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public bool AllocatedBySmartEngine { get; set; }

    [Range(0, 100)]
    public decimal? RecommendationScore { get; set; }
}

