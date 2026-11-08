using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fx.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUsdcToCurrencyCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "currency_catalog",
                columns: new[] { "code", "is_active", "name", "precision", "symbol" },
                values: new object[] { "USDC", true, "USD Coin", 2, "USDC" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "currency_catalog",
                keyColumn: "code",
                keyValue: "USDC");
        }
    }
}
