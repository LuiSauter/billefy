using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workspaces.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialWorkspaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "workspaces",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    workspace_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    base_currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    icon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    color = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    settings = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspaces", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "shared_budgets",
                columns: table => new
                {
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    total_budgeted_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shared_budgets", x => new { x.workspace_id, x.year, x.month });
                    table.ForeignKey(
                        name: "FK_shared_budgets_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "shared_goals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    category = table.Column<string>(type: "text", nullable: true),
                    target_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    monthly_commitment_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    monthly_commitment_currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    target_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shared_goals", x => x.id);
                    table.UniqueConstraint("AK_shared_goals_id_workspace_id", x => new { x.id, x.workspace_id });
                    table.ForeignKey(
                        name: "FK_shared_goals_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "workspace_invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invited_email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    workspace_role = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_invitations", x => x.id);
                    table.ForeignKey(
                        name: "FK_workspace_invitations_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "workspace_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_role = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    income_share_percentage = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_members", x => x.id);
                    table.UniqueConstraint("AK_workspace_members_id_workspace_id", x => new { x.id, x.workspace_id });
                    table.ForeignKey(
                        name: "FK_workspace_members_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "shared_budget_categories",
                columns: table => new
                {
                    category_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    limit_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shared_budget_categories", x => new { x.workspace_id, x.year, x.month, x.category_id });
                    table.ForeignKey(
                        name: "FK_shared_budget_categories_shared_budgets_workspace_id_year_m~",
                        columns: x => new { x.workspace_id, x.year, x.month },
                        principalTable: "shared_budgets",
                        principalColumns: new[] { "workspace_id", "year", "month" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "shared_financial_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    financial_event_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    responsible_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shared_financial_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_shared_financial_events_workspace_members_responsible_membe~",
                        columns: x => new { x.responsible_member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_shared_financial_events_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "shared_goal_contributions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contributed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    goal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shared_goal_contributions", x => x.id);
                    table.ForeignKey(
                        name: "FK_shared_goal_contributions_shared_goals_goal_id_workspace_id",
                        columns: x => new { x.goal_id, x.workspace_id },
                        principalTable: "shared_goals",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_shared_goal_contributions_workspace_members_member_id_works~",
                        columns: x => new { x.member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "workspace_expenses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    paid_by_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    split_rule_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    personal_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_expenses", x => x.id);
                    table.UniqueConstraint("AK_workspace_expenses_id_workspace_id", x => new { x.id, x.workspace_id });
                    table.ForeignKey(
                        name: "FK_workspace_expenses_workspace_members_paid_by_member_id_work~",
                        columns: x => new { x.paid_by_member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_workspace_expenses_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "workspace_settlements",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    payer_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    receiver_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    settlement_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspace_settlements", x => x.id);
                    table.ForeignKey(
                        name: "FK_workspace_settlements_workspace_members_payer_member_id_wor~",
                        columns: x => new { x.payer_member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_workspace_settlements_workspace_members_receiver_member_id_~",
                        columns: x => new { x.receiver_member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_workspace_settlements_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expense_split_allocations",
                columns: table => new
                {
                    member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expense_id = table.Column<Guid>(type: "uuid", nullable: false),
                    percentage = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    allocated_amount = table.Column<decimal>(type: "numeric(20,6)", precision: 20, scale: 6, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_split_allocations", x => new { x.expense_id, x.member_id });
                    table.ForeignKey(
                        name: "FK_expense_split_allocations_workspace_expenses_expense_id_wor~",
                        columns: x => new { x.expense_id, x.workspace_id },
                        principalTable: "workspace_expenses",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expense_split_allocations_workspace_members_member_id_works~",
                        columns: x => new { x.member_id, x.workspace_id },
                        principalTable: "workspace_members",
                        principalColumns: new[] { "id", "workspace_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_expense_split_allocations_expense_id_workspace_id",
                table: "expense_split_allocations",
                columns: new[] { "expense_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_expense_split_allocations_member_id_workspace_id",
                table: "expense_split_allocations",
                columns: new[] { "member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_shared_financial_events_responsible_member_id_workspace_id",
                table: "shared_financial_events",
                columns: new[] { "responsible_member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_shared_financial_events_workspace_id_due_date",
                table: "shared_financial_events",
                columns: new[] { "workspace_id", "due_date" });

            migrationBuilder.CreateIndex(
                name: "IX_shared_goal_contributions_goal_id_contributed_at",
                table: "shared_goal_contributions",
                columns: new[] { "goal_id", "contributed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_shared_goal_contributions_goal_id_workspace_id",
                table: "shared_goal_contributions",
                columns: new[] { "goal_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_shared_goal_contributions_member_id_workspace_id",
                table: "shared_goal_contributions",
                columns: new[] { "member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_shared_goals_workspace_id_status",
                table: "shared_goals",
                columns: new[] { "workspace_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_expenses_paid_by_member_id_workspace_id",
                table: "workspace_expenses",
                columns: new[] { "paid_by_member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_expenses_workspace_id_date",
                table: "workspace_expenses",
                columns: new[] { "workspace_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_invitations_token",
                table: "workspace_invitations",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_workspace_invitations_workspace_id_status",
                table: "workspace_invitations",
                columns: new[] { "workspace_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_members_user_id_is_active",
                table: "workspace_members",
                columns: new[] { "user_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_members_workspace_id_is_active",
                table: "workspace_members",
                columns: new[] { "workspace_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_members_workspace_id_user_id",
                table: "workspace_members",
                columns: new[] { "workspace_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_workspace_settlements_payer_member_id_workspace_id",
                table: "workspace_settlements",
                columns: new[] { "payer_member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_settlements_receiver_member_id_workspace_id",
                table: "workspace_settlements",
                columns: new[] { "receiver_member_id", "workspace_id" });

            migrationBuilder.CreateIndex(
                name: "IX_workspace_settlements_workspace_id_settlement_date",
                table: "workspace_settlements",
                columns: new[] { "workspace_id", "settlement_date" });

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_created_by_is_active",
                table: "workspaces",
                columns: new[] { "created_by", "is_active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expense_split_allocations");

            migrationBuilder.DropTable(
                name: "shared_budget_categories");

            migrationBuilder.DropTable(
                name: "shared_financial_events");

            migrationBuilder.DropTable(
                name: "shared_goal_contributions");

            migrationBuilder.DropTable(
                name: "workspace_invitations");

            migrationBuilder.DropTable(
                name: "workspace_settlements");

            migrationBuilder.DropTable(
                name: "workspace_expenses");

            migrationBuilder.DropTable(
                name: "shared_budgets");

            migrationBuilder.DropTable(
                name: "shared_goals");

            migrationBuilder.DropTable(
                name: "workspace_members");

            migrationBuilder.DropTable(
                name: "workspaces");
        }
    }
}
