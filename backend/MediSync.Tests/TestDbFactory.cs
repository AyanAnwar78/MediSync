using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using MediSync.Api.Data;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;

namespace MediSync.Tests;

internal static class TestDbFactory
{
    public static MediSyncDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MediSyncDbContext>()
            .UseInMemoryDatabase($"MediSyncTest_{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new MediSyncDbContext(options);
    }

    public static async Task<(Department Cardiology, DoctorBusyData Doctors, Patient PatientA, Patient PatientB)> SeedClinicalScenarioAsync(
        MediSyncDbContext db,
        DateOnly targetDate)
    {
        var cardiology = new Department
        {
            Name = "Cardiology",
            Description = "Heart care",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var neurology = new Department
        {
            Name = "Neurology",
            Description = "Brain care",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Departments.AddRange(cardiology, neurology);
        await db.SaveChangesAsync();

        var doc1User = new User
        {
            FullName = "Dr. Heavy Load",
            Email = "heavy@test.local",
            PasswordHash = "hash",
            Role = UserRole.Doctor,
            IsActive = true
        };
        var doc2User = new User
        {
            FullName = "Dr. Light Load",
            Email = "light@test.local",
            PasswordHash = "hash",
            Role = UserRole.Doctor,
            IsActive = true
        };
        var doc3User = new User
        {
            FullName = "Dr. Neuro Specialist",
            Email = "neuro@test.local",
            PasswordHash = "hash",
            Role = UserRole.Doctor,
            IsActive = true
        };
        var pat1User = new User
        {
            FullName = "Patient One",
            Email = "p1@test.local",
            PasswordHash = "hash",
            Role = UserRole.Patient,
            IsActive = true
        };
        var pat2User = new User
        {
            FullName = "Patient Two",
            Email = "p2@test.local",
            PasswordHash = "hash",
            Role = UserRole.Patient,
            IsActive = true
        };

        db.Users.AddRange(doc1User, doc2User, doc3User, pat1User, pat2User);
        await db.SaveChangesAsync();

        var doc1 = new Doctor
        {
            UserId = doc1User.Id,
            DepartmentId = cardiology.Id,
            Specialization = "Interventional Cardiology",
            LicenseNumber = "LIC-T-001",
            ConsultationFee = 150m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 10,
            YearsOfExperience = 10,
            IsAvailableForBooking = true
        };
        var doc2 = new Doctor
        {
            UserId = doc2User.Id,
            DepartmentId = cardiology.Id,
            Specialization = "Interventional Cardiology",
            LicenseNumber = "LIC-T-002",
            ConsultationFee = 130m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 10,
            YearsOfExperience = 10,
            IsAvailableForBooking = true
        };
        var doc3 = new Doctor
        {
            UserId = doc3User.Id,
            DepartmentId = neurology.Id,
            Specialization = "Stroke Neurology",
            LicenseNumber = "LIC-T-003",
            ConsultationFee = 140m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 10,
            YearsOfExperience = 8,
            IsAvailableForBooking = true
        };

        var patient1 = new Patient { UserId = pat1User.Id, Gender = "Female", BloodGroup = "O+" };
        var patient2 = new Patient { UserId = pat2User.Id, Gender = "Male", BloodGroup = "A+" };

        db.Doctors.AddRange(doc1, doc2, doc3);
        db.Patients.AddRange(patient1, patient2);
        await db.SaveChangesAsync();

        var workingDays = new[]
        {
            targetDate.DayOfWeek,
            targetDate.AddDays(1).DayOfWeek,
            targetDate.AddDays(2).DayOfWeek
        }.Distinct();

        foreach (var day in workingDays)
        {
            foreach (var doc in new[] { doc1, doc2, doc3 })
            {
                db.DoctorSchedules.Add(new DoctorSchedule
                {
                    DoctorId = doc.Id,
                    DayOfWeek = day,
                    StartTime = new TimeOnly(9, 0),
                    EndTime = new TimeOnly(17, 0),
                    BreakStartTime = new TimeOnly(13, 0),
                    BreakEndTime = new TimeOnly(14, 0),
                    IsActive = true
                });
            }
        }
        await db.SaveChangesAsync();

        return (cardiology, new DoctorBusyData(doc1, doc2, doc3), patient1, patient2);
    }

    internal sealed record DoctorBusyData(Doctor HeavyCardio, Doctor LightCardio, Doctor Neuro);
}

