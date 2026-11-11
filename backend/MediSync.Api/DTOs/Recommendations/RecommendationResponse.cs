namespace MediSync.Api.DTOs.Recommendations;

public class RecommendationResponse
{
    public bool IsRuleBasedEngine { get; set; } = true;
    public string AlgorithmDescription { get; set; } =
        "Deterministic rule-based multi-criteria weighted scoring (Specialization 25%, Workload Balance 30%, Preferred Time 25%, Wait-Time Earliness 10%, Experience 10%).";
    public DateOnly RequestedDate { get; set; }
    public DateOnly EvaluatedDate { get; set; }
    public bool UsedFallbackDate { get; set; }
    public int TotalCandidatesEvaluated { get; set; }
    public List<SlotRecommendationDto> Recommendations { get; set; } = new();
}

