using MediSync.Api.DTOs.Analytics;

namespace MediSync.Api.Interfaces;

public interface IAnalyticsService
{
    Task<AdminAnalyticsDto> GetAdminSummaryAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DoctorWorkloadDto>> GetDoctorWorkloadAsync(CancellationToken cancellationToken = default);
}

