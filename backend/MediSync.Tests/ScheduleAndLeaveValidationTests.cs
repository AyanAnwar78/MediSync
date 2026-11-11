using Microsoft.AspNetCore.Identity;
using MediSync.Api.Authentication;
using MediSync.Api.DTOs.Auth;
using MediSync.Api.DTOs.Leaves;
using MediSync.Api.DTOs.Schedules;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;
using MediSync.Api.Services;
using Microsoft.Extensions.Options;

namespace MediSync.Tests;

public class ScheduleAndLeaveValidationTests
{
    [Fact]
    public async Task UpsertSchedules_RejectsInvalidBreakOutsideShift()
    {
        using var db = TestDbFactory.CreateContext();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var (_, docs, _, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, today.AddDays(1));
        var scheduleService = new ScheduleService(db);

        var request = new UpsertDoctorSchedulesRequest
        {
            Schedules =
            [
                new ScheduleDayRequest
                {
                    DayOfWeek = DayOfWeek.Monday,
                    StartTime = new TimeOnly(9, 0),
                    EndTime = new TimeOnly(17, 0),
                    BreakStartTime = new TimeOnly(16, 30),
                    BreakEndTime = new TimeOnly(17, 30),
                    IsActive = true
                }
            ]
        };

        await Assert.ThrowsAsync<ArgumentException>(() =>
            scheduleService.UpsertDoctorSchedulesAsync(docs.HeavyCardio.Id, request));
    }

    [Fact]
    public async Task UpsertSchedules_RejectsDuplicateDays()
    {
        using var db = TestDbFactory.CreateContext();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var (_, docs, _, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, today.AddDays(1));
        var scheduleService = new ScheduleService(db);

        var request = new UpsertDoctorSchedulesRequest
        {
            Schedules =
            [
                new ScheduleDayRequest { DayOfWeek = DayOfWeek.Monday, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(12, 0) },
                new ScheduleDayRequest { DayOfWeek = DayOfWeek.Monday, StartTime = new TimeOnly(13, 0), EndTime = new TimeOnly(17, 0) }
            ]
        };

        await Assert.ThrowsAsync<ArgumentException>(() =>
            scheduleService.UpsertDoctorSchedulesAsync(docs.HeavyCardio.Id, request));
    }

    [Fact]
    public async Task CreateLeave_DoctorCannotSubmitPastDatesOrOverlaps()
    {
        using var db = TestDbFactory.CreateContext();
        var future = DateOnly.FromDateTime(DateTime.Today).AddDays(2);
        var (_, docs, _, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, future);
        var leaveService = new LeaveService(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            leaveService.CreateLeaveAsync(
                docs.LightCardio.Id,
                new CreateDoctorLeaveRequest
                {
                    StartDate = DateOnly.FromDateTime(DateTime.Today).AddDays(-2),
                    EndDate = DateOnly.FromDateTime(DateTime.Today).AddDays(-1),
                    Reason = "Past check"
                },
                autoApprove: false));

        var created = await leaveService.CreateLeaveAsync(
            docs.LightCardio.Id,
            new CreateDoctorLeaveRequest
            {
                StartDate = future,
                EndDate = future.AddDays(1),
                Reason = "Conference"
            },
            autoApprove: false);

        Assert.Equal("Pending", created.Status);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            leaveService.CreateLeaveAsync(
                docs.LightCardio.Id,
                new CreateDoctorLeaveRequest
                {
                    StartDate = future.AddDays(1),
                    EndDate = future.AddDays(2),
                    Reason = "Overlap"
                },
                autoApprove: false));
    }

    [Fact]
    public async Task ApproveLeave_BlockedWhenDoctorHasActiveAppointmentsInRange()
    {
        using var db = TestDbFactory.CreateContext();
        var future = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (_, docs, patient1, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, future);

        db.Appointments.Add(new Appointment
        {
            DoctorId = docs.LightCardio.Id,
            PatientId = patient1.Id,
            AppointmentDate = future,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(10, 30),
            Status = AppointmentStatus.Confirmed,
            ReasonForVisit = "Routine check"
        });
        await db.SaveChangesAsync();

        var leaveService = new LeaveService(db);
        var leave = await leaveService.CreateLeaveAsync(
            docs.LightCardio.Id,
            new CreateDoctorLeaveRequest { StartDate = future, EndDate = future, Reason = "Leave" },
            autoApprove: false);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            leaveService.UpdateLeaveStatusAsync(leave.Id, LeaveStatus.Approved));
    }

    [Fact]
    public async Task RegisterPatient_RejectsFutureDateOfBirth()
    {
        using var db = TestDbFactory.CreateContext();
        var jwtGen = new JwtTokenGenerator(Options.Create(new JwtSettings
        {
            SecretKey = "UnitTest_Secret_Key_Must_Be_At_Least_32_Bytes!",
            Issuer = "MediSync.Api",
            Audience = "MediSync.Client",
            ExpiryMinutes = 60
        }));
        var authService = new AuthService(db, new PasswordHasher<User>(), jwtGen);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            authService.RegisterPatientAsync(new RegisterPatientRequest
            {
                FullName = "Future Person",
                Email = "future@test.local",
                Password = "Password@123",
                DateOfBirth = DateOnly.FromDateTime(DateTime.Today).AddDays(5)
            }));
    }
}

