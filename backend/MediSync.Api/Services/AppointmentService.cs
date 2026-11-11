using System.Data;
using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Appointments;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;
using MediSync.Api.Scheduling;

namespace MediSync.Api.Services;

public class AppointmentService : IAppointmentService
{
    private readonly MediSyncDbContext _dbContext;

    public AppointmentService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DoctorAvailableSlotsResponse> GetAvailableSlotsAsync(
        int doctorId,
        DateOnly date,
        int? requestingPatientId = null,
        CancellationToken cancellationToken = default)
    {
        var doctor = await _dbContext.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .FirstOrDefaultAsync(d => d.Id == doctorId, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {doctorId} was not found.");

        var response = new DoctorAvailableSlotsResponse
        {
            DoctorId = doctor.Id,
            DoctorName = doctor.User.FullName,
            Specialization = doctor.Specialization,
            DepartmentName = doctor.Department.Name,
            Date = date,
            SlotDurationMinutes = doctor.SlotDurationMinutes,
            MaxDailyAppointments = doctor.MaxDailyAppointments
        };

        var today = DateOnly.FromDateTime(DateTime.Today);
        var currentTime = TimeOnly.FromDateTime(DateTime.Now);

        if (date < today)
        {
            response.IsDoctorAvailable = false;
            response.UnavailableReason = "Selected date is in the past.";
            return response;
        }

        if (!doctor.User.IsActive || !doctor.Department.IsActive || !doctor.IsAvailableForBooking)
        {
            response.IsDoctorAvailable = false;
            response.UnavailableReason = "Doctor is currently unavailable for booking.";
            return response;
        }

        var onApprovedLeave = await _dbContext.DoctorLeaves
            .AsNoTracking()
            .AnyAsync(l =>
                l.DoctorId == doctorId &&
                l.Status == LeaveStatus.Approved &&
                l.StartDate <= date &&
                date <= l.EndDate,
                cancellationToken);

        if (onApprovedLeave)
        {
            response.IsDoctorAvailable = false;
            response.UnavailableReason = "Doctor is on approved leave on this date.";
            return response;
        }

        var schedule = doctor.Schedules.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek && s.IsActive);
        if (schedule is null)
        {
            response.IsDoctorAvailable = false;
            response.UnavailableReason = $"Doctor does not have active working hours on {date.DayOfWeek}.";
            return response;
        }

        var doctorBookings = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.DoctorId == doctorId && a.AppointmentDate == date && a.Status != AppointmentStatus.Cancelled)
            .Select(a => new { a.StartTime, a.EndTime })
            .ToListAsync(cancellationToken);

        response.DailyBookedCount = doctorBookings.Count;

        if (doctorBookings.Count >= doctor.MaxDailyAppointments)
        {
            response.IsDoctorAvailable = false;
            response.UnavailableReason = "Doctor has reached maximum daily appointment capacity for this date.";
            return response;
        }

        var patientBookings = requestingPatientId.HasValue
            ? await _dbContext.Appointments
                .AsNoTracking()
                .Where(a =>
                    a.PatientId == requestingPatientId.Value &&
                    a.AppointmentDate == date &&
                    a.Status != AppointmentStatus.Cancelled)
                .Select(a => new { a.StartTime, a.EndTime })
                .ToListAsync(cancellationToken)
            : [];

        var candidateSlots = SlotGenerator.GenerateDailySlots(
            schedule,
            doctor.SlotDurationMinutes,
            date,
            today,
            currentTime);

        var openSlots = candidateSlots
            .Where(slot =>
                !doctorBookings.Any(b => SlotGenerator.Overlaps(b.StartTime, b.EndTime, slot.StartTime, slot.EndTime)) &&
                !patientBookings.Any(p => SlotGenerator.Overlaps(p.StartTime, p.EndTime, slot.StartTime, slot.EndTime)))
            .Select(slot => new AvailableSlotDto
            {
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                IsAvailable = true
            })
            .ToList();

        response.IsDoctorAvailable = openSlots.Count > 0;
        response.AvailableSlots = openSlots;
        if (openSlots.Count == 0)
        {
            response.UnavailableReason = "No remaining unbooked slots are available on this date.";
        }

