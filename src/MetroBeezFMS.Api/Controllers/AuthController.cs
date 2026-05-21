using System.Text;
using System.Security.Claims;
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

        await SendVerificationEmailAsync(user, cancellationToken);

        return Accepted(new { message = "Registration created. Verify your email to continue tenant onboarding." });
    }

    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<ActionResult> ResendVerification(ResendVerificationRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return ValidationProblem("Email is required.");
        }

        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is not null && !user.EmailConfirmed)
        {
            await SendVerificationEmailAsync(user, cancellationToken);
        }

        return Accepted(new { message = "If the account needs verification, a new verification email has been sent." });
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

        if (await _userManager.IsInRoleAsync(user, Roles.SuperAdmin))
        {
            return BuildPlatformAuthResponse(user);
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

        if (tenantUser.Tenant.Status != TenantStatus.Active)
        {
            return Unauthorized("This tenant is not active.");
        }

        return BuildAuthResponse(user, tenantUser.Tenant, tenantUser, requiresEmailVerification: false, requiresOnboarding: false);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is not null)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
            var frontendUrl = _configuration["FRONTEND_URL"] ?? _configuration["Frontend:Url"] ?? "http://localhost:5173";
            var resetUrl = $"{frontendUrl.TrimEnd('/')}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(encodedToken)}";

            await _emailService.SendAsync(
                user.Email!,
                "BeezFleet - Password Reset",
                $"""
                <p>We received a request to reset the password for your BeezFleet account.</p>
                <p>Use the secure link below to choose a new password and return to your workspace.</p>
                <p><a href="{resetUrl}">Reset password</a></p>
                <p>If you did not request this reset, you can ignore this email. Your current password will remain unchanged.</p>
                """,
                cancellationToken);
        }

        return Accepted(new { message = "If an account exists, a password reset email has been sent." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ResetPassword(ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return ValidationProblem("A new password with at least 8 characters is required.");
        }

        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return BadRequest("Invalid password reset request.");
        }

        var decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
        var result = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
        if (!result.Succeeded)
        {
            return ValidationProblem(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        return NoContent();
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword(ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return ValidationProblem("A new password with at least 8 characters is required.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = Guid.TryParse(userId, out var id) ? await _userManager.FindByIdAsync(id.ToString()) : null;
        if (user is null)
        {
            return Unauthorized();
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            return ValidationProblem(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        return NoContent();
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

    private async Task SendVerificationEmailAsync(AppUser user, CancellationToken cancellationToken)
    {
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var frontendUrl = _configuration["FRONTEND_URL"] ?? _configuration["Frontend:Url"] ?? "http://localhost:5173";
        var verifyUrl = $"{frontendUrl.TrimEnd('/')}/verify-email?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(encodedToken)}";

        await _emailService.SendAsync(
            user.Email!,
            "BeezFleet - Verify Your Email",
            $"""
            <p>Welcome to BeezFleet, {user.FullName}.</p>
            <p>Verify your email so we can prepare your secure tenant workspace and connect your fleet records, bookings, documents, and reports under your company account.</p>
            <p><a href="{verifyUrl}">Verify email</a></p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p>{verifyUrl}</p>
            """,
            cancellationToken);
    }

    private ActionResult<AuthResponse> BuildPlatformAuthResponse(AppUser user)
    {
        var token = _tokenService.CreatePlatformToken(
            new TokenUser(user.Id, user.Email!, user.FullName),
            Roles.SuperAdmin);

        return Ok(new AuthResponse(
            token,
            user.Id,
            null,
            user.Email!,
            user.FullName,
            Roles.SuperAdmin,
            null,
            RequiresEmailVerification: false,
            RequiresOnboarding: false));
    }
}
