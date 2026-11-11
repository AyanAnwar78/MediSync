using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediSync.Api.DTOs.Appointments;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ICurrentUserService _currentUser;

    public AppointmentsController(
        IAppointmentService appointmentService,
        ICurrentUserService currentUser)
    {
        _appointmentService = appointmentService;
        _currentUser = currentUser;
    }

    [HttpGet("/api/doctors/{doctorId:int}/slots")]
    public async Task<ActionResult<DoctorAvailableSlotsResponse>> GetAvailableSlots(
        int doctorId,
        [FromQuery] DateOnly? date,
        CancellationToken cancellationToken = default)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var requestingPatientId = _currentUser.Role == UserRole.Patient ? _currentUser.PatientId : null;

        var slots = await _appointmentService.GetAvailableSlotsAsync(
            doctorId,
            targetDate,
            requestingPatientId,
            cancellationToken);

        return Ok(slots);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AppointmentDto>>> GetAppointments(
        [FromQuery] int? doctorId,
        [FromQuery] int? patientId,
        [FromQuery] AppointmentStatus? status,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken cancellationToken = default)
    {
        var role = _currentUser.Role
            ?? throw new UnauthorizedAccessException("User role claim is missing.");

        int? scopedDoctorId = role == UserRole.Doctor ? _currentUser.DoctorId : doctorId;
        int? scopedPatientId = role == UserRole.Patient ? _currentUser.PatientId : patientId;

        var appointments = await _appointmentService.GetAppointmentsAsync(
            scopedDoctorId,
            scopedPatientId,
            status,
            fromDate,
            toDate,
            cancellationToken);

        return Ok(appointments);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(
        int id,
        CancellationToken cancellationToken = default)
    {
        var role = _currentUser.Role
            ?? throw new UnauthorizedAccessException("User role claim is missing.");

        var appointment = await _appointmentService.GetByIdAsync(
            id,
            role,
            _currentUser.DoctorId,
            _currentUser.PatientId,
            cancellationToken);

        return Ok(appointment);
    }

    [Authorize(Roles = $"{nameof(UserRole.Patient)},{nameof(UserRole.Admin)}")]
    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Book(
        [FromBody] BookAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = _currentUser.Role
            ?? throw new UnauthorizedAccessException("User role claim is missing.");

        int targetPatientId;
        if (role == UserRole.Patient)
        {
            targetPatientId = _currentUser.PatientId
                ?? throw new UnauthorizedAccessException("Patient profile is not linked to your account.");
        }
        else
        {
            targetPatientId = request.PatientId
                ?? throw new ArgumentException("PatientId is required when booking an appointment as an administrator.");
        }

        var created = await _appointmentService.BookAsync(request, targetPatientId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [Authorize(Roles = $"{nameof(UserRole.Doctor)},{nameof(UserRole.Admin)}")]
    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<AppointmentDto>> UpdateStatus(
        int id,
        [FromBody] UpdateAppointmentStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = _currentUser.Role
            ?? throw new UnauthorizedAccessException("User role claim is missing.");

        var updated = await _appointmentService.UpdateStatusAsync(
            id,
            request,
            role,
            _currentUser.DoctorId,
            cancellationToken);

        return Ok(updated);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<AppointmentDto>> Cancel(
        int id,
        [FromBody] CancelAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = _currentUser.Role
            ?? throw new UnauthorizedAccessException("User role claim is missing.");

        var cancelled = await _appointmentService.CancelAsync(
            id,
            request,
            role,
            _currentUser.DoctorId,
            _currentUser.PatientId,
            cancellationToken);

        return Ok(cancelled);
    }
}

