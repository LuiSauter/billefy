using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSharedGoalContributionIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "idempotency_key",
                table: "shared_goal_contributions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_shared_goal_contributions_goal_id_idempotency_key",
                table: "shared_goal_contributions",
                columns: new[] { "goal_id", "idempotency_key" },
                unique: true,
                filter: "idempotency_key IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_shared_goal_contributions_goal_id_idempotency_key",
                table: "shared_goal_contributions");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "shared_goal_contributions");
        }
    }
}
