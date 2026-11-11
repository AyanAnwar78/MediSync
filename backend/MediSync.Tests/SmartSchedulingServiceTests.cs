using MediSync.Api.DTOs.Recommendations;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;
using MediSync.Api.Scheduling;

namespace MediSync.Tests;

public class SmartSchedulingServiceTests
{
    [Fact]
    public async Task GetRecommendations_WorkloadBalancingRanksLighterDoctorHigher()
    {
        using var db = TestDbFactory.CreateContext();
        var targetDate = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (cardio, docs, _, patient2) = await TestDbFactory.SeedClinicalScenarioAsync(db, targetDate);

        // Load HeavyCardio with 4 active bookings (not at 10:00 so 10:00 stays open on both doctors for fair score comparison)
        foreach (var hour in new[] { 9, 11, 12, 14 })
        {
            db.Appointments.Add(new Appointment
            {
                DoctorId = docs.HeavyCardio.Id,
                PatientId = patient2.Id,
                AppointmentDate = targetDate,
                StartTime = new TimeOnly(hour, 0),
                EndTime = new TimeOnly(hour, 30),
                Status = AppointmentStatus.Confirmed,
                ReasonForVisit = "Busy schedule load"
            });
        }
        await db.SaveChangesAsync();

        var smartService = new SmartSchedulingService(db);
        var response = await smartService.GetRecommendationsAsync(
            new RecommendationRequest
            {
                DepartmentId = cardio.Id,
                Specialization = "Interventional Cardiology",
                PreferredDate = targetDate,
                PreferredTime = new TimeOnly(10, 0),
                MaxResults = 10,
                SearchNextAvailableDaysIfEmpty = true
            },
            patientId: null);

        Assert.True(response.IsRuleBasedEngine);
        Assert.NotEmpty(response.Recommendations);

        var top = response.Recommendations[0];
        Assert.Equal(docs.LightCardio.Id, top.DoctorId);
        Assert.Equal(new TimeOnly(10, 0), top.StartTime);
        Assert.Equal(100m, top.ScoreBreakdown.WorkloadBalanceScore);

        var heavyAt10 = response.Recommendations.First(r =>
            r.DoctorId == docs.HeavyCardio.Id && r.StartTime == new TimeOnly(10, 0));
        Assert.True(top.TotalScore > heavyAt10.TotalScore);
    }

    [Fact]
    public async Task GetRecommendations_ExcludesDoctorsOnApprovedLeaveAndUsesFallbackDate()
    {
        using var db = TestDbFactory.CreateContext();
        var requestedDate = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (cardio, docs, _, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, requestedDate);

        db.DoctorLeaves.AddRange(
            new DoctorLeave
            {
                DoctorId = docs.HeavyCardio.Id,
                StartDate = requestedDate,
                EndDate = requestedDate,
                Reason = "Leave 1",
                Status = LeaveStatus.Approved
            },
            new DoctorLeave
            {
                DoctorId = docs.LightCardio.Id,
                StartDate = requestedDate,
                EndDate = requestedDate,
                Reason = "Leave 2",
                Status = LeaveStatus.Approved
            });
        await db.SaveChangesAsync();

        var smartService = new SmartSchedulingService(db);
        var response = await smartService.GetRecommendationsAsync(
            new RecommendationRequest
            {
                DepartmentId = cardio.Id,
                PreferredDate = requestedDate,
                PreferredTime = new TimeOnly(10, 0),
                MaxResults = 5,
                SearchNextAvailableDaysIfEmpty = true
            },
            patientId: null);

        Assert.True(response.UsedFallbackDate);
        Assert.Equal(requestedDate.AddDays(1), response.EvaluatedDate);
        Assert.NotEmpty(response.Recommendations);
    }

    [Fact]
    public async Task GetRecommendations_ExcludesSlotsWherePatientAlreadyHasAppointment()
    {
        using var db = TestDbFactory.CreateContext();
        var targetDate = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (cardio, docs, patient1, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, targetDate);

        // Patient 1 already has a Neuro appointment at 10:00–10:30
        db.Appointments.Add(new Appointment
        {
            DoctorId = docs.Neuro.Id,
            PatientId = patient1.Id,
            AppointmentDate = targetDate,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(10, 30),
            Status = AppointmentStatus.Pending,
            ReasonForVisit = "Neuro checkup"
        });
        await db.SaveChangesAsync();

        var smartService = new SmartSchedulingService(db);
        var response = await smartService.GetRecommendationsAsync(
            new RecommendationRequest
            {
                DepartmentId = cardio.Id,
                PreferredDate = targetDate,
                PreferredTime = new TimeOnly(10, 0),
                MaxResults = 20,
                SearchNextAvailableDaysIfEmpty = false
            },
            patientId: patient1.Id);

        Assert.NotEmpty(response.Recommendations);
        Assert.DoesNotContain(response.Recommendations, r => r.StartTime == new TimeOnly(10, 0));
    }
}

