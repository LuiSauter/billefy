using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentPurchaseAccounting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "concurrency_stamp",
                table: "investments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<decimal>(
                name: "cost_basis",
                table: "investments",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "purchase_key",
                table: "investment_transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "purchase_payload_hash",
                table: "investment_transactions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_investment_transactions_user_id_purchase_key",
                table: "investment_transactions",
                columns: new[] { "user_id", "purchase_key" },
                unique: true,
                filter: "purchase_key IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_investment_transactions_user_id_purchase_key",
                table: "investment_transactions");

            migrationBuilder.DropColumn(
                name: "concurrency_stamp",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "cost_basis",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "purchase_key",
                table: "investment_transactions");

            migrationBuilder.DropColumn(
                name: "purchase_payload_hash",
                table: "investment_transactions");
        }
    }
}
