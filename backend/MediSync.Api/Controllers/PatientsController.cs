using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Patients;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;
    private readonly ICurrentUserService _currentUser;

    public PatientsController(IPatientService patientService, ICurrentUserService currentUser)
    {
        _patientService = patientService;
        _currentUser = currentUser;
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Doctor)}")]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PatientDto>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var patients = await _patientService.GetAllAsync(search, cancellationToken);
        return Ok(patients);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PatientDto>> GetById(
        int id,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role == UserRole.Patient && _currentUser.PatientId != id)
        {
            throw new UnauthorizedAccessException("Patients can only view their own profile.");
        }

        var patient = await _patientService.GetByIdAsync(id, cancellationToken);
        return Ok(patient);
    }

    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Patient)}")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<PatientDto>> Update(
        int id,
        [FromBody] UpdatePatientRequest request,
        CancellationToken cancellationToken = default)
    {
        var isAdmin = _currentUser.Role == UserRole.Admin;

        if (!isAdmin && _currentUser.PatientId != id)
        {
            throw new UnauthorizedAccessException("Patients can only update their own profile.");
        }

        var updated = await _patientService.UpdateAsync(
            id,
            request,
            allowActiveToggle: isAdmin,
            cancellationToken);

        return Ok(updated);
    }
}

