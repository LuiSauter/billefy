using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Fx.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "currency_catalog",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    symbol = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    precision = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_currency_catalog", x => x.code);
                });

            migrationBuilder.InsertData(
                table: "currency_catalog",
                columns: new[] { "code", "is_active", "name", "precision", "symbol" },
                values: new object[,]
                {
                    { "BOB", true, "Boliviano", 2, "Bs" },
                    { "USD", true, "US Dollar", 2, "$" },
                    { "USDT", true, "Tether USD", 2, "₮" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "currency_catalog");
        }
    }
}
