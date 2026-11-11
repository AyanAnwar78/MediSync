using System.ComponentModel.DataAnnotations;
using MediSync.Api.DTOs.Schedules;

namespace MediSync.Api.DTOs.Doctors;

public class CreateDoctorRequest
{
    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [Required]
    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(150)]
    public string Specialization { get; set; } = string.Empty;

    [Required]
    [MaxLength(60)]
    public string LicenseNumber { get; set; } = string.Empty;

    [Range(0, 100000)]
    public decimal ConsultationFee { get; set; }

    [Range(10, 120)]
    public int SlotDurationMinutes { get; set; } = 30;

    [Range(1, 100)]
    public int MaxDailyAppointments { get; set; } = 16;

    [Range(0, 70)]
    public int YearsOfExperience { get; set; }

    [MaxLength(1000)]
    public string? Bio { get; set; }

    public bool IsAvailableForBooking { get; set; } = true;

    public List<ScheduleDayRequest>? Schedules { get; set; }
}

