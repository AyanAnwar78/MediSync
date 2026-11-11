using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Schedules;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/doctors/{doctorId:int}/schedules")]
[Authorize]
public class SchedulesController : ControllerBase
{
    private readonly IScheduleService _scheduleService;
    private readonly ICurrentUserService _currentUser;

    public SchedulesController(IScheduleService scheduleService, ICurrentUserService currentUser)
    {
        _scheduleService = scheduleService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DoctorScheduleDto>>> GetByDoctor(
        int doctorId,
        CancellationToken cancellationToken = default)
    {
        var schedules = await _scheduleService.GetDoctorSchedulesAsync(doctorId, cancellationToken);
        return Ok(schedules);
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpPut]
    public async Task<ActionResult<IReadOnlyList<DoctorScheduleDto>>> UpsertSchedules(
        int doctorId,
        [FromBody] UpsertDoctorSchedulesRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureDoctorOwnershipIfDoctorRole(doctorId);

        var schedules = await _scheduleService.UpsertDoctorSchedulesAsync(doctorId, request, cancellationToken);
        return Ok(schedules);
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpDelete("{scheduleId:int}")]
    public async Task<IActionResult> DeleteSchedule(
        int doctorId,
        int scheduleId,
        CancellationToken cancellationToken = default)
    {
        EnsureDoctorOwnershipIfDoctorRole(doctorId);

        await _scheduleService.DeleteScheduleAsync(doctorId, scheduleId, cancellationToken);
        return NoContent();
    }

    private void EnsureDoctorOwnershipIfDoctorRole(int doctorId)
    {
        if (_currentUser.Role == UserRole.Doctor && _currentUser.DoctorId != doctorId)
        {
            throw new UnauthorizedAccessException("Doctors can only manage their own working schedules.");
        }
    }
}

