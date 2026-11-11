using MediSync.Api.DTOs.Auth;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterPatientAsync(RegisterPatientRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<UserProfileDto> GetCurrentUserProfileAsync(int userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(UserRole? role = null, CancellationToken cancellationToken = default);
    Task<UserSummaryDto> UpdateUserStatusAsync(int userId, bool isActive, int actingAdminUserId, CancellationToken cancellationToken = default);
}

