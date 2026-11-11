using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Leaves;

public class CreateDoctorLeaveRequest
{
    public int? DoctorId { get; set; }

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Required]
    [MaxLength(300)]
    public string Reason { get; set; } = string.Empty;
}

