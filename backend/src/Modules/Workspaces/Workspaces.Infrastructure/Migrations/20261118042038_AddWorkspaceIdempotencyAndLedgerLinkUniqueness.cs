using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceIdempotencyAndLedgerLinkUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "idempotency_key",
                table: "workspace_settlements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "idempotency_key",
                table: "workspace_incomes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "idempotency_key",
                table: "workspace_expenses",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_workspace_settlements_payer_transaction_id",
                table: "workspace_settlements",
                column: "payer_transaction_id",
                unique: true,
                filter: "payer_transaction_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_workspace_settlements_receiver_transaction_id",
                table: "workspace_settlements",
                column: "receiver_transaction_id",
                unique: true,
                filter: "receiver_transaction_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_workspace_settlements_workspace_id_idempotency_key",
                table: "workspace_settlements",
                columns: new[] { "workspace_id", "idempotency_key" },
                unique: true,
                filter: "idempotency_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_workspace_incomes_personal_transaction_id",
                table: "workspace_incomes",
                column: "personal_transaction_id",
                unique: true,
                filter: "personal_transaction_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_workspace_incomes_workspace_id_idempotency_key",
                table: "workspace_incomes",
                columns: new[] { "workspace_id", "idempotency_key" },
                unique: true,
                filter: "idempotency_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_workspace_expenses_personal_transaction_id",
                table: "workspace_expenses",
                column: "personal_transaction_id",
                unique: true,
                filter: "personal_transaction_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_workspace_expenses_workspace_id_idempotency_key",
                table: "workspace_expenses",
                columns: new[] { "workspace_id", "idempotency_key" },
                unique: true,
                filter: "idempotency_key IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_workspace_settlements_payer_transaction_id",
                table: "workspace_settlements");

            migrationBuilder.DropIndex(
                name: "IX_workspace_settlements_receiver_transaction_id",
                table: "workspace_settlements");

            migrationBuilder.DropIndex(
                name: "IX_workspace_settlements_workspace_id_idempotency_key",
                table: "workspace_settlements");

            migrationBuilder.DropIndex(
                name: "IX_workspace_incomes_personal_transaction_id",
                table: "workspace_incomes");

            migrationBuilder.DropIndex(
                name: "IX_workspace_incomes_workspace_id_idempotency_key",
                table: "workspace_incomes");

            migrationBuilder.DropIndex(
                name: "IX_workspace_expenses_personal_transaction_id",
                table: "workspace_expenses");

            migrationBuilder.DropIndex(
                name: "IX_workspace_expenses_workspace_id_idempotency_key",
                table: "workspace_expenses");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "workspace_settlements");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "workspace_incomes");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "workspace_expenses");
        }
    }
}
