using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.Models;

/// <summary>
/// Demographic and emergency profile for a patient user, linking 1:1 to <see cref="User"/>.
/// </summary>
public class Patient
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    [MaxLength(10)]
    public string? BloodGroup { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? EmergencyContact { get; set; }

    public User User { get; set; } = null!;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

