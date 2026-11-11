using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MediSync.Api.Models;

namespace MediSync.Api.Data.Configurations;

public class DoctorScheduleConfiguration : IEntityTypeConfiguration<DoctorSchedule>
{
    public void Configure(EntityTypeBuilder<DoctorSchedule> builder)
    {
        builder.ToTable("DoctorSchedules", t =>
        {
            t.HasCheckConstraint("CK_DoctorSchedules_TimeRange", "[EndTime] > [StartTime]");
            t.HasCheckConstraint(
                "CK_DoctorSchedules_BreakRange",
                "([BreakStartTime] IS NULL AND [BreakEndTime] IS NULL) OR " +
                "([BreakStartTime] IS NOT NULL AND [BreakEndTime] IS NOT NULL AND " +
                "[BreakEndTime] > [BreakStartTime] AND [BreakStartTime] >= [StartTime] AND [BreakEndTime] <= [EndTime])");
        });

        builder.HasKey(s => s.Id);

        builder.Property(s => s.DayOfWeek)
            .HasConversion<int>();

        builder.Property(s => s.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(s => new { s.DoctorId, s.DayOfWeek })
            .IsUnique()
            .HasDatabaseName("IX_DoctorSchedules_DoctorId_DayOfWeek");

        builder.HasOne(s => s.Doctor)
            .WithMany(d => d.Schedules)
            .HasForeignKey(s => s.DoctorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

