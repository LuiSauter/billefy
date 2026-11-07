using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringEndConditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "completed_occurrences",
                table: "recurring_payments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "end_date",
                table: "recurring_payments",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "end_type",
                table: "recurring_payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "total_occurrences",
                table: "recurring_payments",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "completed_occurrences",
                table: "recurring_payments");

            migrationBuilder.DropColumn(
                name: "end_date",
                table: "recurring_payments");

            migrationBuilder.DropColumn(
                name: "end_type",
                table: "recurring_payments");

            migrationBuilder.DropColumn(
                name: "total_occurrences",
                table: "recurring_payments");
        }
    }
}
