using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceSplitConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "default_split_rule",
                table: "workspaces",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "EqualParts");

            migrationBuilder.AddColumn<decimal>(
                name: "default_custom_share_percentage",
                table: "workspace_members",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "default_responsibility_weight",
                table: "workspace_members",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<decimal>(
                name: "planned_custom_share_percentage",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "planned_income_share_percentage",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "planned_responsibility_weight",
                table: "workspace_invitations",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: false,
                defaultValue: 1m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "default_split_rule",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "default_custom_share_percentage",
                table: "workspace_members");

            migrationBuilder.DropColumn(
                name: "default_responsibility_weight",
                table: "workspace_members");

            migrationBuilder.DropColumn(
                name: "planned_custom_share_percentage",
                table: "workspace_invitations");

            migrationBuilder.DropColumn(
                name: "planned_income_share_percentage",
                table: "workspace_invitations");

            migrationBuilder.DropColumn(
                name: "planned_responsibility_weight",
                table: "workspace_invitations");
        }
    }
}
