using System.ComponentModel.DataAnnotations;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Models;

/// <summary>
/// Central user identity record shared across Admin, Doctor, and Patient roles.
/// Role-specific details live in <see cref="Doctor"/> or <see cref="Patient"/> to avoid duplicate personal data.
/// </summary>
public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public UserRole Role { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Doctor? DoctorProfile { get; set; }

    public Patient? PatientProfile { get; set; }
}

