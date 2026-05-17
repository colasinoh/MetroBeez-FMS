using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MetroBeezFMS.Infrastructure.Persistence.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class PublicShowcase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Caption",
                table: "DocumentAttachments",
                type: "character varying(220)",
                maxLength: 220,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "DocumentAttachments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsPhoto",
                table: "DocumentAttachments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "DocumentAttachments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PublicBookingInstructions",
                table: "CompanyProfiles",
                type: "character varying(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicPageDescription",
                table: "CompanyProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PublicPageEnabled",
                table: "CompanyProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PublicPageHeadline",
                table: "CompanyProfiles",
                type: "character varying(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PublicBookingInquiries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                    RenterName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ContactNumber = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Email = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: true),
                    StartDateTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndDateTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicBookingInquiries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublicBookingInquiries_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PublicVehicleListings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PriceAmount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: true),
                    PriceUnit = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Description = table.Column<string>(type: "character varying(1400)", maxLength: 1400, nullable: true),
                    RentalNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ShowPlateNumber = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<string>(type: "text", nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicVehicleListings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublicVehicleListings_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleFeatureDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Label = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Icon = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleFeatureDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PublicVehicleFeatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PublicVehicleListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureDefinitionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomLabel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    CustomIcon = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicVehicleFeatures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublicVehicleFeatures_PublicVehicleListings_PublicVehicleLi~",
                        column: x => x.PublicVehicleListingId,
                        principalTable: "PublicVehicleListings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PublicVehicleFeatures_VehicleFeatureDefinitions_FeatureDefi~",
                        column: x => x.FeatureDefinitionId,
                        principalTable: "VehicleFeatureDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentAttachments_EntityType_EntityId_IsPhoto",
                table: "DocumentAttachments",
                columns: new[] { "EntityType", "EntityId", "IsPhoto" });

            migrationBuilder.CreateIndex(
                name: "IX_PublicBookingInquiries_VehicleId",
                table: "PublicBookingInquiries",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_PublicVehicleFeatures_FeatureDefinitionId",
                table: "PublicVehicleFeatures",
                column: "FeatureDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PublicVehicleFeatures_PublicVehicleListingId",
                table: "PublicVehicleFeatures",
                column: "PublicVehicleListingId");

            migrationBuilder.CreateIndex(
                name: "IX_PublicVehicleListings_VehicleId",
                table: "PublicVehicleListings",
                column: "VehicleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleFeatureDefinitions_Code",
                table: "VehicleFeatureDefinitions",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicBookingInquiries");

            migrationBuilder.DropTable(
                name: "PublicVehicleFeatures");

            migrationBuilder.DropTable(
                name: "PublicVehicleListings");

            migrationBuilder.DropTable(
                name: "VehicleFeatureDefinitions");

            migrationBuilder.DropIndex(
                name: "IX_DocumentAttachments_EntityType_EntityId_IsPhoto",
                table: "DocumentAttachments");

            migrationBuilder.DropColumn(
                name: "Caption",
                table: "DocumentAttachments");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "DocumentAttachments");

            migrationBuilder.DropColumn(
                name: "IsPhoto",
                table: "DocumentAttachments");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "DocumentAttachments");

            migrationBuilder.DropColumn(
                name: "PublicBookingInstructions",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "PublicPageDescription",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "PublicPageEnabled",
                table: "CompanyProfiles");

            migrationBuilder.DropColumn(
                name: "PublicPageHeadline",
                table: "CompanyProfiles");
        }
    }
}
