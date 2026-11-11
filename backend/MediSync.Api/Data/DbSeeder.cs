using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MediSync.Api.Models;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Data;

/// <summary>
/// Idempotent database seeder creating initial departments, users, doctors, patients,
/// weekly schedules, leave records, and sample appointments for academic demonstration.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(
        MediSyncDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        CancellationToken cancellationToken = default)
    {
        if (await dbContext.Departments.AnyAsync(cancellationToken) ||
            await dbContext.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(DateTime.Today);

        // 1. Departments
        var cardiology = new Department
        {
            Name = "Cardiology",
            Description = "Heart, vascular care, ECG diagnostics, and preventive cardiology.",
            IsActive = true,
            CreatedAt = now
        };
        var neurology = new Department
        {
            Name = "Neurology",
            Description = "Brain, spinal cord, migraine, and neuromuscular disorders.",
            IsActive = true,
            CreatedAt = now
        };
        var orthopedics = new Department
        {
            Name = "Orthopedics",
            Description = "Joint replacement, sports injury rehabilitation, and bone care.",
            IsActive = true,
            CreatedAt = now
        };
        var pediatrics = new Department
        {
            Name = "Pediatrics",
            Description = "Comprehensive medical care for infants, children, and adolescents.",
            IsActive = true,
            CreatedAt = now
        };
        var generalMedicine = new Department
        {
            Name = "General Medicine",
            Description = "Primary adult healthcare, chronic disease management, and triage.",
            IsActive = true,
            CreatedAt = now
        };

        dbContext.Departments.AddRange(cardiology, neurology, orthopedics, pediatrics, generalMedicine);
        await dbContext.SaveChangesAsync(cancellationToken);

        // 2. Users (Admin, Doctors, Patients)
        var adminUser = CreateUser("Dr. Eleanor Vance", "admin@medisync.local", "+1-555-0100", UserRole.Admin, "Admin@123", passwordHasher, now);

        var drSharmaUser = CreateUser("Dr. Rajesh Sharma", "sharma@medisync.local", "+1-555-0201", UserRole.Doctor, "Doctor@123", passwordHasher, now);
        var drPatelUser = CreateUser("Dr. Meera Patel", "patel@medisync.local", "+1-555-0202", UserRole.Doctor, "Doctor@123", passwordHasher, now);
        var drChenUser = CreateUser("Dr. David Chen", "chen@medisync.local", "+1-555-0203", UserRole.Doctor, "Doctor@123", passwordHasher, now);
        var drOkaforUser = CreateUser("Dr. Amara Okafor", "okafor@medisync.local", "+1-555-0204", UserRole.Doctor, "Doctor@123", passwordHasher, now);
        var drGarciaUser = CreateUser("Dr. Sofia Garcia", "garcia@medisync.local", "+1-555-0205", UserRole.Doctor, "Doctor@123", passwordHasher, now);
        var drMillerUser = CreateUser("Dr. Lucas Miller", "miller@medisync.local", "+1-555-0206", UserRole.Doctor, "Doctor@123", passwordHasher, now);

        var patient1User = CreateUser("Aarav Mehta", "patient1@medisync.local", "+1-555-0301", UserRole.Patient, "Patient@123", passwordHasher, now);
        var patient2User = CreateUser("Hannah Brooks", "patient2@medisync.local", "+1-555-0302", UserRole.Patient, "Patient@123", passwordHasher, now);
        var patient3User = CreateUser("Liam Carter", "patient3@medisync.local", "+1-555-0303", UserRole.Patient, "Patient@123", passwordHasher, now);

        dbContext.Users.AddRange(
            adminUser,
            drSharmaUser, drPatelUser, drChenUser, drOkaforUser, drGarciaUser, drMillerUser,
            patient1User, patient2User, patient3User);
        await dbContext.SaveChangesAsync(cancellationToken);

        // 3. Doctor Profiles
        var drSharma = new Doctor
        {
            UserId = drSharmaUser.Id,
            DepartmentId = cardiology.Id,
            Specialization = "Interventional Cardiology",
            LicenseNumber = "MED-CARD-1042",
            ConsultationFee = 150.00m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 12,
            YearsOfExperience = 14,
            Bio = "Senior interventional cardiologist specializing in coronary diagnostics and hypertension.",
            IsAvailableForBooking = true
        };
        var drPatel = new Doctor
        {
            UserId = drPatelUser.Id,
            DepartmentId = cardiology.Id,
            Specialization = "Clinical Cardiology",
            LicenseNumber = "MED-CARD-1089",
            ConsultationFee = 120.00m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 12,
            YearsOfExperience = 9,
            Bio = "Preventive and non-invasive cardiologist focused on arrhythmia and lipid management.",
            IsAvailableForBooking = true
        };
        var drChen = new Doctor
        {
            UserId = drChenUser.Id,
            DepartmentId = neurology.Id,
            Specialization = "Neurology & Stroke Care",
            LicenseNumber = "MED-NEUR-2015",
            ConsultationFee = 160.00m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 10,
            YearsOfExperience = 12,
            Bio = "Neurologist managing cerebrovascular conditions, epilepsy, and chronic migraines.",
            IsAvailableForBooking = true
        };
        var drOkafor = new Doctor
        {
            UserId = drOkaforUser.Id,
            DepartmentId = orthopedics.Id,
            Specialization = "Sports Orthopedics",
            LicenseNumber = "MED-ORTH-3071",
            ConsultationFee = 140.00m,
            SlotDurationMinutes = 30,
            MaxDailyAppointments = 12,
            YearsOfExperience = 11,
            Bio = "Orthopedic specialist focusing on ligament reconstruction and joint preservation.",
            IsAvailableForBooking = true
        };
        var drGarcia = new Doctor
        {
            UserId = drGarciaUser.Id,
            DepartmentId = pediatrics.Id,
            Specialization = "Pediatric Care",
            LicenseNumber = "MED-PEDS-4022",
            ConsultationFee = 100.00m,
            SlotDurationMinutes = 20,
            MaxDailyAppointments = 18,
            YearsOfExperience = 8,
            Bio = "Pediatrician dedicated to developmental assessments, immunizations, and acute pediatric care.",
            IsAvailableForBooking = true
        };
        var drMiller = new Doctor
        {
            UserId = drMillerUser.Id,
            DepartmentId = generalMedicine.Id,
            Specialization = "Internal Medicine",
            LicenseNumber = "MED-GENM-5008",
            ConsultationFee = 90.00m,
            SlotDurationMinutes = 20,
            MaxDailyAppointments = 20,
            YearsOfExperience = 15,
            Bio = "Internal medicine physician handling acute consultations and preventive screenings.",
            IsAvailableForBooking = true
        };

        dbContext.Doctors.AddRange(drSharma, drPatel, drChen, drOkafor, drGarcia, drMiller);

        // 4. Patient Profiles
        var patient1 = new Patient
        {
            UserId = patient1User.Id,
            DateOfBirth = new DateOnly(1994, 5, 14),
            Gender = "Male",
            BloodGroup = "O+",
            Address = "214 Oakridge Avenue, Springfield",
            EmergencyContact = "Priya Mehta (+1-555-0911)"
        };
        var patient2 = new Patient
        {
            UserId = patient2User.Id,
            DateOfBirth = new DateOnly(1988, 11, 22),
            Gender = "Female",
            BloodGroup = "A+",
            Address = "78 Pinecrest Lane, Springfield",
            EmergencyContact = "Mark Brooks (+1-555-0912)"
        };
        var patient3 = new Patient
        {
            UserId = patient3User.Id,
            DateOfBirth = new DateOnly(2001, 3, 8),
            Gender = "Male",
            BloodGroup = "B-",
            Address = "410 Maple Court, Springfield",
            EmergencyContact = "Claire Carter (+1-555-0913)"
        };

        dbContext.Patients.AddRange(patient1, patient2, patient3);
        await dbContext.SaveChangesAsync(cancellationToken);

        // 5. Weekly Doctor Schedules (Mon-Fri 09:00-17:00 with 13:00-14:00 break)
        var allDoctors = new[] { drSharma, drPatel, drChen, drOkafor, drGarcia, drMiller };
        var weekdays = new[]
        {
            DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday
        };

        var schedules = new List<DoctorSchedule>();
        foreach (var doctor in allDoctors)
        {
            foreach (var day in weekdays)
            {
                schedules.Add(new DoctorSchedule
                {
                    DoctorId = doctor.Id,
                    DayOfWeek = day,
                    StartTime = new TimeOnly(9, 0),
                    EndTime = new TimeOnly(17, 0),
                    BreakStartTime = new TimeOnly(13, 0),
                    BreakEndTime = new TimeOnly(14, 0),
                    IsActive = true
                });
            }
        }

        // Saturday morning shift for selected doctors
        foreach (var doctor in new[] { drPatel, drGarcia, drMiller })
        {
            schedules.Add(new DoctorSchedule
            {
                DoctorId = doctor.Id,
                DayOfWeek = DayOfWeek.Saturday,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(13, 0),
                IsActive = true
            });
        }

        dbContext.DoctorSchedules.AddRange(schedules);

        // 6. Doctor Leaves
        var leaveStart = NextWeekday(today, 4);
        var leaveEnd = leaveStart.AddDays(1);
        var pendingLeaveStart = NextWeekday(today, 7);

        dbContext.DoctorLeaves.AddRange(
            new DoctorLeave
            {
                DoctorId = drChen.Id,
                StartDate = leaveStart,
                EndDate = leaveEnd,
                Reason = "Annual Neurology Research Symposium",
                Status = LeaveStatus.Approved,
                CreatedAt = now
            },
            new DoctorLeave
            {
                DoctorId = drOkafor.Id,
                StartDate = pendingLeaveStart,
                EndDate = pendingLeaveStart.AddDays(1),
                Reason = "Orthopedic Surgical Workshop",
                Status = LeaveStatus.Pending,
                CreatedAt = now
            });

        // 7. Sample Appointments (Past analytics + Future workload distribution)
        var pastWeekday1 = PreviousWeekday(today, 3);
        var pastWeekday2 = PreviousWeekday(today, 1);
        var nextWorkday1 = NextWeekday(today, 1);
        var nextWorkday2 = NextWeekday(today, 2);

        dbContext.Appointments.AddRange(
            new Appointment
            {
                DoctorId = drSharma.Id,
                PatientId = patient1.Id,
                AppointmentDate = pastWeekday1,
                StartTime = new TimeOnly(9, 30),
                EndTime = new TimeOnly(10, 0),
                Status = AppointmentStatus.Completed,
                ReasonForVisit = "Routine cardiac follow-up and ECG review",
                Notes = "Blood pressure stable; continue current regimen.",
                AllocatedBySmartEngine = false,
                CreatedAt = now.AddDays(-5)
            },
            new Appointment
            {
                DoctorId = drChen.Id,
                PatientId = patient2.Id,
                AppointmentDate = pastWeekday1,
                StartTime = new TimeOnly(11, 0),
                EndTime = new TimeOnly(11, 30),
                Status = AppointmentStatus.Completed,
                ReasonForVisit = "Recurring migraine evaluation",
                Notes = "Prescribed preventive therapy and sleep diary.",
                AllocatedBySmartEngine = true,
                RecommendationScore = 91.50m,
                CreatedAt = now.AddDays(-4)
            },
            new Appointment
            {
                DoctorId = drOkafor.Id,
                PatientId = patient3.Id,
                AppointmentDate = pastWeekday2,
                StartTime = new TimeOnly(15, 0),
                EndTime = new TimeOnly(15, 30),
                Status = AppointmentStatus.Cancelled,
                ReasonForVisit = "Knee strain checkup",
                CancellationReason = "Patient rescheduled due to travel.",
                AllocatedBySmartEngine = false,
                CreatedAt = now.AddDays(-3),
                UpdatedAt = now.AddDays(-1)
            },
            // Give Dr. Sharma 3 bookings on nextWorkday1 while Dr. Patel has 0 so workload balancing is demonstrable.
            new Appointment
            {
                DoctorId = drSharma.Id,
                PatientId = patient1.Id,
                AppointmentDate = nextWorkday1,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(9, 30),
                Status = AppointmentStatus.Confirmed,
                ReasonForVisit = "Chest tightness consultation",
                AllocatedBySmartEngine = false,
                CreatedAt = now
            },
            new Appointment
            {
                DoctorId = drSharma.Id,
                PatientId = patient2.Id,
                AppointmentDate = nextWorkday1,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(10, 30),
                Status = AppointmentStatus.Confirmed,
                ReasonForVisit = "Cholesterol and blood pressure review",
                AllocatedBySmartEngine = true,
                RecommendationScore = 88.20m,
                CreatedAt = now
            },
            new Appointment
            {
                DoctorId = drSharma.Id,
                PatientId = patient3.Id,
                AppointmentDate = nextWorkday1,
                StartTime = new TimeOnly(11, 0),
                EndTime = new TimeOnly(11, 30),
                Status = AppointmentStatus.Pending,
                ReasonForVisit = "Pre-employment cardiac clearance",
                AllocatedBySmartEngine = false,
                CreatedAt = now
            },
            new Appointment
            {
                DoctorId = drMiller.Id,
                PatientId = patient1.Id,
                AppointmentDate = nextWorkday2,
                StartTime = new TimeOnly(14, 20),
                EndTime = new TimeOnly(14, 40),
                Status = AppointmentStatus.Confirmed,
                ReasonForVisit = "Annual wellness physical",
                AllocatedBySmartEngine = true,
                RecommendationScore = 94.00m,
                CreatedAt = now
            });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static User CreateUser(
        string fullName,
        string email,
        string phoneNumber,
        UserRole role,
        string plainPassword,
        IPasswordHasher<User> passwordHasher,
        DateTime createdAt)
    {
        var user = new User
        {
            FullName = fullName,
            Email = email,
            PhoneNumber = phoneNumber,
            Role = role,
            IsActive = true,
            CreatedAt = createdAt
        };
        user.PasswordHash = passwordHasher.HashPassword(user, plainPassword);
        return user;
    }

    private static DateOnly NextWeekday(DateOnly start, int weekdaysAhead)
    {
        var date = start;
        var count = 0;
        while (count < weekdaysAhead)
        {
            date = date.AddDays(1);
            if (date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
            {
                count++;
            }
        }
        return date;
    }

    private static DateOnly PreviousWeekday(DateOnly start, int weekdaysBack)
    {
        var date = start;
        var count = 0;
        while (count < weekdaysBack)
        {
            date = date.AddDays(-1);
            if (date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
            {
                count++;
            }
        }
        return date;
    }
}

