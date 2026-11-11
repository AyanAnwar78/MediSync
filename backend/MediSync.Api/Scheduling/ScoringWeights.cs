namespace MediSync.Api.Scheduling;

/// <summary>
/// Transparent deterministic weights (summing to 1.00) used by the rule-based
/// smart appointment recommendation engine.
/// </summary>
public static class ScoringWeights
{
    public const decimal Specialization = 0.25m;
    public const decimal WorkloadBalance = 0.30m;
    public const decimal PreferredTime = 0.25m;
    public const decimal Earliness = 0.10m;
    public const decimal Experience = 0.10m;
}

