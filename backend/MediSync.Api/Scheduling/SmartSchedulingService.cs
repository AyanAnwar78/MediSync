using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Recommendations;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Scheduling;

/// <summary>
/// Deterministic rule-based multi-criteria recommendation engine.
/// Evaluates genuinely available slots across specialization fit, doctor workload distribution,
/// patient time preference, waiting-time earliness, and experience.
/// </summary>
public class SmartSchedulingService : ISmartSchedulingService
{
    private const int MaxFallbackDays = 5;
    private readonly MediSyncDbContext _dbContext;

    public SmartSchedulingService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<RecommendationResponse> GetRecommendationsAsync(
        RecommendationRequest request,
        int? patientId,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var currentTime = TimeOnly.FromDateTime(DateTime.Now);

        if (request.PreferredDate < today)
        {
            throw new ArgumentException("PreferredDate cannot be in the past.");
        }

        var doctorsQuery = _dbContext.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .Where(d => d.IsAvailableForBooking && d.User.IsActive && d.Department.IsActive);

        if (request.DepartmentId.HasValue)
        {
            doctorsQuery = doctorsQuery.Where(d => d.DepartmentId == request.DepartmentId.Value);
        }

        var specTerm = string.IsNullOrWhiteSpace(request.Specialization)
            ? null
            : request.Specialization.Trim().ToLowerInvariant();

        if (specTerm is not null)
        {
            doctorsQuery = doctorsQuery.Where(d =>
                d.Specialization.ToLower().Contains(specTerm) ||
                d.Department.Name.ToLower().Contains(specTerm));
        }

        var candidateDoctors = await doctorsQuery.ToListAsync(cancellationToken);

        var response = new RecommendationResponse
        {
            RequestedDate = request.PreferredDate,
            EvaluatedDate = request.PreferredDate,
            UsedFallbackDate = false
        };

        if (candidateDoctors.Count == 0)
        {
            return response;
        }

        var daysToCheck = request.SearchNextAvailableDaysIfEmpty ? MaxFallbackDays : 0;

        for (var offset = 0; offset <= daysToCheck; offset++)
        {
            var evalDate = request.PreferredDate.AddDays(offset);
            var (evaluatedCount, scoredCandidates) = await EvaluateDateAsync(
                candidateDoctors,
                evalDate,
                today,
                currentTime,
                specTerm,
                request.DepartmentId.HasValue,
                request.PreferredTime,
                patientId,
                cancellationToken);

            response.TotalCandidatesEvaluated += evaluatedCount;

            if (scoredCandidates.Count > 0)
            {
                var ranked = scoredCandidates
                    .OrderByDescending(c => c.TotalScore)
                    .ThenBy(c => c.DailyBookedCount)
                    .ThenBy(c => c.StartTime)
                    .ThenBy(c => c.DoctorId)
                    .Take(request.MaxResults)
                    .ToList();

                for (var i = 0; i < ranked.Count; i++)
                {
                    ranked[i].Rank = i + 1;
                }

                response.EvaluatedDate = evalDate;
                response.UsedFallbackDate = offset > 0;
                response.Recommendations = ranked;
                return response;
            }
        }

        return response;
    }

