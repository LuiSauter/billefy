using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonalLedgerLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "payer_transaction_id",
                table: "workspace_settlements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "receiver_transaction_id",
                table: "workspace_settlements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "paid_from_account_id",
                table: "workspace_expenses",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "payer_transaction_id",
                table: "workspace_settlements");

            migrationBuilder.DropColumn(
                name: "receiver_transaction_id",
                table: "workspace_settlements");

            migrationBuilder.DropColumn(
                name: "paid_from_account_id",
                table: "workspace_expenses");
        }
    }
}
