using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentTransactionsAndTicker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ticker",
                table: "investments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "investment_transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    investment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(28,10)", precision: 28, scale: 10, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    fees = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false, defaultValue: 0m),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ledger_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_transactions", x => x.id);
                    table.ForeignKey(
                        name: "FK_investment_transactions_investments_investment_id_user_id",
                        columns: x => new { x.investment_id, x.user_id },
                        principalTable: "investments",
                        principalColumns: new[] { "id", "user_id" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_investment_transactions_investment_id_user_id",
                table: "investment_transactions",
                columns: new[] { "investment_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_investment_transactions_ledger_transaction_id",
                table: "investment_transactions",
                column: "ledger_transaction_id");

            migrationBuilder.CreateIndex(
                name: "IX_investment_transactions_user_id_investment_id_occurred_at",
                table: "investment_transactions",
                columns: new[] { "user_id", "investment_id", "occurred_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "investment_transactions");

            migrationBuilder.DropColumn(
                name: "ticker",
                table: "investments");
        }
    }
}