    private async Task<(int EvaluatedCount, List<SlotRecommendationDto> Candidates)> EvaluateDateAsync(
        List<Doctor> doctors,
        DateOnly evalDate,
        DateOnly today,
        TimeOnly currentTime,
        string? specTerm,
        bool hasDepartmentFilter,
        TimeOnly? preferredTime,
        int? patientId,
        CancellationToken cancellationToken)
    {
        var doctorIds = doctors.Select(d => d.Id).ToList();

        var doctorsOnLeave = await _dbContext.DoctorLeaves
            .AsNoTracking()
            .Where(l =>
                doctorIds.Contains(l.DoctorId) &&
                l.Status == LeaveStatus.Approved &&
                l.StartDate <= evalDate &&
                evalDate <= l.EndDate)
            .Select(l => l.DoctorId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var leaveSet = doctorsOnLeave.ToHashSet();

        var weekEnd = evalDate.AddDays(6);
        var activeAppointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a =>
                doctorIds.Contains(a.DoctorId) &&
                a.AppointmentDate >= evalDate &&
                a.AppointmentDate <= weekEnd &&
                a.Status != AppointmentStatus.Cancelled)
            .Select(a => new { a.DoctorId, a.AppointmentDate, a.StartTime, a.EndTime })
            .ToListAsync(cancellationToken);

        var patientDayBookings = patientId.HasValue
            ? await _dbContext.Appointments
                .AsNoTracking()
                .Where(a =>
                    a.PatientId == patientId.Value &&
                    a.AppointmentDate == evalDate &&
                    a.Status != AppointmentStatus.Cancelled)
                .Select(a => new { a.StartTime, a.EndTime })
                .ToListAsync(cancellationToken)
            : [];

        var results = new List<SlotRecommendationDto>();
        var evaluatedCount = 0;

        foreach (var doctor in doctors)
        {
            if (leaveSet.Contains(doctor.Id))
            {
                continue;
            }

            var schedule = doctor.Schedules.FirstOrDefault(s =>
                s.DayOfWeek == evalDate.DayOfWeek && s.IsActive);

            if (schedule is null)
            {
                continue;
            }

            var doctorDayBookings = activeAppointments
                .Where(a => a.DoctorId == doctor.Id && a.AppointmentDate == evalDate)
                .ToList();

            var dailyBookedCount = doctorDayBookings.Count;
            if (dailyBookedCount >= doctor.MaxDailyAppointments)
            {
                continue;
            }

            var weeklyBookedCount = activeAppointments.Count(a => a.DoctorId == doctor.Id);
            var activeScheduleDays = Math.Max(1, doctor.Schedules.Count(s => s.IsActive));
            var weeklyCapacity = Math.Max(1, doctor.MaxDailyAppointments * activeScheduleDays);

            var openSlots = SlotGenerator.GenerateDailySlots(
                    schedule,
                    doctor.SlotDurationMinutes,
                    evalDate,
                    today,
                    currentTime)
                .Where(slot =>
                    !doctorDayBookings.Any(b => SlotGenerator.Overlaps(b.StartTime, b.EndTime, slot.StartTime, slot.EndTime)) &&
                    !patientDayBookings.Any(p => SlotGenerator.Overlaps(p.StartTime, p.EndTime, slot.StartTime, slot.EndTime)))
                .ToList();

            if (openSlots.Count == 0)
            {
                continue;
            }

            var specializationScore = ComputeSpecializationScore(doctor, specTerm, hasDepartmentFilter);
            var workloadScore = ComputeWorkloadScore(
                dailyBookedCount,
                doctor.MaxDailyAppointments,
                weeklyBookedCount,
                weeklyCapacity);
            var experienceScore = Math.Min(100m, Math.Round((decimal)doctor.YearsOfExperience / 20m * 100m, 2));

            var shiftMinutes = Math.Max(1.0, (schedule.EndTime.ToTimeSpan() - schedule.StartTime.ToTimeSpan()).TotalMinutes);

            foreach (var slot in openSlots)
            {
                evaluatedCount++;

                var preferredTimeScore = ComputePreferredTimeScore(slot.StartTime, preferredTime);
                var offsetMinutes = (slot.StartTime.ToTimeSpan() - schedule.StartTime.ToTimeSpan()).TotalMinutes;
                var earlinessScore = Math.Max(0m, Math.Round((decimal)(1.0 - (offsetMinutes / shiftMinutes)) * 100m, 2));

                var totalScore = Math.Round(
                    (ScoringWeights.Specialization * specializationScore) +
                    (ScoringWeights.WorkloadBalance * workloadScore) +
                    (ScoringWeights.PreferredTime * preferredTimeScore) +
                    (ScoringWeights.Earliness * earlinessScore) +
                    (ScoringWeights.Experience * experienceScore),
                    2);

                results.Add(new SlotRecommendationDto
                {
                    DoctorId = doctor.Id,
                    DoctorName = doctor.User.FullName,
                    DepartmentId = doctor.DepartmentId,
                    DepartmentName = doctor.Department.Name,
                    Specialization = doctor.Specialization,
                    ConsultationFee = doctor.ConsultationFee,
                    YearsOfExperience = doctor.YearsOfExperience,
                    AppointmentDate = evalDate,
                    StartTime = slot.StartTime,
                    EndTime = slot.EndTime,
                    DailyBookedCount = dailyBookedCount,
                    MaxDailyAppointments = doctor.MaxDailyAppointments,
                    TotalScore = totalScore,
                    ScoreBreakdown = new ScoreBreakdownDto
                    {
                        SpecializationScore = specializationScore,
                        WorkloadBalanceScore = workloadScore,
                        PreferredTimeScore = preferredTimeScore,
                        EarlinessScore = earlinessScore,
                        ExperienceScore = experienceScore
                    },
                    RecommendationReason = BuildReasonText(
                        doctor,
                        dailyBookedCount,
                        slot.StartTime,
                        preferredTime,
                        specializationScore,
                        workloadScore)
                });
            }
        }

        return (evaluatedCount, results);
    }

