using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Auth;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUser;

    public AuthController(IAuthService authService, ICurrentUserService currentUser)
    {
        _authService = authService;
        _currentUser = currentUser;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register(
        [FromBody] RegisterPatientRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _authService.RegisterPatientAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetCurrentUser), response);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);
        return Ok(response);
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserProfileDto>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User identity claim is missing.");

        var profile = await _authService.GetCurrentUserProfileAsync(userId, cancellationToken);
        return Ok(profile);
    }

    [Authorize(Roles = nameof(UserRole.Admin))]
    [HttpGet("users")]
    [ProducesResponseType(typeof(IReadOnlyList<UserSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<UserSummaryDto>>> GetUsers(
        [FromQuery] UserRole? role,
        CancellationToken cancellationToken)
    {
        var users = await _authService.GetUsersAsync(role, cancellationToken);
        return Ok(users);
    }

    [Authorize(Roles = nameof(UserRole.Admin))]
    [HttpPatch("users/{userId:int}/status")]
    [ProducesResponseType(typeof(UserSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserSummaryDto>> UpdateUserStatus(
        int userId,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken cancellationToken)
    {
        var actingAdminUserId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User identity claim is missing.");

        var updated = await _authService.UpdateUserStatusAsync(
            userId,
            request.IsActive,
            actingAdminUserId,
            cancellationToken);

        return Ok(updated);
    }
}

