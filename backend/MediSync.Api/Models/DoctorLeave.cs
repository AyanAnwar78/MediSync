using System.ComponentModel.DataAnnotations;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Models;

/// <summary>
/// Date-range leave or unavailability record for a doctor.
/// Approved leaves block appointment booking and smart allocation during the date range.
/// </summary>
public class DoctorLeave
{
    public int Id { get; set; }

    public int DoctorId { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    [Required]
    [MaxLength(300)]
    public string Reason { get; set; } = string.Empty;

    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Doctor Doctor { get; set; } = null!;
}

