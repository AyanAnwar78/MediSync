using MediSync.Api.Models;

namespace MediSync.Api.Interfaces;

public interface IJwtTokenGenerator
{
    (string Token, DateTime ExpiresAt) GenerateToken(User user);
}

