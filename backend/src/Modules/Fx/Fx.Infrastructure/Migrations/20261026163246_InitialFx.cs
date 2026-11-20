using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Fx.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialFx : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "exchange_rates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    base_currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    buy_rate = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    sell_rate = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fetched_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exchange_rates", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rates_currency_base_currency_fetched_at",
                table: "exchange_rates",
                columns: new[] { "currency", "base_currency", "fetched_at" });

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rates_user_id_currency_base_currency",
                table: "exchange_rates",
                columns: new[] { "user_id", "currency", "base_currency" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "exchange_rates");
        }
    }
}
