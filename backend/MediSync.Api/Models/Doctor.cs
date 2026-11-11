using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.Models;

/// <summary>
/// Clinical profile for a doctor user, linking 1:1 to <see cref="User"/>.
/// </summary>
public class Doctor
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int DepartmentId { get; set; }

    [Required]
    [MaxLength(150)]
    public string Specialization { get; set; } = string.Empty;

    [Required]
    [MaxLength(60)]
    public string LicenseNumber { get; set; } = string.Empty;

    public decimal ConsultationFee { get; set; }

    public int SlotDurationMinutes { get; set; } = 30;

    public int MaxDailyAppointments { get; set; } = 16;

    public int YearsOfExperience { get; set; }

    [MaxLength(1000)]
    public string? Bio { get; set; }

    public bool IsAvailableForBooking { get; set; } = true;

    public User User { get; set; } = null!;

    public Department Department { get; set; } = null!;

    public ICollection<DoctorSchedule> Schedules { get; set; } = new List<DoctorSchedule>();

    public ICollection<DoctorLeave> Leaves { get; set; } = new List<DoctorLeave>();

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

