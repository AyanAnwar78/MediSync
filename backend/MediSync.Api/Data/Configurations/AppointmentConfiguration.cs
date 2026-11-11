using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MediSync.Api.Models;

namespace MediSync.Api.Data.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("Appointments", t =>
        {
            t.HasCheckConstraint("CK_Appointments_TimeRange", "[EndTime] > [StartTime]");
        });

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(a => a.ReasonForVisit)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(a => a.Notes)
            .HasMaxLength(1000);

        builder.Property(a => a.CancellationReason)
            .HasMaxLength(500);

        builder.Property(a => a.RecommendationScore)
            .HasPrecision(5, 2);

        builder.Property(a => a.CreatedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(a => a.RowVersion)
            .IsRowVersion();

        // Prevent concurrent duplicate active bookings for the same doctor slot while releasing cancelled slots.
        builder.HasIndex(a => new { a.DoctorId, a.AppointmentDate, a.StartTime })
            .IsUnique()
            .HasFilter("[Status] <> 'Cancelled'")
            .HasDatabaseName("UX_Appointments_Doctor_Slot");

        // Prevent concurrent duplicate active bookings for the same patient slot while releasing cancelled slots.
        builder.HasIndex(a => new { a.PatientId, a.AppointmentDate, a.StartTime })
            .IsUnique()
            .HasFilter("[Status] <> 'Cancelled'")
            .HasDatabaseName("UX_Appointments_Patient_Slot");

        builder.HasIndex(a => new { a.DoctorId, a.AppointmentDate, a.Status })
            .HasDatabaseName("IX_Appointments_Doctor_Date_Status");

        builder.HasIndex(a => new { a.PatientId, a.AppointmentDate, a.Status })
            .HasDatabaseName("IX_Appointments_Patient_Date_Status");

        builder.HasOne(a => a.Doctor)
            .WithMany(d => d.Appointments)
            .HasForeignKey(a => a.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Patient)
            .WithMany(p => p.Appointments)
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

