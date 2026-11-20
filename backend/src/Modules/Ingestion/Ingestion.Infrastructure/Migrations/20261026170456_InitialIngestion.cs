using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ingestion.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialIngestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "drafts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    import_id = table.Column<Guid>(type: "uuid", nullable: true),
                    suggested_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    suggested_category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    confirmed_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    confirmed_category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ledger_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    direction = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    estimated_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    fingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    confidence = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false),
                    confirmed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    discarded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_drafts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "financial_sources",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    alias = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    decision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_sources", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "raw_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    channel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    source_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    masked_text = table.Column<string>(type: "text", nullable: true),
                    received_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    purge_after = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_raw_events", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "draft_events",
                columns: table => new
                {
                    draft_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_draft_events", x => new { x.draft_id, x.event_id });
                    table.ForeignKey(
                        name: "FK_draft_events_drafts_draft_id",
                        column: x => x.draft_id,
                        principalTable: "drafts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_drafts_user_id_fingerprint",
                table: "drafts",
                columns: new[] { "user_id", "fingerprint" });

            migrationBuilder.CreateIndex(
                name: "IX_drafts_user_id_reference",
                table: "drafts",
                columns: new[] { "user_id", "reference" });

            migrationBuilder.CreateIndex(
                name: "IX_drafts_user_id_status",
                table: "drafts",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_financial_sources_user_id_source_id",
                table: "financial_sources",
                columns: new[] { "user_id", "source_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_raw_events_purge_after",
                table: "raw_events",
                column: "purge_after");

            migrationBuilder.CreateIndex(
                name: "IX_raw_events_user_id_event_id",
                table: "raw_events",
                columns: new[] { "user_id", "event_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "draft_events");

            migrationBuilder.DropTable(
                name: "financial_sources");

            migrationBuilder.DropTable(
                name: "raw_events");

            migrationBuilder.DropTable(
                name: "drafts");
        }
    }
}
