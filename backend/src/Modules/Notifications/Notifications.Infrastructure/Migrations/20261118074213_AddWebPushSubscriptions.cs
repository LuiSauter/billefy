using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Notifications.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWebPushSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "web_push_subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    endpoint = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    p256dh_key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    auth_key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_web_push_subscriptions", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_web_push_subscriptions_endpoint",
                table: "web_push_subscriptions",
                column: "endpoint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_web_push_subscriptions_user_id",
                table: "web_push_subscriptions",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "web_push_subscriptions");
        }
    }
}
