using MediSync.Api.DTOs.Patients;

namespace MediSync.Api.Interfaces;

public interface IPatientService
{
    Task<IReadOnlyList<PatientDto>> GetAllAsync(string? search = null, CancellationToken cancellationToken = default);
    Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PatientDto> UpdateAsync(int id, UpdatePatientRequest request, bool allowActiveToggle, CancellationToken cancellationToken = default);
}

