using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Analytics;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly MediSyncDbContext _dbContext;

    public AnalyticsService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AdminAnalyticsDto> GetAdminSummaryAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var totalDoctors = await _dbContext.Doctors.CountAsync(cancellationToken);
        var totalPatients = await _dbContext.Patients.CountAsync(cancellationToken);
        var totalDepartments = await _dbContext.Departments.CountAsync(d => d.IsActive, cancellationToken);

        var doctorsOnLeaveToday = await _dbContext.DoctorLeaves
            .AsNoTracking()
            .Where(l => l.Status == LeaveStatus.Approved && l.StartDate <= today && today <= l.EndDate)
            .Select(l => l.DoctorId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var leaveSet = doctorsOnLeaveToday.ToHashSet();

        var availableDoctors = await _dbContext.Doctors
            .AsNoTracking()
            .CountAsync(d =>
                d.IsAvailableForBooking &&
                d.User.IsActive &&
                d.Department.IsActive &&
                !leaveSet.Contains(d.Id),
                cancellationToken);

        var statusCounts = await _dbContext.Appointments
            .AsNoTracking()
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var pending = statusCounts.FirstOrDefault(s => s.Status == AppointmentStatus.Pending)?.Count ?? 0;
        var confirmed = statusCounts.FirstOrDefault(s => s.Status == AppointmentStatus.Confirmed)?.Count ?? 0;
        var completed = statusCounts.FirstOrDefault(s => s.Status == AppointmentStatus.Completed)?.Count ?? 0;
        var cancelled = statusCounts.FirstOrDefault(s => s.Status == AppointmentStatus.Cancelled)?.Count ?? 0;
        var totalAppointments = pending + confirmed + completed + cancelled;

        var smartAllocated = await _dbContext.Appointments
            .AsNoTracking()
            .CountAsync(a => a.AllocatedBySmartEngine, cancellationToken);

        var departmentDemand = await _dbContext.Departments
            .AsNoTracking()
            .Select(dept => new DepartmentDemandDto
            {
                DepartmentId = dept.Id,
                DepartmentName = dept.Name,
                DoctorCount = dept.Doctors.Count,
                TotalAppointments = dept.Doctors.SelectMany(d => d.Appointments).Count(),
                CompletedAppointments = dept.Doctors.SelectMany(d => d.Appointments)
                    .Count(a => a.Status == AppointmentStatus.Completed),
                ActiveAppointments = dept.Doctors.SelectMany(d => d.Appointments)
                    .Count(a => a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed)
            })
            .OrderByDescending(d => d.TotalAppointments)
            .ThenBy(d => d.DepartmentName)
            .ToListAsync(cancellationToken);

        var workload = await GetDoctorWorkloadAsync(cancellationToken);

        return new AdminAnalyticsDto
        {
            TotalDoctors = totalDoctors,
            AvailableDoctors = availableDoctors,
            TotalPatients = totalPatients,
            TotalDepartments = totalDepartments,
            TotalAppointments = totalAppointments,
            PendingAppointments = pending,
            ConfirmedAppointments = confirmed,
            CompletedAppointments = completed,
            CancelledAppointments = cancelled,
            SmartAllocatedAppointments = smartAllocated,
            MostDemandedDepartments = departmentDemand,
            DoctorWorkloadDistribution = workload.ToList()
        };
    }

    public async Task<IReadOnlyList<DoctorWorkloadDto>> GetDoctorWorkloadAsync(
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var doctorsOnLeaveToday = await _dbContext.DoctorLeaves
            .AsNoTracking()
            .Where(l => l.Status == LeaveStatus.Approved && l.StartDate <= today && today <= l.EndDate)
            .Select(l => l.DoctorId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var leaveSet = doctorsOnLeaveToday.ToHashSet();

        var doctors = await _dbContext.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Appointments)
            .ToListAsync(cancellationToken);

        return doctors
            .Select(d =>
            {
                var todayBooked = d.Appointments.Count(a =>
                    a.AppointmentDate == today && a.Status != AppointmentStatus.Cancelled);

                var upcomingActive = d.Appointments.Count(a =>
                    a.AppointmentDate >= today &&
                    (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed));

                var completed = d.Appointments.Count(a => a.Status == AppointmentStatus.Completed);
                var utilization = d.MaxDailyAppointments > 0
                    ? Math.Round((decimal)todayBooked / d.MaxDailyAppointments * 100m, 1)
                    : 0m;

                return new DoctorWorkloadDto
                {
                    DoctorId = d.Id,
                    DoctorName = d.User.FullName,
                    DepartmentName = d.Department.Name,
                    Specialization = d.Specialization,
                    MaxDailyAppointments = d.MaxDailyAppointments,
                    TodayBookedCount = todayBooked,
                    UpcomingActiveCount = upcomingActive,
                    TotalAppointments = d.Appointments.Count,
                    CompletedAppointments = completed,
                    UtilizationRateTodayPercent = utilization,
                    IsAvailableForBooking = d.IsAvailableForBooking && d.User.IsActive,
                    IsOnLeaveToday = leaveSet.Contains(d.Id)
                };
            })
            .OrderByDescending(w => w.UpcomingActiveCount)
            .ThenByDescending(w => w.TotalAppointments)
            .ThenBy(w => w.DoctorName)
            .ToList();
    }
}

