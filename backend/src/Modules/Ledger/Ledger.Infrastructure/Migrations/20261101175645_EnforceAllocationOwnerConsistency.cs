using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ledger.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceAllocationOwnerConsistency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transaction_category_allocations_categories_category_id",
                table: "transaction_category_allocations");

            migrationBuilder.DropForeignKey(
                name: "FK_transaction_category_allocations_transactions_transaction_id",
                table: "transaction_category_allocations");

            migrationBuilder.DropIndex(
                name: "IX_transaction_category_allocations_category_id",
                table: "transaction_category_allocations");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_transactions_id_user_id",
                table: "transactions",
                columns: new[] { "id", "user_id" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_categories_id_user_id",
                table: "categories",
                columns: new[] { "id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_category_allocations_category_id_user_id",
                table: "transaction_category_allocations",
                columns: new[] { "category_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_category_allocations_transaction_id_user_id",
                table: "transaction_category_allocations",
                columns: new[] { "transaction_id", "user_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_transaction_category_allocations_categories_category_id_use~",
                table: "transaction_category_allocations",
                columns: new[] { "category_id", "user_id" },
                principalTable: "categories",
                principalColumns: new[] { "id", "user_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_transaction_category_allocations_transactions_transaction_i~",
                table: "transaction_category_allocations",
                columns: new[] { "transaction_id", "user_id" },
                principalTable: "transactions",
                principalColumns: new[] { "id", "user_id" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transaction_category_allocations_categories_category_id_use~",
                table: "transaction_category_allocations");

            migrationBuilder.DropForeignKey(
                name: "FK_transaction_category_allocations_transactions_transaction_i~",
                table: "transaction_category_allocations");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_transactions_id_user_id",
                table: "transactions");

            migrationBuilder.DropIndex(
                name: "IX_transaction_category_allocations_category_id_user_id",
                table: "transaction_category_allocations");

            migrationBuilder.DropIndex(
                name: "IX_transaction_category_allocations_transaction_id_user_id",
                table: "transaction_category_allocations");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_categories_id_user_id",
                table: "categories");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_category_allocations_category_id",
                table: "transaction_category_allocations",
                column: "category_id");

            migrationBuilder.AddForeignKey(
                name: "FK_transaction_category_allocations_categories_category_id",
                table: "transaction_category_allocations",
                column: "category_id",
                principalTable: "categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_transaction_category_allocations_transactions_transaction_id",
                table: "transaction_category_allocations",
                column: "transaction_id",
                principalTable: "transactions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
