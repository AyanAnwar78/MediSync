using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Patients;

public class UpdatePatientRequest
{
    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    [MaxLength(10)]
    public string? BloodGroup { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? EmergencyContact { get; set; }

    public bool? IsUserActive { get; set; }
}

