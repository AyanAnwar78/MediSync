using MediSync.Api.DTOs.Recommendations;

namespace MediSync.Api.Interfaces;

public interface ISmartSchedulingService
{
    Task<RecommendationResponse> GetRecommendationsAsync(
        RecommendationRequest request,
        int? patientId,
        CancellationToken cancellationToken = default);
}

