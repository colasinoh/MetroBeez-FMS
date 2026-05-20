# BeezFleet

BeezFleet is a SaaS fleet management web application for vehicle rental and fleet service operations.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: ASP.NET Core Web API on .NET 8
- Database: PostgreSQL
- ORM: EF Core + Npgsql
- Auth: ASP.NET Core Identity + JWT
- Email: SendGrid
- File storage: `IFileStorageService` with local storage implementation first

## Structure

```text
apps/web                         React TypeScript web app
src/MetroBeezFMS.Api             ASP.NET Core Web API
src/MetroBeezFMS.Application     DTOs and service contracts
src/MetroBeezFMS.Domain          Domain entities and enums
src/MetroBeezFMS.Infrastructure  EF Core, Identity, SendGrid, storage, tenant provisioning
```

## Required Environment Variables

Do not commit real secrets. Use environment variables or .NET user-secrets.

```text
DB_HOST
DB_PORT
DB_ADMIN_USERNAME
DB_ADMIN_PASSWORD
DB_MASTER_DATABASE
JWT_SECRET
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
FRONTEND_URL
SUPERADMIN_EMAIL
```

Future S3-compatible storage variables:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET
FILE_STORAGE_PROVIDER
```

## Tenant Flow

1. User registers in the central database.
2. SendGrid sends `BeezFleet - Verify Your Email`.
3. Tenant database creation is blocked until email confirmation succeeds.
4. Verification creates a tenant record and a safe database name like `metrobeez_fms_tenant_{tenantId}`.
5. The backend connects with admin PostgreSQL environment variables, creates the tenant database, applies tenant migrations, and seeds demo data.
6. Tenant-scoped API requests resolve the tenant from JWT claims and verify the user belongs to that tenant.

## Backend

Restore and build:

```powershell
dotnet restore
dotnet build MetroBeezFMS.sln
```

Create/update the central database after setting database environment variables:

```powershell
dotnet ef database update `
  --project src/MetroBeezFMS.Infrastructure/MetroBeezFMS.Infrastructure.csproj `
  --startup-project src/MetroBeezFMS.Api/MetroBeezFMS.Api.csproj `
  --context CentralDbContext
```

Run the API:

```powershell
dotnet run --project src/MetroBeezFMS.Api/MetroBeezFMS.Api.csproj
```

Tenant databases are migrated automatically during email verification and tenant provisioning.

For production, set `ASPNETCORE_ENVIRONMENT=Production` and override these non-secret placeholders:

```powershell
$env:ASPNETCORE_ENVIRONMENT="Production"
$env:FRONTEND_URL="https://app.your-domain.com"
```

If you prefer ASP.NET nested configuration names, `Frontend__Url` also works.

For S3 uploads, set:

```powershell
$env:FILE_STORAGE_PROVIDER="S3"
$env:AWS_REGION="ap-southeast-1"
$env:AWS_S3_BUCKET="metrobeezfms-media-prod"
```

Optional, if objects are served through CloudFront or a public bucket URL:

```powershell
$env:AWS_S3_PUBLIC_BASE_URL="https://your-cdn-or-bucket-url"
```

## Frontend

Install and run:

```powershell
cd apps/web
npm install
npm run dev
```

Build:

```powershell
npm run build
```

## Implemented Milestone

- Layered solution structure
- Central Identity database entities, tenant metadata, tenant-user roles
- Database-per-tenant provisioning service
- EF Core migrations for central and tenant databases
- Tenant database seed data
- JWT authentication and role claims
- SendGrid email service with BeezFleet subject enforcement
- Local file storage via `IFileStorageService`
- Reminder background service for PMS and document/license expiration
- REST APIs for auth, dashboard, vehicles, drivers, renters, bookings, trips, maintenance, documents, notifications, reports, and settings
- Responsive SaaS dashboard UI with BeezFleet branding, forms, modals, tables, filters, badges, toasts, detail pages, and demo data