        return response;
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetAppointmentsAsync(
        int? doctorId = null,
        int? patientId = null,
        AppointmentStatus? status = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildAppointmentQuery();

        if (doctorId.HasValue)
        {
            query = query.Where(a => a.DoctorId == doctorId.Value);
        }

        if (patientId.HasValue)
        {
            query = query.Where(a => a.PatientId == patientId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(a => a.AppointmentDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(a => a.AppointmentDate <= toDate.Value);
        }

        var appointments = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .ToListAsync(cancellationToken);

        return appointments.Select(MapToDto).ToList();
    }

    public async Task<AppointmentDto> GetByIdAsync(
        int id,
        UserRole callerRole,
        int? callerDoctorId,
        int? callerPatientId,
        CancellationToken cancellationToken = default)
    {
        var appointment = await BuildAppointmentQuery()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Appointment with ID {id} was not found.");

        EnsureReadAccess(appointment, callerRole, callerDoctorId, callerPatientId);

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> BookAsync(
        BookAppointmentRequest request,
        int targetPatientId,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var currentTime = TimeOnly.FromDateTime(DateTime.Now);

        if (request.AppointmentDate < today)
        {
            throw new ArgumentException("Appointments cannot be booked in the past.");
        }

        // Serializable transaction re-verifies availability immediately prior to insert to prevent race double-bookings.
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var doctor = await _dbContext.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .FirstOrDefaultAsync(d => d.Id == request.DoctorId, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {request.DoctorId} was not found.");

        if (!doctor.User.IsActive || !doctor.Department.IsActive || !doctor.IsAvailableForBooking)
        {
            throw new InvalidOperationException("Selected doctor is currently unavailable for appointments.");
        }

        var patient = await _dbContext.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == targetPatientId, cancellationToken)
            ?? throw new KeyNotFoundException($"Patient with ID {targetPatientId} was not found.");

        if (!patient.User.IsActive)
        {
            throw new InvalidOperationException("Patient account is deactivated and cannot book appointments.");
        }

        var schedule = doctor.Schedules.FirstOrDefault(s =>
            s.DayOfWeek == request.AppointmentDate.DayOfWeek && s.IsActive);

        if (schedule is null)
        {
            throw new InvalidOperationException(
                $"Doctor does not have active working hours on {request.AppointmentDate.DayOfWeek}.");
        }

        var validDailySlots = SlotGenerator.GenerateDailySlots(
            schedule,
            doctor.SlotDurationMinutes,
            request.AppointmentDate,
            today,
            currentTime);

        var requestedSlot = validDailySlots.FirstOrDefault(s => s.StartTime == request.StartTime);
        if (requestedSlot == default)
        {
            throw new InvalidOperationException(
                $"Time slot {request.StartTime:HH:mm} on {request.AppointmentDate:yyyy-MM-dd} is outside the doctor's available schedule, falls during a break, or is in the past.");
        }

        var onApprovedLeave = await _dbContext.DoctorLeaves.AnyAsync(l =>
            l.DoctorId == doctor.Id &&
            l.Status == LeaveStatus.Approved &&
            l.StartDate <= request.AppointmentDate &&
            request.AppointmentDate <= l.EndDate,
            cancellationToken);

        if (onApprovedLeave)
        {
            throw new InvalidOperationException("Doctor is on approved leave on the selected date.");
        }

        var doctorDayAppointments = await _dbContext.Appointments
            .Where(a =>
                a.DoctorId == doctor.Id &&
                a.AppointmentDate == request.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled)
            .Select(a => new { a.StartTime, a.EndTime })
            .ToListAsync(cancellationToken);

        if (doctorDayAppointments.Count >= doctor.MaxDailyAppointments)
        {
            throw new InvalidOperationException("Doctor has reached maximum daily appointment capacity for this date.");
        }

        if (doctorDayAppointments.Any(a =>
                SlotGenerator.Overlaps(a.StartTime, a.EndTime, requestedSlot.StartTime, requestedSlot.EndTime)))
        {
            throw new InvalidOperationException("This time slot is already booked for the selected doctor.");
        }

        var patientDayAppointments = await _dbContext.Appointments
            .Where(a =>
                a.PatientId == patient.Id &&
                a.AppointmentDate == request.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled)
            .Select(a => new { a.StartTime, a.EndTime })
            .ToListAsync(cancellationToken);

        if (patientDayAppointments.Any(a =>
                SlotGenerator.Overlaps(a.StartTime, a.EndTime, requestedSlot.StartTime, requestedSlot.EndTime)))
        {
            throw new InvalidOperationException("You already have another overlapping appointment at this date and time.");
        }

        var appointment = new Appointment
        {
            DoctorId = doctor.Id,
            PatientId = patient.Id,
            AppointmentDate = request.AppointmentDate,
            StartTime = requestedSlot.StartTime,
            EndTime = requestedSlot.EndTime,
            Status = AppointmentStatus.Pending,
            ReasonForVisit = request.ReasonForVisit.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            AllocatedBySmartEngine = request.AllocatedBySmartEngine,
            RecommendationScore = request.RecommendationScore,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Appointments.Add(appointment);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetByIdAsync(appointment.Id, UserRole.Admin, null, null, cancellationToken);
    }

    public async Task<AppointmentDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentStatusRequest request,
        UserRole callerRole,
        int? callerDoctorId,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.Status))
        {
            throw new ArgumentException("Invalid appointment status.");
        }

        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Appointment with ID {id} was not found.");

        if (callerRole == UserRole.Doctor && appointment.DoctorId != callerDoctorId)
        {
            throw new UnauthorizedAccessException("Doctors can only manage their own appointments.");
        }

        ValidateStatusTransition(appointment.Status, request.Status);

        appointment.Status = request.Status;
        appointment.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            appointment.Notes = request.Notes.Trim();
        }

        if (request.Status == AppointmentStatus.Cancelled)
        {
            appointment.CancellationReason = string.IsNullOrWhiteSpace(request.CancellationReason)
                ? "Cancelled by clinical staff."
                : request.CancellationReason.Trim();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, callerRole, callerDoctorId, null, cancellationToken);
    }

