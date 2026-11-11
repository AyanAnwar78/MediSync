using System.ComponentModel.DataAnnotations;
using MediSync.Api.Models.Enums;

namespace MediSync.Api.DTOs.Appointments;

public class UpdateAppointmentStatusRequest
{
    [Required]
    public AppointmentStatus Status { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(500)]
    public string? CancellationReason { get; set; }
}

