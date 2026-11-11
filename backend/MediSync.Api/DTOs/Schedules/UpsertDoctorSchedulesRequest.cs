using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Schedules;

public class UpsertDoctorSchedulesRequest
{
    [Required]
    public List<ScheduleDayRequest> Schedules { get; set; } = new();
}

