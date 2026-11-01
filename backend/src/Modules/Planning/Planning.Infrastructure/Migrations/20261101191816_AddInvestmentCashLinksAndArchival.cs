using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvestmentCashLinksAndArchival : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "archived_at",
                table: "investments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_investments_id_user_id",
                table: "investments",
                columns: new[] { "id", "user_id" });

            migrationBuilder.CreateTable(
                name: "investment_cash_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    investment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ledger_transaction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    linked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reverses_link_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_investment_cash_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_investment_cash_links_investments_investment_id_user_id",
                        columns: x => new { x.investment_id, x.user_id },
                        principalTable: "investments",
                        principalColumns: new[] { "id", "user_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_investment_cash_links_investment_id_user_id",
                table: "investment_cash_links",
                columns: new[] { "investment_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_investment_cash_links_ledger_transaction_id",
                table: "investment_cash_links",
                column: "ledger_transaction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_investment_cash_links_user_id_investment_id_linked_at",
                table: "investment_cash_links",
                columns: new[] { "user_id", "investment_id", "linked_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "investment_cash_links");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_investments_id_user_id",
                table: "investments");

            migrationBuilder.DropColumn(
                name: "archived_at",
                table: "investments");
        }
    }
}
