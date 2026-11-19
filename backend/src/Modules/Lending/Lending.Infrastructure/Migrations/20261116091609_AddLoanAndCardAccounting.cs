using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lending.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanAndCardAccounting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "accounting_result",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fingerprint",
                table: "payments",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "idempotency_key",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "interest_transaction_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "creation_fingerprint",
                table: "loans",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "creation_key",
                table: "loans",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "loan_kind",
                table: "loans",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "origination_kind",
                table: "loans",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "loan_purchases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    loan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    installment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ledger_transaction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    idempotency_key = table.Column<Guid>(type: "uuid", nullable: true),
                    fingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loan_purchases", x => x.id);
                    table.ForeignKey(
                        name: "FK_loan_purchases_loans_loan_id",
                        column: x => x.loan_id,
                        principalTable: "loans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_payments_user_id_loan_id_idempotency_key",
                table: "payments",
                columns: new[] { "user_id", "loan_id", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_loans_user_id_creation_key",
                table: "loans",
                columns: new[] { "user_id", "creation_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_loan_purchases_ledger_transaction_id",
                table: "loan_purchases",
                column: "ledger_transaction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_loan_purchases_loan_id",
                table: "loan_purchases",
                column: "loan_id");

            migrationBuilder.CreateIndex(
                name: "IX_loan_purchases_user_id_loan_id_idempotency_key",
                table: "loan_purchases",
                columns: new[] { "user_id", "loan_id", "idempotency_key" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "loan_purchases");

            migrationBuilder.DropIndex(
                name: "IX_payments_user_id_loan_id_idempotency_key",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_loans_user_id_creation_key",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "accounting_result",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "fingerprint",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "interest_transaction_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "creation_fingerprint",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "creation_key",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "loan_kind",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "origination_kind",
                table: "loans");
        }
    }
}
