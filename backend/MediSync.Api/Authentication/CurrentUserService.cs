using System.Security.Claims;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Authentication;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public int? UserId => ParseIntClaim(ClaimTypes.NameIdentifier) ?? ParseIntClaim("sub");

    public string? Email => User?.FindFirstValue(ClaimTypes.Email) ?? User?.FindFirstValue("email");

    public UserRole? Role
    {
        get
        {
            var raw = User?.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(raw, out var role) ? role : null;
        }
    }

    public int? DoctorId => ParseIntClaim("doctorId");

    public int? PatientId => ParseIntClaim("patientId");

    private int? ParseIntClaim(string claimType)
    {
        var value = User?.FindFirstValue(claimType);
        return int.TryParse(value, out var parsed) ? parsed : null;
    }
}

