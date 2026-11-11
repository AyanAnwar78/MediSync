using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Patients;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;

namespace MediSync.Api.Services;

public class PatientService : IPatientService
{
    private readonly MediSyncDbContext _dbContext;

    public PatientService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<PatientDto>> GetAllAsync(
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Patients
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Appointments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.User.FullName.ToLower().Contains(term) ||
                p.User.Email.ToLower().Contains(term) ||
                (p.User.PhoneNumber != null && p.User.PhoneNumber.ToLower().Contains(term)) ||
                (p.BloodGroup != null && p.BloodGroup.ToLower().Contains(term)));
        }

        return await query
            .OrderBy(p => p.User.FullName)
            .Select(p => new PatientDto
            {
                Id = p.Id,
                UserId = p.UserId,
                FullName = p.User.FullName,
                Email = p.User.Email,
                PhoneNumber = p.User.PhoneNumber,
                IsUserActive = p.User.IsActive,
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender,
                BloodGroup = p.BloodGroup,
                Address = p.Address,
                EmergencyContact = p.EmergencyContact,
                TotalAppointments = p.Appointments.Count
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Patients
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new PatientDto
            {
                Id = p.Id,
                UserId = p.UserId,
                FullName = p.User.FullName,
                Email = p.User.Email,
                PhoneNumber = p.User.PhoneNumber,
                IsUserActive = p.User.IsActive,
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender,
                BloodGroup = p.BloodGroup,
                Address = p.Address,
                EmergencyContact = p.EmergencyContact,
                TotalAppointments = p.Appointments.Count
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Patient with ID {id} was not found.");
    }

    public async Task<PatientDto> UpdateAsync(
        int id,
        UpdatePatientRequest request,
        bool allowActiveToggle,
        CancellationToken cancellationToken = default)
    {
        if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateOnly.FromDateTime(DateTime.Today))
        {
            throw new ArgumentException("Date of birth cannot be in the future.");
        }

        var patient = await _dbContext.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Patient with ID {id} was not found.");

        patient.User.FullName = request.FullName.Trim();
        patient.User.PhoneNumber = TrimOrNull(request.PhoneNumber);

        if (allowActiveToggle && request.IsUserActive.HasValue)
        {
            patient.User.IsActive = request.IsUserActive.Value;
        }

        patient.DateOfBirth = request.DateOfBirth;
        patient.Gender = TrimOrNull(request.Gender);
        patient.BloodGroup = TrimOrNull(request.BloodGroup);
        patient.Address = TrimOrNull(request.Address);
        patient.EmergencyContact = TrimOrNull(request.EmergencyContact);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(patient.Id, cancellationToken);
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