    private static decimal ComputeSpecializationScore(
        Doctor doctor,
        string? specTerm,
        bool hasDepartmentFilter)
    {
        if (specTerm is null)
        {
            return hasDepartmentFilter ? 85m : 60m;
        }

        var specLower = doctor.Specialization.ToLowerInvariant();
        if (specLower == specTerm)
        {
            return 100m;
        }

        if (specLower.Contains(specTerm))
        {
            return 90m;
        }

        return 75m;
    }

    private static decimal ComputeWorkloadScore(
        int dailyBookedCount,
        int maxDailyAppointments,
        int weeklyBookedCount,
        int weeklyCapacity)
    {
        var dailyFreeRatio = Math.Max(0m, 1m - ((decimal)dailyBookedCount / maxDailyAppointments));
        var weeklyFreeRatio = Math.Max(0m, 1m - Math.Min(1m, (decimal)weeklyBookedCount / weeklyCapacity));
        return Math.Round(((0.70m * dailyFreeRatio) + (0.30m * weeklyFreeRatio)) * 100m, 2);
    }

    private static decimal ComputePreferredTimeScore(TimeOnly slotStart, TimeOnly? preferredTime)
    {
        if (!preferredTime.HasValue)
        {
            return 75m;
        }

        var diffMinutes = Math.Abs((slotStart.ToTimeSpan() - preferredTime.Value.ToTimeSpan()).TotalMinutes);
        var raw = Math.Max(0.0, 100.0 - (diffMinutes / 2.4));
        return Math.Round((decimal)raw, 2);
    }

    private static string BuildReasonText(
        Doctor doctor,
        int dailyBookedCount,
        TimeOnly slotStart,
        TimeOnly? preferredTime,
        decimal specializationScore,
        decimal workloadScore)
    {
        var parts = new List<string>();

        if (specializationScore >= 90m)
        {
            parts.Add($"Strong {doctor.Specialization} match");
        }
        else
        {
            parts.Add($"{doctor.Department.Name} specialist");
        }

        if (workloadScore >= 85m)
        {
            parts.Add($"light workload ({dailyBookedCount}/{doctor.MaxDailyAppointments} booked)");
        }
        else
        {
            parts.Add($"capacity {dailyBookedCount}/{doctor.MaxDailyAppointments} booked");
        }

        if (preferredTime.HasValue)
        {
            var diff = (int)Math.Abs((slotStart.ToTimeSpan() - preferredTime.Value.ToTimeSpan()).TotalMinutes);
            parts.Add(diff == 0
                ? "exact preferred time match"
                : $"{diff} min from preferred {preferredTime.Value:HH:mm}");
        }
        else
        {
            parts.Add("minimized wait time");
        }

        return string.Join("; ", parts);
    }
}

