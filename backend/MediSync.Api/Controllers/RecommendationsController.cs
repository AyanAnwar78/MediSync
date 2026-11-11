using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Recommendations;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{nameof(UserRole.Patient)},{nameof(UserRole.Admin)}")]
public class RecommendationsController : ControllerBase
{
    private readonly ISmartSchedulingService _smartSchedulingService;
    private readonly ICurrentUserService _currentUser;

    public RecommendationsController(
        ISmartSchedulingService smartSchedulingService,
        ICurrentUserService currentUser)
    {
        _smartSchedulingService = smartSchedulingService;
        _currentUser = currentUser;
    }

    [HttpPost("slots")]
    public async Task<ActionResult<RecommendationResponse>> GetSlotRecommendations(
        [FromBody] RecommendationRequest request,
        CancellationToken cancellationToken = default)
    {
        int? patientId = _currentUser.Role == UserRole.Patient
            ? _currentUser.PatientId
            : request.PatientId;

        var response = await _smartSchedulingService.GetRecommendationsAsync(
            request,
            patientId,
            cancellationToken);

        return Ok(response);
    }
}

