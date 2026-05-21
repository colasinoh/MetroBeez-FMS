using MetroBeezFMS.Application;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;
using System.Net;
using System.Text.RegularExpressions;

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

        var brandedHtml = BuildBrandedHtml(subject, htmlBody);
        var plainText = StripHtml(brandedHtml);

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
            plainTextContent: plainText,
            htmlContent: brandedHtml);

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

    private static string BuildBrandedHtml(string subject, string htmlBody)
    {
        var title = CleanSubject(subject);
        var encodedTitle = WebUtility.HtmlEncode(title);
        var content = StyleLinks(htmlBody.Trim());

        return $"""
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>{encodedTitle}</title>
              </head>
              <body style="margin:0;padding:0;background:#f4f7fb;color:#0f172a;font-family:Segoe UI,Arial,sans-serif;">
                <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
                  BeezFleet keeps your fleet, bookings, documents, support requests, and maintenance reminders moving in one workspace.
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dbe3ef;border-radius:18px;overflow:hidden;box-shadow:0 14px 42px rgba(6,43,92,.10);">
                        <tr>
                          <td style="background:#062b5c;padding:24px 28px;color:#ffffff;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="width:58px;">
                                  <div style="width:46px;height:46px;border-radius:12px;background:#f8bb18;color:#062b5c;font-size:18px;font-weight:800;line-height:46px;text-align:center;">BF</div>
                                </td>
                                <td>
                                  <div style="font-size:19px;font-weight:800;line-height:1.2;">BeezFleet</div>
                                  <div style="font-size:13px;color:#dbeafe;margin-top:3px;">Fleet and car rental management platform</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:30px 30px 12px;">
                            <div style="display:inline-block;margin-bottom:14px;padding:6px 11px;border-radius:999px;background:#fff7d6;color:#7a5b00;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;">BeezFleet notification</div>
                            <h1 style="margin:0;color:#062b5c;font-size:26px;line-height:1.25;font-weight:800;">{encodedTitle}</h1>
                            <p style="margin:12px 0 0;color:#475569;font-size:15px;line-height:1.65;">This message contains an update from your BeezFleet workspace. Review the details below and take action when needed.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 30px 24px;">
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px;color:#0f172a;font-size:15px;line-height:1.65;">
                              {content}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 30px 30px;">
                            <div style="background:#eef4ff;border-radius:14px;padding:16px 18px;color:#334155;font-size:13px;line-height:1.6;">
                              <strong style="color:#062b5c;">Why you received this</strong><br>
                              BeezFleet sends operational emails for account access, support tickets, public booking inquiries, compliance reminders, and PMS schedules connected to your workspace.
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
                            <strong style="color:#062b5c;">BeezFleet</strong><br>
                            Built for growing rental fleets in the Philippines. Please keep this message for your records.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """;
    }

    private static string CleanSubject(string subject)
    {
        return Regex.Replace(subject, @"^\s*BeezFleet\s*[-:]\s*", "", RegexOptions.IgnoreCase).Trim();
    }

    private static string StyleLinks(string html)
    {
        return Regex.Replace(
            html,
            "<a\\s+(?![^>]*\\bstyle=)",
            "<a style=\"display:inline-block;margin:10px 0;padding:11px 16px;background:#f8bb18;color:#062b5c;border-radius:10px;text-decoration:none;font-weight:800;\" ",
            RegexOptions.IgnoreCase);
    }

    private static string StripHtml(string html)
    {
        var text = html.Replace("<br>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<br/>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<br />", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("<p>", "", StringComparison.OrdinalIgnoreCase)
            .Replace("</p>", "\n", StringComparison.OrdinalIgnoreCase);
        text = Regex.Replace(text, "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        return Regex.Replace(text, "[ \\t\\r\\n]+", " ").Trim();
    }
}
