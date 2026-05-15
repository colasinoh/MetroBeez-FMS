using System.Text;
using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Identity;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly CentralDbContext _centralDbContext;
    private readonly IEmailService _emailService;
    private readonly ITenantDatabaseProvisioner _tenantProvisioner;
    private readonly ITokenService _tokenService;
    private readonly TenantDbContextFactory _tenantDbContextFactory;
    private readonly IConfiguration _configuration;

    public AuthController(
        UserManager<AppUser> userManager,
        CentralDbContext centralDbContext,
        IEmailService emailService,
        ITenantDatabaseProvisioner tenantProvisioner,
        ITokenService tokenService,
        TenantDbContextFactory tenantDbContextFactory,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _centralDbContext = centralDbContext;
        _emailService = emailService;
        _tenantProvisioner = tenantProvisioner;
        _tokenService = tokenService;
        _tenantDbContextFactory = tenantDbContextFactory;
        _configuration = configuration;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email) || request.Password.Length < 8)
        {
            return ValidationProblem("Full name, a valid email, and an 8+ character password are required.");
        }

        var user = new AppUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim()
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return ValidationProblem(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var frontendUrl = _configuration["FRONTEND_URL"] ?? _configuration["Frontend:Url"] ?? "http://localhost:5173";
        var verifyUrl = $"{frontendUrl.TrimEnd('/')}/verify-email?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(encodedToken)}";

        await _emailService.SendAsync(
            user.Email!,
            "MetroBeez FMS - Verify Your Email",
            $"""
            <p>Welcome to MetroBeez FMS, {user.FullName}.</p>
            <p>Verify your email before we create your tenant database.</p>
            <p><a href="{verifyUrl}">Verify email</a></p>
            """,
            cancellationToken);

        return Accepted(new { message = "Registration created. Verify your email to continue tenant onboarding." });
    }

    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> VerifyEmail(VerifyEmailRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return BadRequest("Invalid verification request.");
        }

        if (!user.EmailConfirmed)
        {
            var decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            if (!result.Succeeded)
            {
                return ValidationProblem(string.Join("; ", result.Errors.Select(x => x.Description)));
            }

            user.EmailVerifiedAt = DateTimeOffset.UtcNow;
            await _userManager.UpdateAsync(user);
        }

        var tenant = await _tenantProvisioner.ProvisionTenantForVerifiedUserAsync(user.Id, request.CompanyName, cancellationToken);
        var tenantUser = await _centralDbContext.TenantUsers.FirstAsync(x => x.TenantId == tenant.Id && x.UserId == user.Id, cancellationToken);

        return BuildAuthResponse(user, tenant, tenantUser, requiresEmailVerification: false, requiresOnboarding: true);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized("Invalid email or password.");
        }

        if (!user.EmailConfirmed)
        {
            return Ok(new AuthResponse("", user.Id, null, user.Email!, user.FullName, "", null, true, false));
        }

        var tenantUser = await _centralDbContext.TenantUsers
            .Include(x => x.Tenant)
            .Where(x => x.UserId == user.Id && x.IsActive)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (tenantUser?.Tenant is null)
        {
            return Ok(new AuthResponse("", user.Id, null, user.Email!, user.FullName, "", null, false, true));
        }

        return BuildAuthResponse(user, tenantUser.Tenant, tenantUser, requiresEmailVerification: false, requiresOnboarding: false);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is not null)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            await _emailService.SendAsync(
                user.Email!,
                "MetroBeez FMS - Password Reset",
                $"<p>Use this password reset token in the MetroBeez FMS reset flow:</p><p>{WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token))}</p>");
        }

        return Accepted(new { message = "If an account exists, a password reset email has been sent." });
    }

    [HttpPost("logout")]
    [Authorize]
    public ActionResult Logout()
    {
        return NoContent();
    }

    [HttpPost("onboarding")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult> SaveCompanyProfile(CompanyProfileRequest request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var profile = await db.CompanyProfiles.FirstOrDefaultAsync(cancellationToken);
        if (profile is null)
        {
            db.CompanyProfiles.Add(new CompanyProfile
            {
                CompanyName = request.CompanyName,
                BusinessAddress = request.BusinessAddress,
                ContactNumber = request.ContactNumber,
                BirDtiLguDocumentUrl = request.BirDtiLguDocumentUrl,
                LogoUrl = request.LogoUrl
            });
        }
        else
        {
            profile.CompanyName = request.CompanyName;
            profile.BusinessAddress = request.BusinessAddress;
            profile.ContactNumber = request.ContactNumber;
            profile.BirDtiLguDocumentUrl = request.BirDtiLguDocumentUrl;
            profile.LogoUrl = request.LogoUrl;
        }

        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private ActionResult<AuthResponse> BuildAuthResponse(AppUser user, Tenant tenant, TenantUser tenantUser, bool requiresEmailVerification, bool requiresOnboarding)
    {
        var token = _tokenService.CreateToken(
            new TokenUser(user.Id, user.Email!, user.FullName),
            tenantUser,
            tenant.Name);

        return Ok(new AuthResponse(
            token,
            user.Id,
            tenant.Id,
            user.Email!,
            user.FullName,
            tenantUser.Role,
            tenant.Name,
            requiresEmailVerification,
            requiresOnboarding));
    }
}
