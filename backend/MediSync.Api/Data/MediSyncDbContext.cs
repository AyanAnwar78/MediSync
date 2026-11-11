using Microsoft.EntityFrameworkCore;
using MediSync.Api.Models;

namespace MediSync.Api.Data;

/// <summary>
/// Entity Framework Core database context for the MediSync hospital platform.
/// </summary>
public class MediSyncDbContext : DbContext
{
    public MediSyncDbContext(DbContextOptions<MediSyncDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();
    public DbSet<DoctorLeave> DoctorLeaves => Set<DoctorLeave>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MediSyncDbContext).Assembly);
    }
}

