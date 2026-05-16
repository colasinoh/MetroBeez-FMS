using MetroBeezFMS.Application;
using MetroBeezFMS.Infrastructure.Identity;
using MetroBeezFMS.Infrastructure.Persistence;
using MetroBeezFMS.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetroBeezFMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = JwtTokenOptions.FromConfiguration(configuration);
        services.AddSingleton(jwtOptions);
        services.Configure<JwtTokenOptions>(options =>
        {
            options.Secret = jwtOptions.Secret;
            options.Issuer = jwtOptions.Issuer;
            options.Audience = jwtOptions.Audience;
            options.ExpiresMinutes = jwtOptions.ExpiresMinutes;
        });

        services.AddHttpContextAccessor();
        services.AddDbContext<CentralDbContext>(options =>
            options.UseNpgsql(DatabaseConnectionFactory.BuildCentralConnectionString(configuration)));

        services.AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.SignIn.RequireConfirmedEmail = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<CentralDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<ICurrentTenantService, CurrentTenantService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IFileStorageService>(sp =>
        {
            var provider = configuration["FILE_STORAGE_PROVIDER"] ?? configuration["FileStorage:Provider"] ?? "Local";
            return string.Equals(provider, "S3", StringComparison.OrdinalIgnoreCase)
                ? ActivatorUtilities.CreateInstance<S3FileStorageService>(sp)
                : ActivatorUtilities.CreateInstance<LocalFileStorageService>(sp);
        });
        services.AddScoped<ITenantDatabaseProvisioner, TenantDatabaseProvisioner>();
        services.AddScoped<ITenantAdministrationService, TenantAdministrationService>();
        services.AddScoped<TenantDbContextFactory>();
        services.AddScoped<ITenantDbContextFactory>(sp => sp.GetRequiredService<TenantDbContextFactory>());
        services.AddHostedService<ReminderBackgroundService>();

        return services;
    }
}
