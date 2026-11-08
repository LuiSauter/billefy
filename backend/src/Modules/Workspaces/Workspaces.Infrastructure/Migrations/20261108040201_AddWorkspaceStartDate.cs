using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceStartDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "start_date",
                table: "workspaces",
                type: "date",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "default_custom_share_percentage",
                table: "workspace_members",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(20,6)",
                oldPrecision: 20,
                oldScale: 6);

            migrationBuilder.AlterColumn<decimal>(
                name: "planned_income_share_percentage",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(20,6)",
                oldPrecision: 20,
                oldScale: 6);

            migrationBuilder.AlterColumn<decimal>(
                name: "planned_custom_share_percentage",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(20,6)",
                oldPrecision: 20,
                oldScale: 6);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "start_date",
                table: "workspaces");

            migrationBuilder.AlterColumn<decimal>(
                name: "default_custom_share_percentage",
                table: "workspace_members",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(20,6)",
                oldPrecision: 20,
                oldScale: 6,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "planned_income_share_percentage",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(20,6)",
                oldPrecision: 20,
                oldScale: 6,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "planned_custom_share_percentage",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(20,6)",
                oldPrecision: 20,
                oldScale: 6,
                oldDefaultValue: 0m);
        }
    }
}
