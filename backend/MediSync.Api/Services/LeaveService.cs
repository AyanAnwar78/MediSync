using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Leaves;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Services;

public class LeaveService : ILeaveService
{
    private readonly MediSyncDbContext _dbContext;

    public LeaveService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DoctorLeaveDto>> GetLeavesAsync(
        int? doctorId = null,
        LeaveStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.DoctorLeaves
            .AsNoTracking()
            .Include(l => l.Doctor)
                .ThenInclude(d => d.User)
            .Include(l => l.Doctor)
                .ThenInclude(d => d.Department)
            .AsQueryable();

        if (doctorId.HasValue)
        {
            query = query.Where(l => l.DoctorId == doctorId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(l => l.Status == status.Value);
        }

        return await query
            .OrderByDescending(l => l.StartDate)
            .Select(l => new DoctorLeaveDto
            {
                Id = l.Id,
                DoctorId = l.DoctorId,
                DoctorName = l.Doctor.User.FullName,
                DepartmentName = l.Doctor.Department.Name,
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                Reason = l.Reason,
                Status = l.Status.ToString(),
                CreatedAt = l.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DoctorLeaveDto>> GetDoctorApprovedLeavesAsync(
        int doctorId,
        CancellationToken cancellationToken = default)
    {
        var doctorExists = await _dbContext.Doctors.AnyAsync(d => d.Id == doctorId, cancellationToken);
        if (!doctorExists)
        {
            throw new KeyNotFoundException($"Doctor with ID {doctorId} was not found.");
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        return await _dbContext.DoctorLeaves
            .AsNoTracking()
            .Where(l => l.DoctorId == doctorId && l.Status == LeaveStatus.Approved && l.EndDate >= today)
            .OrderBy(l => l.StartDate)
            .Select(l => new DoctorLeaveDto
            {
                Id = l.Id,
                DoctorId = l.DoctorId,
                DoctorName = l.Doctor.User.FullName,
                DepartmentName = l.Doctor.Department.Name,
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                Reason = l.Reason,
                Status = l.Status.ToString(),
                CreatedAt = l.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<DoctorLeaveDto> CreateLeaveAsync(
        int doctorId,
        CreateDoctorLeaveRequest request,
        bool autoApprove,
        CancellationToken cancellationToken = default)
    {
        if (request.EndDate < request.StartDate)
        {
            throw new ArgumentException("EndDate cannot be earlier than StartDate.");
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (!autoApprove && request.StartDate < today)
        {
            throw new ArgumentException("Leave requests cannot start in the past.");
        }

        var doctor = await _dbContext.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .FirstOrDefaultAsync(d => d.Id == doctorId, cancellationToken)
            ?? throw new KeyNotFoundException($"Doctor with ID {doctorId} was not found.");

        var overlappingLeave = await _dbContext.DoctorLeaves.AnyAsync(l =>
            l.DoctorId == doctorId &&
            l.Status != LeaveStatus.Rejected &&
            l.StartDate <= request.EndDate &&
            request.StartDate <= l.EndDate,
            cancellationToken);

        if (overlappingLeave)
        {
            throw new InvalidOperationException("An overlapping pending or approved leave already exists for this date range.");
        }

        if (autoApprove)
        {
            await EnsureNoActiveAppointmentsInRangeAsync(doctorId, request.StartDate, request.EndDate, cancellationToken);
        }

        var leave = new DoctorLeave
        {
            DoctorId = doctorId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = request.Reason.Trim(),
            Status = autoApprove ? LeaveStatus.Approved : LeaveStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.DoctorLeaves.Add(leave);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DoctorLeaveDto
        {
            Id = leave.Id,
            DoctorId = leave.DoctorId,
            DoctorName = doctor.User.FullName,
            DepartmentName = doctor.Department.Name,
            StartDate = leave.StartDate,
            EndDate = leave.EndDate,
            Reason = leave.Reason,
            Status = leave.Status.ToString(),
            CreatedAt = leave.CreatedAt
        };
    }

    public async Task<DoctorLeaveDto> UpdateLeaveStatusAsync(
        int leaveId,
        LeaveStatus status,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(status) || status == LeaveStatus.Pending)
        {
            throw new ArgumentException("Leave status must be set to Approved or Rejected.");
        }

        var leave = await _dbContext.DoctorLeaves
            .Include(l => l.Doctor)
                .ThenInclude(d => d.User)
            .Include(l => l.Doctor)
                .ThenInclude(d => d.Department)
            .FirstOrDefaultAsync(l => l.Id == leaveId, cancellationToken)
            ?? throw new KeyNotFoundException($"Leave record with ID {leaveId} was not found.");

        if (status == LeaveStatus.Approved)
        {
            await EnsureNoActiveAppointmentsInRangeAsync(
                leave.DoctorId,
                leave.StartDate,
                leave.EndDate,
                cancellationToken);
        }

        leave.Status = status;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DoctorLeaveDto
        {
            Id = leave.Id,
            DoctorId = leave.DoctorId,
            DoctorName = leave.Doctor.User.FullName,
            DepartmentName = leave.Doctor.Department.Name,
            StartDate = leave.StartDate,
            EndDate = leave.EndDate,
            Reason = leave.Reason,
            Status = leave.Status.ToString(),
            CreatedAt = leave.CreatedAt
        };
    }

    public async Task DeleteLeaveAsync(
        int leaveId,
        int? restrictingDoctorId,
        CancellationToken cancellationToken = default)
    {
        var leave = await _dbContext.DoctorLeaves
            .FirstOrDefaultAsync(l => l.Id == leaveId, cancellationToken)
            ?? throw new KeyNotFoundException($"Leave record with ID {leaveId} was not found.");

        if (restrictingDoctorId.HasValue)
        {
            if (leave.DoctorId != restrictingDoctorId.Value)
            {
                throw new UnauthorizedAccessException("You can only delete your own leave requests.");
            }

            if (leave.Status == LeaveStatus.Approved)
            {
                throw new InvalidOperationException("Approved leaves can only be removed by an administrator.");
            }
        }

        _dbContext.DoctorLeaves.Remove(leave);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureNoActiveAppointmentsInRangeAsync(
        int doctorId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken)
    {
        var conflictCount = await _dbContext.Appointments.CountAsync(a =>
            a.DoctorId == doctorId &&
            a.AppointmentDate >= startDate &&
            a.AppointmentDate <= endDate &&
            (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed),
            cancellationToken);

        if (conflictCount > 0)
        {
            throw new InvalidOperationException(
                $"Doctor has {conflictCount} active (Pending/Confirmed) appointment(s) during {startDate} to {endDate}. Cancel or reassign them before approving leave.");
        }
    }
}

