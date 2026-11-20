using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ledger.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_transactions_user_id_category_id",
                table: "transactions",
                columns: new[] { "user_id", "category_id" });

            migrationBuilder.CreateIndex(
                name: "IX_transactions_user_id_occurred_at",
                table: "transactions",
                columns: new[] { "user_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_transactions_user_id_transfer_id",
                table: "transactions",
                columns: new[] { "user_id", "transfer_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_transactions_user_id_category_id",
                table: "transactions");

            migrationBuilder.DropIndex(
                name: "IX_transactions_user_id_occurred_at",
                table: "transactions");

            migrationBuilder.DropIndex(
                name: "IX_transactions_user_id_transfer_id",
                table: "transactions");
        }
    }
}
