using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MediSync.Api.Models;

namespace MediSync.Api.Data.Configurations;

public class DoctorLeaveConfiguration : IEntityTypeConfiguration<DoctorLeave>
{
    public void Configure(EntityTypeBuilder<DoctorLeave> builder)
    {
        builder.ToTable("DoctorLeaves", t =>
        {
            t.HasCheckConstraint("CK_DoctorLeaves_DateRange", "[EndDate] >= [StartDate]");
        });

        builder.HasKey(l => l.Id);

        builder.Property(l => l.Reason)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(l => l.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(l => l.CreatedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(l => new { l.DoctorId, l.StartDate, l.EndDate, l.Status })
            .HasDatabaseName("IX_DoctorLeaves_Doctor_Dates_Status");

        builder.HasOne(l => l.Doctor)
            .WithMany(d => d.Leaves)
            .HasForeignKey(l => l.DoctorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

