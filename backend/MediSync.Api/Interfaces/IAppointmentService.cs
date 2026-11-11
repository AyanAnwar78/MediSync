using MediSync.Api.DTOs.Appointments;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Interfaces;

public interface IAppointmentService
{
    Task<DoctorAvailableSlotsResponse> GetAvailableSlotsAsync(
        int doctorId,
        DateOnly date,
        int? requestingPatientId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AppointmentDto>> GetAppointmentsAsync(
        int? doctorId = null,
        int? patientId = null,
        AppointmentStatus? status = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken cancellationToken = default);

    Task<AppointmentDto> GetByIdAsync(
        int id,
        UserRole callerRole,
        int? callerDoctorId,
        int? callerPatientId,
        CancellationToken cancellationToken = default);

    Task<AppointmentDto> BookAsync(
        BookAppointmentRequest request,
        int targetPatientId,
        CancellationToken cancellationToken = default);

    Task<AppointmentDto> UpdateStatusAsync(
        int id,
        UpdateAppointmentStatusRequest request,
        UserRole callerRole,
        int? callerDoctorId,
        CancellationToken cancellationToken = default);

    Task<AppointmentDto> CancelAsync(
        int id,
        CancelAppointmentRequest request,
        UserRole callerRole,
        int? callerDoctorId,
        int? callerPatientId,
        CancellationToken cancellationToken = default);
}

