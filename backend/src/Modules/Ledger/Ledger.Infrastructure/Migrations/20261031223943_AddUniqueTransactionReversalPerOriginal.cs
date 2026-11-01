using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ledger.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueTransactionReversalPerOriginal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_transactions_reverses_id",
                table: "transactions");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_reverses_id",
                table: "transactions",
                column: "reverses_id",
                unique: true,
                filter: "\"reverses_id\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_transactions_reverses_id",
                table: "transactions");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_reverses_id",
                table: "transactions",
                column: "reverses_id");
        }
    }
}
