using System.ComponentModel.DataAnnotations;

namespace MediSync.Api.DTOs.Appointments;

public class CancelAppointmentRequest
{
    [Required]
    [MaxLength(500)]
    public string CancellationReason { get; set; } = string.Empty;
}

