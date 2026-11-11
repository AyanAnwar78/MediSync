using System.ComponentModel.DataAnnotations;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.DTOs.Leaves;

public class UpdateLeaveStatusRequest
{
    [Required]
    public LeaveStatus Status { get; set; }
}

