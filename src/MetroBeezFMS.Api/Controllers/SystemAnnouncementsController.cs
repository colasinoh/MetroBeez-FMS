using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
public sealed class SystemAnnouncementsController : ControllerBase
{
    private readonly CentralDbContext _centralDbContext;

    public SystemAnnouncementsController(CentralDbContext centralDbContext)
    {
        _centralDbContext = centralDbContext;
    }

    [AllowAnonymous]
    [HttpGet("api/announcements/active")]
    public async Task<ActionResult<IReadOnlyList<SystemAnnouncementDto>>> Active(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var announcements = await _centralDbContext.SystemAnnouncements
            .AsNoTracking()
            .Where(x => x.IsActive && x.EndsAt >= now)
            .OrderBy(x => x.StartsAt)
            .ToListAsync(cancellationToken);

        return Ok(announcements.Select(ToDto).ToList());
    }

    [Authorize(Roles = Roles.SuperAdmin)]
    [HttpGet("api/admin/announcements")]
    public async Task<ActionResult<IReadOnlyList<SystemAnnouncementDto>>> List(CancellationToken cancellationToken)
    {
        var announcements = await _centralDbContext.SystemAnnouncements
            .AsNoTracking()
            .OrderByDescending(x => x.StartsAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        return Ok(announcements.Select(ToDto).ToList());
    }

    [Authorize(Roles = Roles.SuperAdmin)]
    [HttpPost("api/admin/announcements")]
    public async Task<ActionResult<SystemAnnouncementDto>> Create(SystemAnnouncementRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
        {
            return ValidationProblem("Title and message are required.");
        }

        if (request.EndsAt <= request.StartsAt)
        {
            return ValidationProblem("End date/time must be after the start date/time.");
        }

        var announcement = new SystemAnnouncement
        {
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            StartsAt = request.StartsAt,
            EndsAt = request.EndsAt,
            IsActive = request.IsActive,
            CreatedBy = User.Identity?.Name
        };

        _centralDbContext.SystemAnnouncements.Add(announcement);
        await _centralDbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(announcement));
    }

    [Authorize(Roles = Roles.SuperAdmin)]
    [HttpPut("api/admin/announcements/{id:guid}")]
    public async Task<ActionResult<SystemAnnouncementDto>> Update(Guid id, SystemAnnouncementRequest request, CancellationToken cancellationToken)
    {
        var announcement = await _centralDbContext.SystemAnnouncements.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (announcement is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
        {
            return ValidationProblem("Title and message are required.");
        }

        if (request.EndsAt <= request.StartsAt)
        {
            return ValidationProblem("End date/time must be after the start date/time.");
        }

        announcement.Title = request.Title.Trim();
        announcement.Message = request.Message.Trim();
        announcement.StartsAt = request.StartsAt;
        announcement.EndsAt = request.EndsAt;
        announcement.IsActive = request.IsActive;
        announcement.UpdatedAt = DateTimeOffset.UtcNow;
        announcement.UpdatedBy = User.Identity?.Name;
        await _centralDbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(announcement));
    }

    private static SystemAnnouncementDto ToDto(SystemAnnouncement announcement)
    {
        return new SystemAnnouncementDto(
            announcement.Id,
            announcement.Title,
            announcement.Message,
            announcement.StartsAt,
            announcement.EndsAt,
            announcement.IsActive,
            announcement.CreatedAt);
    }
}
