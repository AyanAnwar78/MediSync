using Microsoft.EntityFrameworkCore;
using MediSync.Api.DTOs.Departments;
using MediSync.Api.Data;
using MediSync.Api.Interfaces;
using MediSync.Api.Models;

namespace MediSync.Api.Services;

public class DepartmentService : IDepartmentService
{
    private readonly MediSyncDbContext _dbContext;

    public DepartmentService(MediSyncDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DepartmentDto>> GetAllAsync(
        bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Departments.AsNoTracking();

        if (activeOnly)
        {
            query = query.Where(d => d.IsActive);
        }

        return await query
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                DoctorCount = d.Doctors.Count
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Departments
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                DoctorCount = d.Doctors.Count
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Department with ID {id} was not found.");
    }

    public async Task<DepartmentDto> CreateAsync(
        CreateDepartmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = request.Name.Trim();
        var exists = await _dbContext.Departments
            .AnyAsync(d => d.Name.ToLower() == normalizedName.ToLower(), cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException($"Department '{normalizedName}' already exists.");
        }

        var department = new Department
        {
            Name = normalizedName,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Departments.Add(department);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(department.Id, cancellationToken);
    }

    public async Task<DepartmentDto> UpdateAsync(
        int id,
        UpdateDepartmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Department with ID {id} was not found.");

        var normalizedName = request.Name.Trim();
        var duplicate = await _dbContext.Departments
            .AnyAsync(d => d.Id != id && d.Name.ToLower() == normalizedName.ToLower(), cancellationToken);

        if (duplicate)
        {
            throw new InvalidOperationException($"Another department named '{normalizedName}' already exists.");
        }

        department.Name = normalizedName;
        department.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        department.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(department.Id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var department = await _dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Department with ID {id} was not found.");

        var hasDoctors = await _dbContext.Doctors
            .AnyAsync(d => d.DepartmentId == id, cancellationToken);

        if (hasDoctors)
        {
            throw new InvalidOperationException(
                "Cannot delete this department while doctors are assigned to it. Reassign doctors or deactivate the department instead.");
        }

        _dbContext.Departments.Remove(department);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

