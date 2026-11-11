using System.Security.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Auth;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Services;

public class AuthService : IAuthService
{
    private readonly MediSyncDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        MediSyncDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponse> RegisterPatientAsync(
        RegisterPatientRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateOnly.FromDateTime(DateTime.Today))
        {
            throw new ArgumentException("Date of birth cannot be in the future.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailExists = await _dbContext.Users
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Role = UserRole.Patient,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        user.PatientProfile = new Patient
        {
            DateOfBirth = request.DateOfBirth,
            Gender = TrimOrNull(request.Gender),
            BloodGroup = TrimOrNull(request.BloodGroup),
            Address = TrimOrNull(request.Address),
            EmergencyContact = TrimOrNull(request.EmergencyContact)
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var (token, expiresAt) = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = MapToUserProfile(user)
        };
    }

    public async Task<AuthResponse> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _dbContext.Users
            .Include(u => u.DoctorProfile)
                .ThenInclude(d => d!.Department)
            .Include(u => u.PatientProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (user is null)
        {
            throw new AuthenticationException("Invalid email or password.");
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            throw new AuthenticationException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("This account has been deactivated. Contact an administrator.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var (token, expiresAt) = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = MapToUserProfile(user)
        };
    }

    public async Task<UserProfileDto> GetCurrentUserProfileAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Include(u => u.DoctorProfile)
                .ThenInclude(d => d!.Department)
            .Include(u => u.PatientProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException("User account not found.");

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("This account has been deactivated.");
        }

        return MapToUserProfile(user);
    }

    public async Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(
        UserRole? role = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users.AsNoTracking();

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        return await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.FullName)
            .Select(u => new UserSummaryDto
            {
                UserId = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Role = u.Role.ToString(),
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserSummaryDto> UpdateUserStatusAsync(
        int userId,
        bool isActive,
        int actingAdminUserId,
        CancellationToken cancellationToken = default)
    {
        if (userId == actingAdminUserId && !isActive)
        {
            throw new InvalidOperationException("You cannot deactivate your own administrator account.");
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"User with ID {userId} was not found.");

        user.IsActive = isActive;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new UserSummaryDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }

    private static UserProfileDto MapToUserProfile(User user) => new()
    {
        UserId = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        PhoneNumber = user.PhoneNumber,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        DoctorId = user.DoctorProfile?.Id,
        PatientId = user.PatientProfile?.Id,
        Specialization = user.DoctorProfile?.Specialization,
        DepartmentName = user.DoctorProfile?.Department?.Name
    };

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

