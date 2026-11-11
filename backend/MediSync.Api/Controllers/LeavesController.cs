using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Leaves;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeavesController : ControllerBase
{
    private readonly ILeaveService _leaveService;
    private readonly ICurrentUserService _currentUser;

    public LeavesController(ILeaveService leaveService, ICurrentUserService currentUser)
    {
        _leaveService = leaveService;
        _currentUser = currentUser;
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DoctorLeaveDto>>> GetLeaves(
        [FromQuery] int? doctorId,
        [FromQuery] LeaveStatus? status,
        CancellationToken cancellationToken = default)
    {
        var scopedDoctorId = _currentUser.Role == UserRole.Doctor
            ? _currentUser.DoctorId
            : doctorId;

        var leaves = await _leaveService.GetLeavesAsync(scopedDoctorId, status, cancellationToken);
        return Ok(leaves);
    }

    [HttpGet("doctor/{doctorId:int}/approved")]
    public async Task<ActionResult<IReadOnlyList<DoctorLeaveDto>>> GetApprovedDoctorLeaves(
        int doctorId,
        CancellationToken cancellationToken = default)
    {
        var leaves = await _leaveService.GetDoctorApprovedLeavesAsync(doctorId, cancellationToken);
        return Ok(leaves);
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpPost]
    public async Task<ActionResult<DoctorLeaveDto>> CreateLeave(
        [FromBody] CreateDoctorLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        var isAdmin = _currentUser.Role == UserRole.Admin;
        var targetDoctorId = isAdmin
            ? request.DoctorId ?? throw new ArgumentException("DoctorId is required when creating leave as an administrator.")
            : _currentUser.DoctorId ?? throw new UnauthorizedAccessException("Doctor profile not linked to current user.");

        var created = await _leaveService.CreateLeaveAsync(
            targetDoctorId,
            request,
            autoApprove: isAdmin,
            cancellationToken);

        return CreatedAtAction(nameof(GetLeaves), new { doctorId = created.DoctorId }, created);
    }

    [Authorize(Roles = nameof(UserRole.Admin))]
    [HttpPatch("{leaveId:int}/status")]
    public async Task<ActionResult<DoctorLeaveDto>> UpdateLeaveStatus(
        int leaveId,
        [FromBody] UpdateLeaveStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _leaveService.UpdateLeaveStatusAsync(leaveId, request.Status, cancellationToken);
        return Ok(updated);
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpDelete("{leaveId:int}")]
    public async Task<IActionResult> DeleteLeave(
        int leaveId,
        CancellationToken cancellationToken = default)
    {
        int? restrictingDoctorId = _currentUser.Role == UserRole.Doctor ? _currentUser.DoctorId : null;
        await _leaveService.DeleteLeaveAsync(leaveId, restrictingDoctorId, cancellationToken);
        return NoContent();
    }
}

