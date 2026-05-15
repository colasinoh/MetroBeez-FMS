using MetroBeezFMS.Application;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public NotificationsController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> List([FromQuery] bool? unreadOnly, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.Notifications.AsNoTracking();
        if (unreadOnly == true)
        {
            query = query.Where(x => !x.IsRead);
        }

        return Ok(await query.OrderByDescending(x => x.CreatedAt).Take(100).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpPut("{id:guid}/read")]
    public async Task<ActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var notification = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (notification is null)
        {
            return NotFound();
        }

        notification.IsRead = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
