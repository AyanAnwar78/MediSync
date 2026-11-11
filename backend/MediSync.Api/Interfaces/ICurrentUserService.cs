using MediSync.Api.Models.Enums;

namespace MediSync.Api.Interfaces;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }
    int? UserId { get; }
    string? Email { get; }
    UserRole? Role { get; }
    int? DoctorId { get; }
    int? PatientId { get; }
}

