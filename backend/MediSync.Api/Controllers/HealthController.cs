using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MediSync.Api.Data;

namespace MediSync.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly MediSyncDbContext _dbContext;

    public HealthController(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
    {
        var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
        if (!canConnect)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "Unhealthy",
                database = "Disconnected",
                timestamp = DateTime.UtcNow
            });
        }

        return Ok(new
        {
            status = "Healthy",
            database = "Connected",
            counts = new
            {
                departments = await _dbContext.Departments.CountAsync(cancellationToken),
                users = await _dbContext.Users.CountAsync(cancellationToken),
                doctors = await _dbContext.Doctors.CountAsync(cancellationToken),
                patients = await _dbContext.Patients.CountAsync(cancellationToken),
                schedules = await _dbContext.DoctorSchedules.CountAsync(cancellationToken),
                leaves = await _dbContext.DoctorLeaves.CountAsync(cancellationToken),
                appointments = await _dbContext.Appointments.CountAsync(cancellationToken)
            },
            timestamp = DateTime.UtcNow
        });
    }
}

