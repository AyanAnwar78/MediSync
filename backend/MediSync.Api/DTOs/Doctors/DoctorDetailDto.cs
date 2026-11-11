using MediSync.Api.DTOs.Leaves;
using MediSync.Api.DTOs.Schedules;

namespace MediSync.Api.DTOs.Doctors;

public class DoctorDetailDto : DoctorDto
{
    public List<DoctorScheduleDto> Schedules { get; set; } = new();
    public List<DoctorLeaveDto> UpcomingLeaves { get; set; } = new();
}

