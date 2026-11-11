using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MediSync.Api.Models;

namespace MediSync.Api.Data.Configurations;

public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Patients");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Gender)
            .HasMaxLength(20);

        builder.Property(p => p.BloodGroup)
            .HasMaxLength(10);

        builder.Property(p => p.Address)
            .HasMaxLength(300);

        builder.Property(p => p.EmergencyContact)
            .HasMaxLength(100);

        builder.HasIndex(p => p.UserId)
            .IsUnique()
            .HasDatabaseName("IX_Patients_UserId");

        builder.HasOne(p => p.User)
            .WithOne(u => u.PatientProfile)
            .HasForeignKey<Patient>(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

