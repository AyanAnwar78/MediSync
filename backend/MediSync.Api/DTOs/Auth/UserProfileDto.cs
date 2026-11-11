namespace MediSync.Api.DTOs.Auth;

public class UserProfileDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? DoctorId { get; set; }
    public int? PatientId { get; set; }
    public string? Specialization { get; set; }
    public string? DepartmentName { get; set; }
}

