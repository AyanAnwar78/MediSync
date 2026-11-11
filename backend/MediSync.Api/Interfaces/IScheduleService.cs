using MediSync.Api.DTOs.Schedules;

namespace MediSync.Api.Interfaces;

public interface IScheduleService
{
    Task<IReadOnlyList<DoctorScheduleDto>> GetDoctorSchedulesAsync(int doctorId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DoctorScheduleDto>> UpsertDoctorSchedulesAsync(int doctorId, UpsertDoctorSchedulesRequest request, CancellationToken cancellationToken = default);
    Task DeleteScheduleAsync(int doctorId, int scheduleId, CancellationToken cancellationToken = default);
}

