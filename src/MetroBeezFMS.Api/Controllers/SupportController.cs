using System.Net;
using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/support")]
public sealed class SupportController : ControllerBase
{
    private readonly CentralDbContext _centralDbContext;
    private readonly ICurrentTenantService _currentTenant;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public SupportController(
        CentralDbContext centralDbContext,
        ICurrentTenantService currentTenant,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _centralDbContext = centralDbContext;
        _currentTenant = currentTenant;
        _emailService = emailService;
        _configuration = configuration;
    }

    [HttpGet("tickets")]
    public async Task<ActionResult<IReadOnlyList<SupportTicketDto>>> ListTickets(CancellationToken cancellationToken)
    {
        if (_currentTenant.TenantId is null)
        {
            return Forbid();
        }

        var tickets = await _centralDbContext.SupportTickets
            .AsNoTracking()
            .Include(x => x.Tenant)
            .Where(x => x.TenantId == _currentTenant.TenantId.Value)
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        return Ok(tickets.Select(x => ToDto(x, x.Tenant?.Name ?? "Tenant")).ToList());
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<SupportTicketDto>> CreateTicket(SupportTicketRequest request, CancellationToken cancellationToken)
    {
        if (_currentTenant.TenantId is null || _currentTenant.UserId is null || string.IsNullOrWhiteSpace(_currentTenant.UserEmail))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Message))
        {
            return ValidationProblem("Subject and message are required.");
        }

        var tenant = await _centralDbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == _currentTenant.TenantId.Value, cancellationToken);
        if (tenant is null)
        {
            return Forbid();
        }

        var superAdminEmail = await ResolveSuperAdminEmailAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(superAdminEmail))
        {
            return Problem("No superadmin email is configured.");
        }

        var requester = await _centralDbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == _currentTenant.UserId.Value, cancellationToken);
        var ticket = new SupportTicket
        {
            TenantId = tenant.Id,
            RequesterUserId = _currentTenant.UserId.Value,
            RequesterName = requester?.FullName,
            RequesterEmail = _currentTenant.UserEmail,
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            CreatedBy = _currentTenant.UserEmail
        };

        _centralDbContext.SupportTickets.Add(ticket);
        await _centralDbContext.SaveChangesAsync(cancellationToken);

        var dto = ToDto(ticket, tenant.Name);
        await _emailService.SendAsync(superAdminEmail, $"BeezFleet - Support Ticket: {ticket.Subject}", BuildSuperAdminEmail(dto), cancellationToken);
        await _emailService.SendAsync(ticket.RequesterEmail, $"BeezFleet - Support Ticket Received: {ticket.Subject}", BuildTenantEmail(dto), cancellationToken);
        return Ok(dto);
    }

    private async Task<string?> ResolveSuperAdminEmailAsync(CancellationToken cancellationToken)
    {
        var configured = FirstNonEmpty(_configuration["SUPERADMIN_EMAIL"], _configuration["SuperAdmin:Email"]);
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }

        var superAdminRoleId = await _centralDbContext.Roles
            .Where(x => x.Name == Roles.SuperAdmin)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (superAdminRoleId is null)
        {
            return null;
        }

        return await _centralDbContext.UserRoles
            .Where(x => x.RoleId == superAdminRoleId.Value)
            .Join(_centralDbContext.Users, userRole => userRole.UserId, user => user.Id, (_, user) => user.Email)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static SupportTicketDto ToDto(SupportTicket ticket, string tenantName)
    {
        return new SupportTicketDto(
            ticket.Id,
            ticket.TenantId,
            tenantName,
            ticket.RequesterUserId,
            ticket.RequesterName,
            ticket.RequesterEmail,
            ticket.Subject,
            ticket.Message,
            ticket.Status,
            ticket.CreatedAt);
    }

    private static string BuildSuperAdminEmail(SupportTicketDto ticket)
    {
        return $"""
            <p>A tenant submitted a BeezFleet support ticket.</p>
            <p><strong>Tenant:</strong> {Html(ticket.TenantName)}</p>
            <p><strong>Requester:</strong> {Html(ticket.RequesterName ?? ticket.RequesterEmail)} ({Html(ticket.RequesterEmail)})</p>
            <p><strong>Subject:</strong> {Html(ticket.Subject)}</p>
            <p><strong>Message:</strong></p>
            <p>{Html(ticket.Message).Replace("\n", "<br>")}</p>
            """;
    }

    private static string BuildTenantEmail(SupportTicketDto ticket)
    {
        return $"""
            <p>We received your BeezFleet support ticket.</p>
            <p><strong>Ticket:</strong> {Html(ticket.Subject)}</p>
            <p><strong>Status:</strong> {Html(ticket.Status)}</p>
            <p><strong>Submitted:</strong> {ticket.CreatedAt:yyyy-MM-dd HH:mm} UTC</p>
            <p><strong>Details:</strong></p>
            <p>{Html(ticket.Message).Replace("\n", "<br>")}</p>
            """;
    }

    private static string Html(string value)
    {
        return WebUtility.HtmlEncode(value);
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }
}
