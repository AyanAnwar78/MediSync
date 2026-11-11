using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MediSync.Api.Models;

namespace MediSync.Api.Data.Configurations;

public class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> builder)
    {
        builder.ToTable("Doctors", t =>
        {
            t.HasCheckConstraint("CK_Doctors_ConsultationFee", "[ConsultationFee] >= 0");
            t.HasCheckConstraint("CK_Doctors_SlotDurationMinutes", "[SlotDurationMinutes] BETWEEN 10 AND 120");
            t.HasCheckConstraint("CK_Doctors_MaxDailyAppointments", "[MaxDailyAppointments] > 0");
            t.HasCheckConstraint("CK_Doctors_YearsOfExperience", "[YearsOfExperience] >= 0");
        });

        builder.HasKey(d => d.Id);

        builder.Property(d => d.Specialization)
            .IsRequired()
            .HasMaxLength(150);

        builder.HasIndex(d => d.Specialization)
            .HasDatabaseName("IX_Doctors_Specialization");

        builder.Property(d => d.LicenseNumber)
            .IsRequired()
            .HasMaxLength(60);

        builder.HasIndex(d => d.LicenseNumber)
            .IsUnique()
            .HasDatabaseName("IX_Doctors_LicenseNumber");

        builder.Property(d => d.ConsultationFee)
            .HasPrecision(10, 2);

        builder.Property(d => d.SlotDurationMinutes)
            .HasDefaultValue(30);

        builder.Property(d => d.MaxDailyAppointments)
            .HasDefaultValue(16);

        builder.Property(d => d.Bio)
            .HasMaxLength(1000);

        builder.Property(d => d.IsAvailableForBooking)
            .HasDefaultValue(true);

        builder.HasIndex(d => d.UserId)
            .IsUnique()
            .HasDatabaseName("IX_Doctors_UserId");

        builder.HasOne(d => d.User)
            .WithOne(u => u.DoctorProfile)
            .HasForeignKey<Doctor>(d => d.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Department)
            .WithMany(dept => dept.Doctors)
            .HasForeignKey(d => d.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

