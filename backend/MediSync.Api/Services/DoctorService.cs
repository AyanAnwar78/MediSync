using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Common;
using MediSync.Api.DTOs.Doctors;
using MediSync.Api.DTOs.Leaves;
using MediSync.Api.DTOs.Schedules;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Services;

public class DoctorService : IDoctorService
{
    private readonly MediSyncDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    public DoctorService(MediSyncDbContext dbContext, IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<DoctorDto>> GetAllAsync(
        string? search = null,
        int? departmentId = null,
        string? specialization = null,
        bool availableOnly = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .AsQueryable();

        if (departmentId.HasValue)
        {
            query = query.Where(d => d.DepartmentId == departmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(specialization))
        {
            var specTerm = specialization.Trim().ToLower();
            query = query.Where(d => d.Specialization.ToLower().Contains(specTerm));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(d =>
                d.User.FullName.ToLower().Contains(term) ||
                d.Specialization.ToLower().Contains(term) ||
                d.Department.Name.ToLower().Contains(term) ||
                d.LicenseNumber.ToLower().Contains(term));
        }

        if (availableOnly)
        {
            query = query.Where(d =>
                d.IsAvailableForBooking &&
                d.User.IsActive &&
                d.Department.IsActive);
        }

        var doctors = await query
            .OrderBy(d => d.Department.Name)
            .ThenBy(d => d.User.FullName)
            .ToListAsync(cancellationToken);

        return doctors.Select(MapToDoctorDto).ToList();
    }

    public async Task<DoctorDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var doctor = await _dbContext.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .Include(d => d.Leaves)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {id} was not found.");

        var baseDto = MapToDoctorDto(doctor);

        return new DoctorDetailDto
        {
            Id = baseDto.Id,
            UserId = baseDto.UserId,
            FullName = baseDto.FullName,
            Email = baseDto.Email,
            PhoneNumber = baseDto.PhoneNumber,
            IsUserActive = baseDto.IsUserActive,
            DepartmentId = baseDto.DepartmentId,
            DepartmentName = baseDto.DepartmentName,
            Specialization = baseDto.Specialization,
            LicenseNumber = baseDto.LicenseNumber,
            ConsultationFee = baseDto.ConsultationFee,
            SlotDurationMinutes = baseDto.SlotDurationMinutes,
            MaxDailyAppointments = baseDto.MaxDailyAppointments,
            YearsOfExperience = baseDto.YearsOfExperience,
            Bio = baseDto.Bio,
            IsAvailableForBooking = baseDto.IsAvailableForBooking,
            WorkingDays = baseDto.WorkingDays,
            Schedules = doctor.Schedules
                .OrderBy(s => s.DayOfWeek)
                .Select(s => new DoctorScheduleDto
                {
                    Id = s.Id,
                    DoctorId = s.DoctorId,
                    DayOfWeek = s.DayOfWeek,
                    DayName = s.DayOfWeek.ToString(),
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    BreakStartTime = s.BreakStartTime,
                    BreakEndTime = s.BreakEndTime,
                    IsActive = s.IsActive
                })
                .ToList(),
            UpcomingLeaves = doctor.Leaves
                .Where(l => l.EndDate >= today && l.Status != LeaveStatus.Rejected)
                .OrderBy(l => l.StartDate)
                .Select(l => new DoctorLeaveDto
                {
                    Id = l.Id,
                    DoctorId = l.DoctorId,
                    DoctorName = doctor.User.FullName,
                    DepartmentName = doctor.Department.Name,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Reason = l.Reason,
                    Status = l.Status.ToString(),
                    CreatedAt = l.CreatedAt
                })
                .ToList()
        };
    }

    public async Task<DoctorDetailDto> CreateAsync(
        CreateDoctorRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedLicense = request.LicenseNumber.Trim().ToUpperInvariant();

        if (await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken))
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        if (await _dbContext.Doctors.AnyAsync(d => d.LicenseNumber.ToUpper() == normalizedLicense, cancellationToken))
        {
            throw new InvalidOperationException($"A doctor with license number '{normalizedLicense}' already exists.");
        }

        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == request.DepartmentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Department with ID {request.DepartmentId} was not found.");

        if (!department.IsActive)
        {
            throw new InvalidOperationException("Cannot assign a doctor to an inactive department.");
        }

        var validatedSchedules = request.Schedules is { Count: > 0 }
            ? ScheduleService.ValidateAndCreateEntities(0, request.Schedules)
            : new List<DoctorSchedule>();

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Role = UserRole.Doctor,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        var doctor = new Doctor
        {
            DepartmentId = request.DepartmentId,
            Specialization = request.Specialization.Trim(),
            LicenseNumber = normalizedLicense,
            ConsultationFee = request.ConsultationFee,
            SlotDurationMinutes = request.SlotDurationMinutes,
            MaxDailyAppointments = request.MaxDailyAppointments,
            YearsOfExperience = request.YearsOfExperience,
            Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim(),
            IsAvailableForBooking = request.IsAvailableForBooking,
            Schedules = validatedSchedules
        };

        user.DoctorProfile = doctor;

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(doctor.Id, cancellationToken);
    }

