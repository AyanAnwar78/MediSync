using System.Net;
using System.Security.Authentication;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediSync.Api.Middleware;

/// <summary>
/// Converts domain, concurrency, and unexpected exceptions into RFC 7807 ProblemDetails JSON responses.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title) = exception switch
        {
            AuthenticationException => (HttpStatusCode.Unauthorized, "Authentication Failed"),
            ArgumentException => (HttpStatusCode.BadRequest, "Invalid Request"),
            KeyNotFoundException => (HttpStatusCode.NotFound, "Resource Not Found"),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden, "Access Denied"),
            InvalidOperationException => (HttpStatusCode.Conflict, "Business Rule Violation"),
            DbUpdateConcurrencyException => (HttpStatusCode.Conflict, "Concurrency Conflict"),
            DbUpdateException => (HttpStatusCode.Conflict, "Database Constraint Violation"),
            _ => (HttpStatusCode.InternalServerError, "Internal Server Error")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception while processing {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning(exception, "Handled {StatusCode} exception at {Method} {Path}: {Message}",
                (int)statusCode, context.Request.Method, context.Request.Path, exception.Message);
        }

        var detail = statusCode == HttpStatusCode.InternalServerError && !_environment.IsDevelopment()
            ? "An unexpected error occurred. Please try again later."
            : exception.Message;

        var problem = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var json = JsonSerializer.Serialize(problem, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

