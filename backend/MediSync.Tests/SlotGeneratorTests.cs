using MediSync.Api.Models;
using MediSync.Api.Scheduling;

namespace MediSync.Tests;

public class SlotGeneratorTests
{
    [Fact]
    public void ScoringWeights_ShouldSumExactlyToOne()
    {
        var sum =
            ScoringWeights.Specialization +
            ScoringWeights.WorkloadBalance +
            ScoringWeights.PreferredTime +
            ScoringWeights.Earliness +
            ScoringWeights.Experience;

        Assert.Equal(1.00m, sum);
    }

    [Fact]
    public void GenerateDailySlots_SkipsLunchBreakAndMatchesShiftBoundaries()
    {
        var schedule = new DoctorSchedule
        {
            DayOfWeek = DayOfWeek.Thursday,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(15, 0),
            BreakStartTime = new TimeOnly(13, 0),
            BreakEndTime = new TimeOnly(14, 0),
            IsActive = true
        };

        var target = new DateOnly(2026, 11, 12);
        var today = new DateOnly(2026, 11, 11);

        var slots = SlotGenerator.GenerateDailySlots(
            schedule,
            slotDurationMinutes: 30,
            targetDate: target,
            today: today,
            currentTime: new TimeOnly(8, 0));

        // 09:00..13:00 => 8 slots; 13:00..14:00 skipped; 14:00..15:00 => 2 slots
        Assert.Equal(10, slots.Count);
        Assert.DoesNotContain(slots, s => s.StartTime >= new TimeOnly(13, 0) && s.StartTime < new TimeOnly(14, 0));
        Assert.Equal(new TimeOnly(9, 0), slots.First().StartTime);
        Assert.Equal(new TimeOnly(14, 30), slots.Last().StartTime);
        Assert.Equal(new TimeOnly(15, 0), slots.Last().EndTime);
    }

    [Fact]
    public void GenerateDailySlots_Today_ExcludesPastAndOngoingSlots()
    {
        var schedule = new DoctorSchedule
        {
            DayOfWeek = DayOfWeek.Wednesday,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(12, 0),
            IsActive = true
        };

        var today = new DateOnly(2026, 11, 11);
        var slots = SlotGenerator.GenerateDailySlots(
            schedule,
            slotDurationMinutes: 30,
            targetDate: today,
            today: today,
            currentTime: new TimeOnly(10, 15));

        Assert.Equal(3, slots.Count); // 10:30, 11:00, 11:30
        Assert.Equal(new TimeOnly(10, 30), slots.First().StartTime);
    }

    [Fact]
    public void GenerateDailySlots_InactiveSchedule_ReturnsEmpty()
    {
        var schedule = new DoctorSchedule
        {
            DayOfWeek = DayOfWeek.Sunday,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(17, 0),
            IsActive = false
        };

        var slots = SlotGenerator.GenerateDailySlots(
            schedule,
            30,
            new DateOnly(2026, 11, 15),
            new DateOnly(2026, 11, 11),
            new TimeOnly(8, 0));

        Assert.Empty(slots);
    }

    [Theory]
    [InlineData(9, 0, 9, 30, 9, 15, 9, 45, true)]
    [InlineData(9, 0, 9, 30, 9, 30, 10, 0, false)]
    [InlineData(10, 0, 10, 30, 9, 0, 9, 30, false)]
    public void Overlaps_DetectsOverlapAndAllowsAdjacentSlots(
        int h1, int m1, int h2, int m2,
        int h3, int m3, int h4, int m4,
        bool expected)
    {
        var result = SlotGenerator.Overlaps(
            new TimeOnly(h1, m1),
            new TimeOnly(h2, m2),
            new TimeOnly(h3, m3),
            new TimeOnly(h4, m4));

        Assert.Equal(expected, result);
    }
}