    public async Task<DoctorDto> UpdateAsync(
        int id,
        UpdateDoctorRequest request,
        CancellationToken cancellationToken = default)
    {
        var doctor = await _dbContext.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {id} was not found.");

        var normalizedLicense = request.LicenseNumber.Trim().ToUpperInvariant();
        var duplicateLicense = await _dbContext.Doctors
            .AnyAsync(d => d.Id != id && d.LicenseNumber.ToUpper() == normalizedLicense, cancellationToken);

        if (duplicateLicense)
        {
            throw new InvalidOperationException($"Another doctor already uses license number '{normalizedLicense}'.");
        }

        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == request.DepartmentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Department with ID {request.DepartmentId} was not found.");

        if (!department.IsActive && doctor.DepartmentId != request.DepartmentId)
        {
            throw new InvalidOperationException("Cannot move a doctor to an inactive department.");
        }

        doctor.User.FullName = request.FullName.Trim();
        doctor.User.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        doctor.User.IsActive = request.IsUserActive;

        doctor.DepartmentId = request.DepartmentId;
        doctor.Department = department;
        doctor.Specialization = request.Specialization.Trim();
        doctor.LicenseNumber = normalizedLicense;
        doctor.ConsultationFee = request.ConsultationFee;
        doctor.SlotDurationMinutes = request.SlotDurationMinutes;
        doctor.MaxDailyAppointments = request.MaxDailyAppointments;
        doctor.YearsOfExperience = request.YearsOfExperience;
        doctor.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        doctor.IsAvailableForBooking = request.IsAvailableForBooking;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDoctorDto(doctor);
    }

    public async Task<DoctorDto> UpdateAvailabilityAsync(
        int id,
        bool isAvailableForBooking,
        CancellationToken cancellationToken = default)
    {
        var doctor = await _dbContext.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {id} was not found.");

        doctor.IsAvailableForBooking = isAvailableForBooking;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDoctorDto(doctor);
    }

    public async Task<ApiMessageResponse> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var doctor = await _dbContext.Doctors
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {id} was not found.");

        var hasAppointments = await _dbContext.Appointments
            .AnyAsync(a => a.DoctorId == id, cancellationToken);

        if (hasAppointments)
        {
            doctor.User.IsActive = false;
            doctor.IsAvailableForBooking = false;
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new ApiMessageResponse
            {
                Message = "Doctor has existing appointment history and was deactivated instead of permanently deleted.",
                Action = "Deactivated"
            };
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        var schedules = await _dbContext.DoctorSchedules
            .Where(s => s.DoctorId == id)
            .ToListAsync(cancellationToken);
        var leaves = await _dbContext.DoctorLeaves
            .Where(l => l.DoctorId == id)
            .ToListAsync(cancellationToken);

        _dbContext.DoctorSchedules.RemoveRange(schedules);
        _dbContext.DoctorLeaves.RemoveRange(leaves);
        _dbContext.Doctors.Remove(doctor);
        _dbContext.Users.Remove(doctor.User);

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new ApiMessageResponse
        {
            Message = "Doctor account and profile deleted successfully.",
            Action = "Deleted"
        };
    }

    private static DoctorDto MapToDoctorDto(Doctor d) => new()
    {
        Id = d.Id,
        UserId = d.UserId,
        FullName = d.User.FullName,
        Email = d.User.Email,
        PhoneNumber = d.User.PhoneNumber,
        IsUserActive = d.User.IsActive,
        DepartmentId = d.DepartmentId,
        DepartmentName = d.Department.Name,
        Specialization = d.Specialization,
        LicenseNumber = d.LicenseNumber,
        ConsultationFee = d.ConsultationFee,
        SlotDurationMinutes = d.SlotDurationMinutes,
        MaxDailyAppointments = d.MaxDailyAppointments,
        YearsOfExperience = d.YearsOfExperience,
        Bio = d.Bio,
        IsAvailableForBooking = d.IsAvailableForBooking,
        WorkingDays = d.Schedules
            .Where(s => s.IsActive)
            .OrderBy(s => s.DayOfWeek)
            .Select(s => s.DayOfWeek.ToString())
            .ToList()
    };
}

