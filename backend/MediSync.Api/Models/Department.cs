using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.Models;

/// <summary>
/// Medical department that groups doctors by clinical specialty area.
/// </summary>
public class Department
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();
}

