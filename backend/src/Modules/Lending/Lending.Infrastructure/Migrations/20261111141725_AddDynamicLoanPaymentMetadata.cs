using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lending.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicLoanPaymentMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "calculation_version",
                table: "payments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "early_principal_amount",
                table: "payments",
                type: "numeric(20,6)",
                precision: 20,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "early_principal_effective_date",
                table: "payments",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "record_sequence",
                table: "payments",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_loan_id_record_sequence",
                table: "payments",
                columns: new[] { "loan_id", "record_sequence" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_payments_loan_id_record_sequence",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "calculation_version",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "early_principal_amount",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "early_principal_effective_date",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "record_sequence",
                table: "payments");
        }
    }
}
