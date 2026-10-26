using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ingestion.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatementImports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "imports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    format = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    summary_json = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_imports", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_imports_user_id_account_id",
                table: "imports",
                columns: new[] { "user_id", "account_id" });

            migrationBuilder.CreateIndex(
                name: "IX_imports_user_id_file_hash",
                table: "imports",
                columns: new[] { "user_id", "file_hash" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "imports");
        }
    }
}
