using MediSync.Api.DTOs.Appointments;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;
using MediSync.Api.Services;

namespace MediSync.Tests;

public class AppointmentRulesAndAnalyticsTests
{
    [Fact]
    public async Task BookAsync_BlocksDoctorDoubleBookingAndPatientOverlap()
    {
        using var db = TestDbFactory.CreateContext();
        var targetDate = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (_, docs, patient1, patient2) = await TestDbFactory.SeedClinicalScenarioAsync(db, targetDate);
        var apptService = new AppointmentService(db);

        // 1. Patient 1 books LightCardio at 10:00
        var booked = await apptService.BookAsync(new BookAppointmentRequest
        {
            DoctorId = docs.LightCardio.Id,
            AppointmentDate = targetDate,
            StartTime = new TimeOnly(10, 0),
            ReasonForVisit = "Chest consultation"
        }, patient1.Id);

        Assert.Equal("Pending", booked.Status);

        // 2. Patient 2 tries same doctor, same date & slot => blocked
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            apptService.BookAsync(new BookAppointmentRequest
            {
                DoctorId = docs.LightCardio.Id,
                AppointmentDate = targetDate,
                StartTime = new TimeOnly(10, 0),
                ReasonForVisit = "Overlap doctor"
            }, patient2.Id));

        // 3. Patient 1 tries different doctor at exact overlapping 10:00 slot => blocked
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            apptService.BookAsync(new BookAppointmentRequest
            {
                DoctorId = docs.Neuro.Id,
                AppointmentDate = targetDate,
                StartTime = new TimeOnly(10, 0),
                ReasonForVisit = "Overlap patient"
            }, patient1.Id));
    }

    [Fact]
    public async Task BookAsync_RejectsBreakWindowAndApprovedLeave()
    {
        using var db = TestDbFactory.CreateContext();
        var targetDate = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (_, docs, patient1, _) = await TestDbFactory.SeedClinicalScenarioAsync(db, targetDate);
        var apptService = new AppointmentService(db);

        // Break time is 13:00–14:00
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            apptService.BookAsync(new BookAppointmentRequest
            {
                DoctorId = docs.LightCardio.Id,
                AppointmentDate = targetDate,
                StartTime = new TimeOnly(13, 0),
                ReasonForVisit = "During lunch break"
            }, patient1.Id));

        db.DoctorLeaves.Add(new DoctorLeave
        {
            DoctorId = docs.Neuro.Id,
            StartDate = targetDate,
            EndDate = targetDate,
            Reason = "Approved leave",
            Status = LeaveStatus.Approved
        });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            apptService.BookAsync(new BookAppointmentRequest
            {
                DoctorId = docs.Neuro.Id,
                AppointmentDate = targetDate,
                StartTime = new TimeOnly(11, 0),
                ReasonForVisit = "While on leave"
            }, patient1.Id));
    }

    [Fact]
    public async Task CancelAsync_ReleasesSlotForImmediateRebooking_AndEnforcesTransitions()
    {
        using var db = TestDbFactory.CreateContext();
        var targetDate = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (_, docs, patient1, patient2) = await TestDbFactory.SeedClinicalScenarioAsync(db, targetDate);
        var apptService = new AppointmentService(db);

        var first = await apptService.BookAsync(new BookAppointmentRequest
        {
            DoctorId = docs.LightCardio.Id,
            AppointmentDate = targetDate,
            StartTime = new TimeOnly(9, 30),
            ReasonForVisit = "Initial booking"
        }, patient1.Id);

        // Cancel first appointment
        var cancelled = await apptService.CancelAsync(
            first.Id,
            new CancelAppointmentRequest { CancellationReason = "Rescheduling" },
            UserRole.Patient,
            null,
            patient1.Id);

        Assert.Equal("Cancelled", cancelled.Status);

        // Another patient can immediately book the exact released 09:30 slot
        var rebooked = await apptService.BookAsync(new BookAppointmentRequest
        {
            DoctorId = docs.LightCardio.Id,
            AppointmentDate = targetDate,
            StartTime = new TimeOnly(9, 30),
            ReasonForVisit = "Booked released slot"
        }, patient2.Id);

        // Confirm & Complete transitions
        var confirmed = await apptService.UpdateStatusAsync(
            rebooked.Id,
            new UpdateAppointmentStatusRequest { Status = AppointmentStatus.Confirmed },
            UserRole.Doctor,
            docs.LightCardio.Id);
        Assert.Equal("Confirmed", confirmed.Status);

        var completed = await apptService.UpdateStatusAsync(
            rebooked.Id,
            new UpdateAppointmentStatusRequest { Status = AppointmentStatus.Completed, Notes = "Vitals normal" },
            UserRole.Doctor,
            docs.LightCardio.Id);
        Assert.Equal("Completed", completed.Status);

        // Cancelling a completed appointment must fail
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            apptService.CancelAsync(
                completed.Id,
                new CancelAppointmentRequest { CancellationReason = "Too late" },
                UserRole.Patient,
                null,
                patient2.Id));
    }

    [Fact]
    public async Task AnalyticsService_ReturnsAccurateCountsAndDepartmentDemand()
    {
        using var db = TestDbFactory.CreateContext();
        var tomorrow = DateOnly.FromDateTime(DateTime.Today).AddDays(1);
        var (cardio, docs, patient1, patient2) = await TestDbFactory.SeedClinicalScenarioAsync(db, tomorrow);

        db.Appointments.AddRange(
            new Appointment
            {
                DoctorId = docs.LightCardio.Id,
                PatientId = patient1.Id,
                AppointmentDate = tomorrow,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(9, 30),
                Status = AppointmentStatus.Completed,
                AllocatedBySmartEngine = true,
                RecommendationScore = 92.5m,
                ReasonForVisit = "Smart visit"
            },
            new Appointment
            {
                DoctorId = docs.HeavyCardio.Id,
                PatientId = patient2.Id,
                AppointmentDate = tomorrow,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(10, 30),
                Status = AppointmentStatus.Cancelled,
                ReasonForVisit = "Cancelled visit"
            },
            new Appointment
            {
                DoctorId = docs.Neuro.Id,
                PatientId = patient1.Id,
                AppointmentDate = tomorrow,
                StartTime = new TimeOnly(11, 0),
                EndTime = new TimeOnly(11, 30),
                Status = AppointmentStatus.Pending,
                ReasonForVisit = "Pending visit"
            });
        await db.SaveChangesAsync();

        var analytics = new AnalyticsService(db);
        var summary = await analytics.GetAdminSummaryAsync();

        Assert.Equal(3, summary.TotalDoctors);
        Assert.Equal(3, summary.AvailableDoctors);
        Assert.Equal(2, summary.TotalPatients);
        Assert.Equal(2, summary.TotalDepartments);
        Assert.Equal(3, summary.TotalAppointments);
        Assert.Equal(1, summary.CompletedAppointments);
        Assert.Equal(1, summary.CancelledAppointments);
        Assert.Equal(1, summary.PendingAppointments);
        Assert.Equal(1, summary.SmartAllocatedAppointments);
        Assert.Equal(cardio.Name, summary.MostDemandedDepartments[0].DepartmentName);
        Assert.Equal(2, summary.MostDemandedDepartments[0].TotalAppointments);
    }
}

