using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Analytics;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("admin-summary")]
    public async Task<ActionResult<AdminAnalyticsDto>> GetAdminSummary(
        CancellationToken cancellationToken = default)
    {
        var summary = await _analyticsService.GetAdminSummaryAsync(cancellationToken);
        return Ok(summary);
    }

    [HttpGet("doctor-workload")]
    public async Task<ActionResult<IReadOnlyList<DoctorWorkloadDto>>> GetDoctorWorkload(
        CancellationToken cancellationToken = default)
    {
        var workload = await _analyticsService.GetDoctorWorkloadAsync(cancellationToken);
        return Ok(workload);
    }
}

