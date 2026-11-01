using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lending.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanDisbursementTransactionLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "disbursement_reversal_transaction_id",
                table: "loans",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "disbursement_transaction_id",
                table: "loans",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "disbursement_reversal_transaction_id",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "disbursement_transaction_id",
                table: "loans");
        }
    }
}
