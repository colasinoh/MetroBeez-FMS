using MetroBeezFMS.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MetroBeezFMS.Infrastructure.Identity;

public static class PlatformIdentitySeeder
{
    public static async Task SeedPlatformIdentityAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("PlatformIdentitySeeder");

        try
        {
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

            foreach (var role in Roles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(role));
                    if (!roleResult.Succeeded)
                    {
                        logger.LogWarning("Could not create role {Role}: {Errors}", role, FormatErrors(roleResult));
                    }
                }
            }

            var email = FirstNonEmpty(configuration["SUPERADMIN_EMAIL"], configuration["SuperAdmin:Email"]);
            var password = FirstNonEmpty(configuration["SUPERADMIN_PASSWORD"], configuration["SuperAdmin:Password"]);
            var fullName = FirstNonEmpty(configuration["SUPERADMIN_FULL_NAME"], configuration["SuperAdmin:FullName"])
                ?? "BeezFleet Super Admin";

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                logger.LogInformation("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are not both configured; skipping superadmin user seed.");
                return;
            }

            var user = await userManager.FindByEmailAsync(email.Trim());
            if (user is null)
            {
                user = new AppUser
                {
                    UserName = email.Trim(),
                    Email = email.Trim(),
                    EmailConfirmed = true,
                    FullName = fullName.Trim(),
                    EmailVerifiedAt = DateTimeOffset.UtcNow
                };

                var createResult = await userManager.CreateAsync(user, password);
                if (!createResult.Succeeded)
                {
                    logger.LogError("Could not create superadmin user {Email}: {Errors}", email, FormatErrors(createResult));
                    return;
                }
            }
            else
            {
                var changed = false;
                if (!user.EmailConfirmed)
                {
                    user.EmailConfirmed = true;
                    user.EmailVerifiedAt ??= DateTimeOffset.UtcNow;
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(user.FullName) || user.FullName == user.Email)
                {
                    user.FullName = fullName.Trim();
                    changed = true;
                }

                if (changed)
                {
                    await userManager.UpdateAsync(user);
                }

                if (IsEnabled(configuration["SUPERADMIN_RESET_PASSWORD"], configuration["SuperAdmin:ResetPassword"]))
                {
                    var token = await userManager.GeneratePasswordResetTokenAsync(user);
                    var resetResult = await userManager.ResetPasswordAsync(user, token, password);
                    if (!resetResult.Succeeded)
                    {
                        logger.LogError("Could not reset superadmin password for {Email}: {Errors}", email, FormatErrors(resetResult));
                    }
                }
            }

            if (!await userManager.IsInRoleAsync(user, Roles.SuperAdmin))
            {
                var roleResult = await userManager.AddToRoleAsync(user, Roles.SuperAdmin);
                if (!roleResult.Succeeded)
                {
                    logger.LogError("Could not add {Email} to {Role}: {Errors}", email, Roles.SuperAdmin, FormatErrors(roleResult));
                }
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to seed BeezFleet platform identity.");
        }
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }

    private static bool IsEnabled(params string?[] values)
    {
        var value = FirstNonEmpty(values);
        return string.Equals(value, "true", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "1", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "yes", StringComparison.OrdinalIgnoreCase);
    }

    private static string FormatErrors(IdentityResult result)
    {
        return string.Join("; ", result.Errors.Select(error => error.Description));
    }
}
