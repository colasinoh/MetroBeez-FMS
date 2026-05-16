using MetroBeezFMS.Application;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (!subject.Contains("BeezFleet", StringComparison.OrdinalIgnoreCase))
        {
            subject = $"BeezFleet - {subject}";
        }

        var apiKey = _configuration["SENDGRID_API_KEY"];
        var fromEmail = _configuration["SENDGRID_FROM_EMAIL"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogError("Email not sent to {Email}; SendGrid environment variables are not configured. Subject: {Subject}", toEmail, subject);
            throw new InvalidOperationException("SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL before sending email.");
        }

        var client = new SendGridClient(apiKey);
        var message = MailHelper.CreateSingleEmail(
            new EmailAddress(fromEmail, "BeezFleet"),
            new EmailAddress(toEmail),
            subject,
            plainTextContent: StripHtml(htmlBody),
            htmlContent: htmlBody);

        var response = await client.SendEmailAsync(message, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Body.ReadAsStringAsync(cancellationToken);
            _logger.LogError("SendGrid returned {StatusCode} for {Email}: {Body}", response.StatusCode, toEmail, body);
            throw new InvalidOperationException($"SendGrid returned {response.StatusCode}. Confirm the API key is valid and SENDGRID_FROM_EMAIL is a verified sender.");
        }

        response.Headers.TryGetValues("X-Message-Id", out var messageIds);
        _logger.LogInformation("SendGrid accepted email to {Email}. Subject: {Subject}. MessageId: {MessageId}", toEmail, subject, messageIds?.FirstOrDefault() ?? "n/a");
    }

    private static string StripHtml(string html)
    {
        return html.Replace("<br>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<br/>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<br />", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<p>", "", StringComparison.OrdinalIgnoreCase)
            .Replace("</p>", "\n", StringComparison.OrdinalIgnoreCase);
    }
}
