using MediSync.Api.DTOs.Common;
using MediSync.Api.DTOs.Doctors;

namespace MediSync.Api.Interfaces;

public interface IDoctorService
{
    Task<IReadOnlyList<DoctorDto>> GetAllAsync(
        string? search = null,
        int? departmentId = null,
        string? specialization = null,
        bool availableOnly = false,
        CancellationToken cancellationToken = default);

    Task<DoctorDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DoctorDetailDto> CreateAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<DoctorDto> UpdateAsync(int id, UpdateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<DoctorDto> UpdateAvailabilityAsync(int id, bool isAvailableForBooking, CancellationToken cancellationToken = default);
    Task<ApiMessageResponse> DeleteAsync(int id, CancellationToken cancellationToken = default);
}

