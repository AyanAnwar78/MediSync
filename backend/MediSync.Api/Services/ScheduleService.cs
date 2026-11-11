using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Schedules;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;

namespace MediSync.Api.Services;

public class ScheduleService : IScheduleService
{
    private readonly MediSyncDbContext _dbContext;

    public ScheduleService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DoctorScheduleDto>> GetDoctorSchedulesAsync(
        int doctorId,
        CancellationToken cancellationToken = default)
    {
        await EnsureDoctorExistsAsync(doctorId, cancellationToken);

        return await _dbContext.DoctorSchedules
            .AsNoTracking()
            .Where(s => s.DoctorId == doctorId)
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
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DoctorScheduleDto>> UpsertDoctorSchedulesAsync(
        int doctorId,
        UpsertDoctorSchedulesRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureDoctorExistsAsync(doctorId, cancellationToken);

        var validatedSchedules = ValidateAndCreateEntities(doctorId, request.Schedules);

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        var existing = await _dbContext.DoctorSchedules
            .Where(s => s.DoctorId == doctorId)
            .ToListAsync(cancellationToken);

        if (existing.Count > 0)
        {
            _dbContext.DoctorSchedules.RemoveRange(existing);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (validatedSchedules.Count > 0)
        {
            _dbContext.DoctorSchedules.AddRange(validatedSchedules);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return await GetDoctorSchedulesAsync(doctorId, cancellationToken);
    }

    public async Task DeleteScheduleAsync(
        int doctorId,
        int scheduleId,
        CancellationToken cancellationToken = default)
    {
        var schedule = await _dbContext.DoctorSchedules
            .FirstOrDefaultAsync(s => s.Id == scheduleId && s.DoctorId == doctorId, cancellationToken)
            ?? throw new KeyNotFoundException($"Schedule entry {scheduleId} for doctor {doctorId} was not found.");

        _dbContext.DoctorSchedules.Remove(schedule);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    internal static List<DoctorSchedule> ValidateAndCreateEntities(
        int doctorId,
        IEnumerable<ScheduleDayRequest> items)
    {
        var list = items.ToList();
        var seenDays = new HashSet<DayOfWeek>();
        var result = new List<DoctorSchedule>(list.Count);

        foreach (var item in list)
        {
            if (!Enum.IsDefined(item.DayOfWeek))
            {
                throw new ArgumentException($"Invalid DayOfWeek value: {item.DayOfWeek}.");
            }

            if (!seenDays.Add(item.DayOfWeek))
            {
                throw new ArgumentException($"Duplicate schedule entry for {item.DayOfWeek}.");
            }

            if (item.EndTime <= item.StartTime)
            {
                throw new ArgumentException($"For {item.DayOfWeek}, EndTime must be after StartTime.");
            }

            if (item.BreakStartTime.HasValue ^ item.BreakEndTime.HasValue)
            {
                throw new ArgumentException($"For {item.DayOfWeek}, both BreakStartTime and BreakEndTime must be specified together.");
            }

            if (item.BreakStartTime.HasValue && item.BreakEndTime.HasValue)
            {
                if (item.BreakEndTime.Value <= item.BreakStartTime.Value)
                {
                    throw new ArgumentException($"For {item.DayOfWeek}, BreakEndTime must be after BreakStartTime.");
                }

                if (item.BreakStartTime.Value < item.StartTime || item.BreakEndTime.Value > item.EndTime)
                {
                    throw new ArgumentException($"For {item.DayOfWeek}, break hours must fall within working hours.");
                }
            }

            result.Add(new DoctorSchedule
            {
                DoctorId = doctorId,
                DayOfWeek = item.DayOfWeek,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                BreakStartTime = item.BreakStartTime,
                BreakEndTime = item.BreakEndTime,
                IsActive = item.IsActive
            });
        }

        return result;
    }

    private async Task EnsureDoctorExistsAsync(int doctorId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Doctors.AnyAsync(d => d.Id == doctorId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException($"Doctor with ID {doctorId} was not found.");
        }
    }
}

