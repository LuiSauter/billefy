using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Time;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Abstractions;

namespace Api.Tests;

// All financial writes and reads use public HTTP in a fresh SQLite test host.
// The laptop is client-owned manual state: its fixture value is an explicit input,
// not a claim that the server persists personal assets or that browser acceptance passed.
public sealed class JanuaryAccountingAcceptanceTests(ITestOutputHelper output)
{
    private HttpClient client = null!;
    private JsonElement fixture;
    private readonly Dictionary<string, Guid> accounts = [];
    private readonly Dictionary<string, Guid> categories = [];
    private readonly Dictionary<string, Guid> loans = [];
    private readonly Dictionary<int, Guid> recurring = [];
    private Dictionary<string, decimal> journal = [];
    private Guid investment;
    private Guid goal;
    private const string Movements = "/v1/transactions/movements?startUtc=2027-01-01T00:00:00Z&endUtcExclusive=2027-02-01T00:00:00Z&pageSize=100";

    [Fact]
    public async Task AuthoritativeJanuaryFixture_All21PublicEvents_ReconcileEveryCheckpointAndClosing()
    {
        using var document = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory,
            "Fixtures", "caso_prueba_contable_enero_2027.json")));
        fixture = document.RootElement.Clone();
        fixture.GetProperty("nombre").GetString().Should().Be("AUDITORIA_FINANZAS_PERSONALES_ENERO_2027");
        fixture.GetProperty("eventos").GetArrayLength().Should().Be(21);
        journal = fixture.GetProperty("saldos_apertura").EnumerateObject().ToDictionary(p => p.Name, p => Number(p.Value));
        var clock = new JanuaryClock();
        using var factory = new CustomWebApplicationFactory(shareAllFinancialModules: true, configureServices: services =>
            services.Replace(ServiceDescriptor.Singleton<IClock>(clock)));
        using var http = factory.CreateClient();
        client = http;
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());
        await OpenAndPlan();
        await Checkpoint(0);

        foreach (var operation in fixture.GetProperty("eventos").EnumerateArray())
        {
            var step = operation.GetProperty("paso").GetInt32();
            clock.Set(step);
            await Execute(step, operation);
            // Independent decimal double-entry oracle from the unchanged fixture, not application calculations.
            var debit = operation.GetProperty("debe").EnumerateArray().Sum(line => Money(line, "importe"));
            debit.Should().Be(operation.GetProperty("haber").EnumerateArray().Sum(line => Money(line, "importe")));
            foreach (var side in new[] { "debe", "haber" })
                foreach (var line in operation.GetProperty(side).EnumerateArray())
                {
                    var name = line.GetProperty("cuenta").GetString()!;
                    var debitNormal = name.StartsWith("asset.", StringComparison.Ordinal) || name.StartsWith("expense.", StringComparison.Ordinal);
                    journal[name] += (debitNormal == (side == "debe") ? 1m : -1m) * Money(line, "importe");
                }
            var state = await Checkpoint(step);
            var expected = operation.GetProperty("esperado_despues");
            state["banco"].Should().Be(Money(expected, "banco"), "fixture checkpoint {0}", step);
            state["patrimonio_neto"].Should().Be(Money(expected, "patrimonio_neto"), "fixture checkpoint {0}", step);
            state["tarjeta"].Should().Be(Money(expected, "tarjeta_deuda"), "fixture checkpoint {0}", step);
            state["efectivo_total"].Should().Be(Money(expected, "efectivo_total"), "fixture checkpoint {0}", step);
            output.WriteLine("CHECKPOINT {0}: PASS bank={1}, liquidity={2}, assets={3}, liabilities={4}, net={5}, income={6}, expenses={7}",
                step, state["banco"], state["efectivo_total"], state["activos_total"], state["pasivos_total"],
                state["patrimonio_neto"], state["ingresos_ordinarios_y_financieros_sin_valorizacion"], state["gastos"]);
        }
        clock.Set(31);
        var closing = await Checkpoint(21);
        foreach (var expected in fixture.GetProperty("resultado_esperado").EnumerateObject().Where(p => p.Name != "cuentas"))
            closing[expected.Name].Should().Be(Number(expected.Value), "exact closing field {0}", expected.Name);
        output.WriteLine("CLOSING PASS: {0}", JsonSerializer.Serialize(closing));
        output.WriteLine("PROOF_SCOPE: public HTTP / isolated SQLite; laptop supplied as client-owned fixture input; no browser, migration or independent-verifier PASS.");
    }

    private async Task OpenAndPlan()
    {
        foreach (var entry in new[] { ("asset.bank", "Bank"), ("asset.cash", "Cash"), ("asset.wallet", "Wallet"), ("asset.savings", "Savings") })
            accounts[entry.Item1] = Id(await Post("/v1/accounts", new
            { name = entry.Item1, type = entry.Item2, currency = "BOB", initialBalance = journal[entry.Item1] }));
        investment = Id(await Post("/v1/planning/investments", new
        {
            name = "Fixture opening shares", kind = "stocks", iconKey = "trending-up", colorKey = "blue", currency = "BOB",
            quantity = Money(fixture.GetProperty("inversion"), "unidades_iniciales"), currentValue = journal["asset.investment"]
        }));
        loans["liability.bank_loan"] = await Loan("liability.bank_loan", journal["liability.bank_loan"], "Borrowed", 1,
            opening: true, template: "SimpleOnBalance", rate: 0.01m, installments: 6);
        loans["liability.credit_card"] = await Loan("liability.credit_card", journal["liability.credit_card"], "Borrowed", 1,
            opening: true, kind: "CreditCard");
        (await Get("/v1/transactions")).GetArrayLength().Should().Be(0, "opening balances are not monthly cash income");
        var accountsBeforePlans = (await Get("/v1/accounts")).GetRawText();
        foreach (var budget in fixture.GetProperty("presupuestos").EnumerateObject())
        {
            categories[budget.Name] = Id(await Post("/v1/categories", new { name = budget.Name, direction = 2 }));
            await Post("/v1/planning/budgets", new { limitAmount = Number(budget.Value), currency = "BOB", categoryId = categories[budget.Name] });
        }
        foreach (var name in new[] { "income.salary", "income.freelance" })
            categories[name] = Id(await Post("/v1/categories", new { name, direction = 1 }));
        var goalInput = fixture.GetProperty("meta");
        goal = Id(await Post("/v1/planning/goals", new
        {
            name = goalInput.GetProperty("nombre").GetString(), targetAmount = Money(goalInput, "objetivo"), currency = "BOB",
            accountId = accounts["asset.savings"], fundingMode = "ReservedFunds"
        }));
        foreach (var entry in new[] { (5, "expense.housing"), (10, "expense.subscriptions") })
        {
            var source = fixture.GetProperty("eventos").EnumerateArray().Single(e => e.GetProperty("paso").GetInt32() == entry.Item1);
            recurring[entry.Item1] = Id(await Post("/v1/planning/recurring", new
            {
                name = source.GetProperty("descripcion").GetString(), flowType = "Expense", frequency = "Monthly",
                amount = Money(source.GetProperty("debe")[0], "importe"), currency = "BOB", startDate = $"2027-01-{entry.Item1:00}",
                categoryId = categories[entry.Item2], defaultAccountId = accounts["asset.bank"]
            }));
        }
        (await Get("/v1/accounts")).GetRawText().Should().Be(accountsBeforePlans);
        (await Get("/v1/transactions")).GetArrayLength().Should().Be(0, "budgets, goals and templates do not post cash");
    }

    private async Task Execute(int step, JsonElement operation)
    {
        var amount = Money(operation.GetProperty("debe")[0], "importe");
        var date = Date(step);
        var description = operation.GetProperty("descripcion").GetString();
        switch (step)
        {
            case 1: case 2: case 6: case 8: case 9: case 11:
                var incoming = step <= 2;
                var category = operation.GetProperty(incoming ? "haber" : "debe")[0].GetProperty("cuenta").GetString()!;
                var account = operation.GetProperty(incoming ? "debe" : "haber")[0].GetProperty("cuenta").GetString()!;
                await Post("/v1/transactions", new { accountId = accounts[account], amount, direction = incoming ? "Income" : "Expense",
                    categoryId = categories[category], occurredAt = date, description });
                break;
            case 3: case 4: case 12:
                var destination = operation.GetProperty("debe")[0].GetProperty("cuenta").GetString()!;
                await Post("/v1/transactions/transfers", new { sourceAccountId = accounts["asset.bank"], sourceAmount = amount,
                    destinationAccountId = accounts[destination], destinationAmount = amount, occurredAt = date, description });
                if (step == 12)
                    await Post($"/v1/planning/goals/{goal}/funding/assign", new
                    { amount = Money(fixture.GetProperty("meta"), "asignacion"), currency = "BOB", occurredAt = date }, key: Guid.NewGuid());
                break;
            case 5: case 10:
                await Post($"/v1/planning/recurring/{recurring[step]}/confirm", new
                { accountId = accounts["asset.bank"], amount, occurredAt = date }, HttpStatusCode.OK);
                break;
            case 7:
                await Post($"/v1/loans/{loans["liability.credit_card"]}/purchases", new
                { amount, currency = "BOB", categoryId = categories["expense.food"], occurredAt = date }, key: Guid.NewGuid());
                break;
            case 13:
                var source = fixture.GetProperty("inversion");
                await Post($"/v1/planning/investments/{investment}/operations", new
                { type = "Buy", quantity = Money(source, "unidades_compradas"), unitPrice = Money(source, "precio_compra"),
                    totalAmount = amount, fees = 0m, linkedAccountId = accounts["asset.bank"], occurredAt = date }, key: Guid.NewGuid());
                break;
            case 14: case 15: case 17: case 19:
                var name = step switch { 14 => "liability.credit_card", 15 => "liability.bank_loan", 17 => "asset.loan_receivable", _ => "liability.family_loan" };
                var paid = step == 15 ? Money(operation.GetProperty("haber")[0], "importe") : amount;
                var result = await Post($"/v1/loans/{loans[name]}/payments", new
                { amount = paid, accountId = accounts["asset.bank"], paymentDate = date,
                    interestCategoryId = step == 15 ? (Guid?)categories["expense.interest"] : null }, HttpStatusCode.OK, Guid.NewGuid());
                var allocations = result.GetProperty("allocations").EnumerateArray().ToArray();
                var expectedPrincipal = step switch { 14 => amount, 15 => 500m, 17 => 300m, _ => amount };
                allocations.Sum(a => Money(a, "toPrincipal")).Should().Be(expectedPrincipal);
                allocations.Sum(a => Money(a, "toInterest")).Should().Be(paid - expectedPrincipal);
                break;
            case 16:
                loans["asset.loan_receivable"] = await Loan("asset.loan_receivable", amount, "Lent", step, template: "SimpleOnBalance", rate: 0.025m);
                break;
            case 18:
                loans["liability.family_loan"] = await Loan("liability.family_loan", amount, "Borrowed", step);
                break;
            case 20:
                await Post($"/v1/planning/investments/{investment}/operations", new
                { type = "Dividend", quantity = 0m, unitPrice = 0m, totalAmount = amount, fees = 0m,
                    linkedAccountId = accounts["asset.bank"], occurredAt = date }, key: Guid.NewGuid());
                break;
            case 21:
                await Post($"/v1/planning/investments/{investment}/operations", new
                { type = "Revaluation", quantity = 0m, unitPrice = Money(fixture.GetProperty("inversion"), "precio_valuacion_cierre"),
                    totalAmount = Money(fixture.GetProperty("resultado_esperado"), "inversion_valor_mercado"), occurredAt = date });
                break;
            default: throw new InvalidOperationException($"Unmapped fixture step {step}");
        }
    }

    private async Task<Dictionary<string, decimal>> Checkpoint(int step)
    {
        var actual = (await Get("/v1/accounts")).EnumerateArray().ToDictionary(a => a.GetProperty("id").GetGuid(), a => Money(a, "balance"));
        foreach (var entry in accounts) actual[entry.Value].Should().Be(journal[entry.Key], "account {0} at step {1}", entry.Key, step);
        actual.Values.Should().OnlyContain(balance => balance >= 0);
        var debt = (await Get("/v1/loans")).EnumerateArray().ToArray();
        decimal Principal(string key) => loans.TryGetValue(key, out var id)
            ? Money(debt.Single(d => Id(d) == id), "remainingPrincipal") : 0m;
        foreach (var entry in journal.Where(p => p.Key.StartsWith("liability.", StringComparison.Ordinal)))
            Principal(entry.Key).Should().Be(entry.Value, "principal {0} at step {1}", entry.Key, step);
        Principal("asset.loan_receivable").Should().Be(journal["asset.loan_receivable"]);
        var position = (await Get("/v1/planning/investments")).EnumerateArray().Single(p => Id(p) == investment);
        Money(position, "currentValue").Should().Be(journal["asset.investment"]);
        var units = Money(fixture.GetProperty("inversion"), "unidades_iniciales") + (step >= 13 ? Money(fixture.GetProperty("inversion"), "unidades_compradas") : 0m);
        var cost = Money(fixture.GetProperty("saldos_apertura"), "asset.investment") + (step >= 13 ? 600m : 0m);
        Money(position, "quantity").Should().Be(units);
        Money(position, "costBasis").Should().Be(cost);
        var page = await Get(Movements);
        var rows = page.GetProperty("items").EnumerateArray().ToArray();
        page.GetProperty("totalCount").GetInt32().Should().Be(rows.Length, "all fixture source rows must fit, no partial-page sums");
        var summary = page.GetProperty("summary").EnumerateArray().ToArray();
        var income = summary.Sum(s => Money(s, "income"));
        var expenses = summary.Sum(s => Money(s, "expenses"));
        income.Should().Be(journal.Where(p => p.Key.StartsWith("income.", StringComparison.Ordinal) && p.Key != "income.investment_valuation").Sum(p => p.Value));
        expenses.Should().Be(journal.Where(p => p.Key.StartsWith("expense.", StringComparison.Ordinal)).Sum(p => p.Value));
        var budgets = (await Get("/v1/planning/budgets")).EnumerateArray().ToArray();
        foreach (var budget in fixture.GetProperty("presupuestos").EnumerateObject())
        {
            var stored = budgets.Single(b => b.GetProperty("categoryId").GetGuid() == categories[budget.Name]);
            Money(stored, "spentAmount").Should().Be(journal[budget.Name], "budget {0} at step {1}", budget.Name, step);
            Money(stored, "remainingAmount").Should().Be(Number(budget.Value) - journal[budget.Name]);
        }
        var goalDto = (await Get("/v1/planning/goals")).EnumerateArray().Single(g => Id(g) == goal);
        var assigned = step >= 12 ? Money(fixture.GetProperty("meta"), "asignacion") : 0m;
        Money(goalDto, "currentAmount").Should().Be(assigned);
        Money(goalDto, "accountReservedAmount").Should().Be(assigned);
        Money(goalDto, "accountFundingShortfall").Should().Be(0m);
        var goalHistory = await Get($"/v1/planning/goals/{goal}/funding");
        goalHistory.GetArrayLength().Should().Be(step >= 12 ? 1 : 0);
        var history = (await Get($"/v1/planning/investments/{investment}/transactions")).EnumerateArray().ToArray();
        history.Length.Should().Be(1 + (step >= 13 ? 1 : 0) + (step >= 20 ? 1 : 0) + (step >= 21 ? 1 : 0));
        foreach (var operation in history.Where(h => h.GetProperty("ledgerTransactionId").ValueKind != JsonValueKind.Null))
            rows.Should().Contain(r => Id(r) == operation.GetProperty("ledgerTransactionId").GetGuid(), "each funded operation links a real public ledger event");
        foreach (var template in (await Get("/v1/planning/recurring")).EnumerateArray())
        {
            var templateStep = recurring.Single(pair => pair.Value == Id(template)).Key;
            template.GetProperty("completedOccurrences").GetInt32().Should().Be(step >= templateStep ? 1 : 0);
        }
        var liquidity = actual.Values.Sum();
        var assets = liquidity + Money(position, "currentValue") + Principal("asset.loan_receivable") + journal["asset.laptop"];
        var liabilities = debt.Where(l => l.GetProperty("type").GetString() == "Borrowed").Sum(l => Money(l, "remainingPrincipal"));
        var net = assets - liabilities;
        net.Should().Be(journal["equity.opening"] + income - expenses + journal["income.investment_valuation"]);
        var flows = new Dictionary<string, decimal> { ["operativo"] = 0m, ["inversion"] = 0m, ["financiacion"] = 0m };
        foreach (var row in rows)
        {
            var kind = row.GetProperty("kind").GetString();
            if (kind == "Transfer" || Text(row, "loanCashKind") == "CardPurchase") continue;
            var signed = Money(row, "amount") * (row.GetProperty("direction").GetString() == "Income" ? 1m : -1m);
            var flow = Text(row, "investmentCashKind") is "Contribution" or "Disposal" ? "inversion" : "operativo";
            if (Text(row, "loanCashKind") == "Principal")
                flow = debt.Single(l => Id(l) == row.GetProperty("loanId").GetGuid()).GetProperty("type").GetString() == "Lent" ? "inversion" : "financiacion";
            flows[flow] += signed;
        }
        var openingLiquidity = accounts.Keys.Sum(k => Money(fixture.GetProperty("saldos_apertura"), k));
        flows.Values.Sum().Should().Be(liquidity - openingLiquidity);
        return new Dictionary<string, decimal>
        {
            ["banco"] = actual[accounts["asset.bank"]], ["efectivo_total"] = liquidity, ["activos_total"] = assets,
            ["pasivos_total"] = liabilities, ["patrimonio_neto"] = net,
            ["ingresos_ordinarios_y_financieros_sin_valorizacion"] = income, ["gastos"] = expenses,
            ["excedente_antes_de_valorizacion"] = income - expenses, ["ganancia_no_realizada"] = Money(position, "unrealizedGain"),
            ["resultado_total"] = net - journal["equity.opening"], ["prestamo_bancario"] = Principal("liability.bank_loan"),
            ["tarjeta"] = Principal("liability.credit_card"), ["prestamo_familiar"] = Principal("liability.family_loan"),
            ["prestamo_por_cobrar"] = Principal("asset.loan_receivable"), ["inversion_valor_mercado"] = Money(position, "currentValue"),
            ["inversion_costo"] = cost, ["acciones"] = units,
            ["dividendos"] = history.Where(h => h.GetProperty("type").GetString() == "Dividend").Sum(h => Money(h, "totalAmount")),
            ["presupuesto"] = budgets.Sum(b => Money(b, "limitAmount")), ["presupuesto_consumido"] = budgets.Sum(b => Money(b, "spentAmount")),
            ["presupuesto_disponible"] = budgets.Sum(b => Money(b, "remainingAmount")), ["meta_objetivo"] = Money(goalDto, "targetAmount"),
            ["meta_asignada"] = assigned, ["meta_progreso_pct"] = Money(goalDto, "percentageAchieved"),
            ["flujo_efectivo_operativo"] = flows["operativo"], ["flujo_efectivo_inversion"] = flows["inversion"],
            ["flujo_efectivo_financiacion"] = flows["financiacion"], ["flujo_efectivo_neto"] = flows.Values.Sum()
        };
    }

    private async Task<Guid> Loan(string name, decimal principal, string type, int day, bool opening = false,
        string kind = "Loan", string template = "NoInterest", decimal rate = 0m, int installments = 1) =>
        Id(await Post("/v1/loans", new
        {
            counterpartyName = name, type, template, principal, currency = "BOB", interestRate = rate, rateUnit = "Monthly",
            totalInstallments = installments, disbursementDate = $"2027-01-{day:00}", loanKind = kind,
            originationKind = opening ? "OpeningBalance" : "CashDisbursement",
            disbursementAccountId = opening ? (Guid?)null : accounts["asset.bank"]
        }, key: Guid.NewGuid()));

    private async Task<JsonElement> Get(string path)
    {
        using var response = await client.GetAsync(path);
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, "GET {0}: {1}", path, body);
        return JsonSerializer.Deserialize<JsonElement>(body);
    }
    private async Task<JsonElement> Post(string path, object payload, HttpStatusCode status = HttpStatusCode.Created, Guid? key = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(payload) };
        if (key.HasValue) request.Headers.Add("Idempotency-Key", key.Value.ToString());
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(status, "POST {0}: {1}", path, body);
        return JsonSerializer.Deserialize<JsonElement>(body);
    }
    private static Guid Id(JsonElement row) => row.GetProperty("id").GetGuid();
    private static string? Text(JsonElement row, string name) => row.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    private static decimal Money(JsonElement row, string name) => Number(row.GetProperty(name));
    private static decimal Number(JsonElement value) => value.ValueKind == JsonValueKind.String
        ? decimal.Parse(value.GetString()!, CultureInfo.InvariantCulture) : value.GetDecimal();
    private static DateTime Date(int day) => new(2027, 1, day, 12, 0, 0, DateTimeKind.Utc);
    private sealed class JanuaryClock : IClock
    {
        public DateTime UtcNow { get; private set; } = Date(1);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
        public void Set(int day) => UtcNow = Date(day);
    }
}
