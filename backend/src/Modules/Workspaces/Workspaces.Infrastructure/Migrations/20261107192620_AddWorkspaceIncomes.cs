using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceIncomes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "workspace_incomes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    received_by_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    personal_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    received_to_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_incomes", x => x.id);
                    table.ForeignKey(
                        name: "FK_workspace_incomes_workspace_members_received_by_member_id_w~",
                        columns: x => new { x.received_by_member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_workspace_incomes_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_incomes_received_by_member_id_workspace_id",
                table: "workspace_incomes",
                columns: new[] { "received_by_member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_incomes_workspace_id_category_id_date",
                table: "workspace_incomes",
                columns: new[] { "workspace_id", "category_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_incomes_workspace_id_date_id",
                table: "workspace_incomes",
                columns: new[] { "workspace_id", "date", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_incomes_workspace_id_received_by_member_id_date",
                table: "workspace_incomes",
                columns: new[] { "workspace_id", "received_by_member_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "workspace_incomes");
        }
    }
}
