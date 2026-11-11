using MediSync.Api.DTOs.Leaves;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.Interfaces;

public interface ILeaveService
{
    Task<IReadOnlyList<DoctorLeaveDto>> GetLeavesAsync(int? doctorId = null, LeaveStatus? status = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DoctorLeaveDto>> GetDoctorApprovedLeavesAsync(int doctorId, CancellationToken cancellationToken = default);
    Task<DoctorLeaveDto> CreateLeaveAsync(int doctorId, CreateDoctorLeaveRequest request, bool autoApprove, CancellationToken cancellationToken = default);
    Task<DoctorLeaveDto> UpdateLeaveStatusAsync(int leaveId, LeaveStatus status, CancellationToken cancellationToken = default);
    Task DeleteLeaveAsync(int leaveId, int? restrictingDoctorId, CancellationToken cancellationToken = default);
}