    public async Task<AppointmentDto> CancelAsync(
        int id,
        CancelAppointmentRequest request,
        UserRole callerRole,
        int? callerDoctorId,
        int? callerPatientId,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Appointment with ID {id} was not found.");

        EnsureReadAccess(appointment, callerRole, callerDoctorId, callerPatientId);

        if (appointment.Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled)
        {
            throw new InvalidOperationException(
                $"Appointments with status '{appointment.Status}' cannot be cancelled.");
        }

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancellationReason = request.CancellationReason.Trim();
        appointment.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, callerRole, callerDoctorId, callerPatientId, cancellationToken);
    }

    private IQueryable<Appointment> BuildAppointmentQuery()
    {
        return _dbContext.Appointments
            .AsNoTracking()
            .Include(a => a.Doctor)
                .ThenInclude(d => d.User)
            .Include(a => a.Doctor)
                .ThenInclude(d => d.Department)
            .Include(a => a.Patient)
                .ThenInclude(p => p.User);
    }

    private static void EnsureReadAccess(
        Appointment appointment,
        UserRole callerRole,
        int? callerDoctorId,
        int? callerPatientId)
    {
        if (callerRole == UserRole.Admin)
        {
            return;
        }

        if (callerRole == UserRole.Doctor && appointment.DoctorId == callerDoctorId)
        {
            return;
        }

        if (callerRole == UserRole.Patient && appointment.PatientId == callerPatientId)
        {
            return;
        }

        throw new UnauthorizedAccessException("You do not have permission to access this appointment.");
    }

    private static void ValidateStatusTransition(AppointmentStatus current, AppointmentStatus target)
    {
        if (current is AppointmentStatus.Completed or AppointmentStatus.Cancelled)
        {
            throw new InvalidOperationException(
                $"Cannot change status of an appointment that is already {current}.");
        }

        var valid = (current, target) switch
        {
            (AppointmentStatus.Pending, AppointmentStatus.Confirmed) => true,
            (AppointmentStatus.Pending, AppointmentStatus.Cancelled) => true,
            (AppointmentStatus.Confirmed, AppointmentStatus.Completed) => true,
            (AppointmentStatus.Confirmed, AppointmentStatus.Cancelled) => true,
            _ => false
        };

        if (!valid)
        {
            throw new InvalidOperationException(
                $"Invalid appointment status transition from {current} to {target}.");
        }
    }

    private static AppointmentDto MapToDto(Appointment a) => new()
    {
        Id = a.Id,
        DoctorId = a.DoctorId,
        DoctorName = a.Doctor.User.FullName,
        DoctorSpecialization = a.Doctor.Specialization,
        DepartmentName = a.Doctor.Department.Name,
        ConsultationFee = a.Doctor.ConsultationFee,
        PatientId = a.PatientId,
        PatientName = a.Patient.User.FullName,
        PatientEmail = a.Patient.User.Email,
        PatientPhone = a.Patient.User.PhoneNumber,
        PatientGender = a.Patient.Gender,
        PatientBloodGroup = a.Patient.BloodGroup,
        PatientDateOfBirth = a.Patient.DateOfBirth,
        AppointmentDate = a.AppointmentDate,
        StartTime = a.StartTime,
        EndTime = a.EndTime,
        Status = a.Status.ToString(),
        ReasonForVisit = a.ReasonForVisit,
        Notes = a.Notes,
        CancellationReason = a.CancellationReason,
        AllocatedBySmartEngine = a.AllocatedBySmartEngine,
        RecommendationScore = a.RecommendationScore,
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt
    };
}

