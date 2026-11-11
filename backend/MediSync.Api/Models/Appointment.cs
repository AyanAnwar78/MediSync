using System.ComponentModel.DataAnnotations;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Models;

/// <summary>
/// Scheduled medical consultation between a patient and a doctor.
/// </summary>
public class Appointment
{
    public int Id { get; set; }

    public int DoctorId { get; set; }

    public int PatientId { get; set; }

    public DateOnly AppointmentDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

    [Required]
    [MaxLength(500)]
    public string ReasonForVisit { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(500)]
    public string? CancellationReason { get; set; }

    public bool AllocatedBySmartEngine { get; set; }

    public decimal? RecommendationScore { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public Doctor Doctor { get; set; } = null!;

    public Patient Patient { get; set; } = null!;
}

