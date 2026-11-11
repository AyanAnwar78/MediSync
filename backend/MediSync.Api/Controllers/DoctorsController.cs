using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Common;
using MediSync.Api.DTOs.Doctors;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DoctorsController : ControllerBase
{
    private readonly IDoctorService _doctorService;
    private readonly ICurrentUserService _currentUser;

    public DoctorsController(IDoctorService doctorService, ICurrentUserService currentUser)
    {
        _doctorService = doctorService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DoctorDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? departmentId,
        [FromQuery] string? specialization,
        [FromQuery] bool availableOnly = false,
        CancellationToken cancellationToken = default)
    {
        var doctors = await _doctorService.GetAllAsync(
            search,
            departmentId,
            specialization,
            availableOnly,
            cancellationToken);

        return Ok(doctors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DoctorDetailDto>> GetById(
        int id,
        CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorService.GetByIdAsync(id, cancellationToken);
        return Ok(doctor);
    }

    [Authorize(Roles = nameof(UserRole.Admin))]
    [HttpPost]
    public async Task<ActionResult<DoctorDetailDto>> Create(
        [FromBody] CreateDoctorRequest request,
        CancellationToken cancellationToken = default)
    {
        var created = await _doctorService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [Authorize(Roles = nameof(UserRole.Admin))]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<DoctorDto>> Update(
        int id,
        [FromBody] UpdateDoctorRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _doctorService.UpdateAsync(id, request, cancellationToken);
        return Ok(updated);
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpPatch("{id:int}/availability")]
    public async Task<ActionResult<DoctorDto>> UpdateAvailability(
        int id,
        [FromBody] UpdateDoctorAvailabilityRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role == UserRole.Doctor && _currentUser.DoctorId != id)
        {
            throw new UnauthorizedAccessException("Doctors can only update their own booking availability.");
        }

        var updated = await _doctorService.UpdateAvailabilityAsync(id, request.IsAvailableForBooking, cancellationToken);
        return Ok(updated);
    }

    [Authorize(Roles = nameof(UserRole.Admin))]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiMessageResponse>> Delete(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _doctorService.DeleteAsync(id, cancellationToken);
        return Ok(result);
    }
}

