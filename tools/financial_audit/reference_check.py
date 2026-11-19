"""Fixture-only arithmetic checks, NOT an application ledger or acceptance test.

Run --help for the CLI. All reported monetary values are exact decimal strings.
"""
import sys

sys.dont_write_bytecode = True

import argparse
import json
from decimal import Decimal, Inexact, localcontext
from pathlib import Path

D = Decimal
ZERO = D(0)
LIQUID = {"asset.bank", "asset.cash", "asset.wallet", "asset.savings"}


def number(value):
    if isinstance(value, (float, bool)):
        raise ValueError("Only exact decimal inputs are allowed")
    result = D(value)
    if not result.is_finite():
        raise ValueError("Amounts must be finite")
    return result


def load_fixture(path):
    return json.loads(Path(path).read_text(), parse_float=D)


def validate(fixture):
    """Return deterministic PASS/FAIL evidence; never mutate the supplied fixture."""
    with localcontext() as context:
        context.prec = 60
        context.traps[Inexact] = True
        return _validate(fixture)


def _validate(f):
    report = {"reference_only": True, "application_acceptance": "NOT_RUN",
              "fixture": f["nombre"], "currency": f["moneda"], "stages": []}
    balances = dict.fromkeys(f["saldos_apertura"], ZERO)
    flows = dict.fromkeys(("operativo", "inversion", "financiacion"), ZERO)
    meta, investment = f["meta"], f["inversion"]
    reserved = number(meta["asignacion_inicial"])

    def stage(name):
        item = {"stage": name, "checks": []}
        report["stages"].append(item)
        return item

    def check(item, name, actual, expected):
        def serial(value):
            if isinstance(value, dict):
                return {k: serial(v) for k, v in value.items()}
            return str(value) if isinstance(value, Decimal) else value
        item["checks"].append({"check": name, "actual": serial(actual),
                               "expected": serial(expected),
                               "status": "PASS" if actual == expected else "FAIL"})

    def total(prefix):
        return sum((v for k, v in balances.items() if k.startswith(prefix)), ZERO)

    def liquidity():
        return sum((balances[k] for k in LIQUID), ZERO)

    def net_worth():
        return total("asset.") - total("liability.")

    def post(entry, item):
        sides, delta = {}, dict.fromkeys(balances, ZERO)
        for side, sign in (("debe", 1), ("haber", -1)):
            sides[side] = ZERO
            for line in entry[side]:
                account, amount = line["cuenta"], number(line["importe"])
                if account not in balances or amount < ZERO:
                    raise ValueError("Unknown account or negative posting")
                sides[side] += amount
                delta[account] += sign * amount
        check(item, "balanced_entry", sides["debe"], sides["haber"])
        for account, amount in delta.items():
            balances[account] += amount if account.startswith(("asset.", "expense.")) else -amount
        check(item, "nonnegative_balances", all(v >= ZERO for v in balances.values()), True)
        check(item, "accounting_equation", net_worth(),
              total("equity.") + total("income.") - total("expense."))
        return delta

    item = stage("opening")
    post(f["asiento_apertura"], item)
    check(item, "all_opening_accounts", balances.copy(),
          {k: number(v) for k, v in f["saldos_apertura"].items()})
    opening_liquidity, opening_net = liquidity(), net_worth()
    units = number(investment["unidades_iniciales"])
    cost = balances["asset.investment"]
    check(item, "opening_investment", cost, units * number(investment["precio_inicial"]))
    check(item, "event_sequence", [e["paso"] for e in f["eventos"]], list(range(1, 22)))
    check(item, "goal_initially_unreserved", reserved, ZERO)

    for event in f["eventos"]:
        item = stage(f"step_{event['paso']}")
        before_cash, before_net = liquidity(), net_worth()
        delta = post(event, item)
        actual = {"banco": balances["asset.bank"], "patrimonio_neto": net_worth(),
                  "tarjeta_deuda": balances["liability.credit_card"], "efectivo_total": liquidity()}
        check(item, "all_step_expectations", actual,
              {k: number(v) for k, v in event["esperado_despues"].items()})
        cash_change = liquidity() - before_cash
        classified = dict.fromkeys(flows, ZERO)
        if cash_change:
            for account, amount in delta.items():
                if account in LIQUID or not amount:
                    continue
                if account.startswith(("income.", "expense.")):
                    bucket = "operativo"
                elif account.startswith("liability."):
                    bucket = "financiacion"
                elif account.startswith("asset."):
                    bucket = "inversion"
                else:
                    raise ValueError("Unclassified cash counterpart")
                classified[bucket] -= amount
        check(item, "cash_classification_reconciles", sum(classified.values(), ZERO), cash_change)
        item["cash_flow"] = {k: str(v) for k, v in classified.items()}
        for bucket, amount in classified.items():
            flows[bucket] += amount
        if event["paso"] == meta["paso_asignacion"]:
            assigned = number(meta["asignacion"])
            reserved += assigned
            check(item, "goal_backing_transfer", delta[meta["cuenta_respaldo"]], assigned)
            check(item, "goal_does_not_create_net_worth", net_worth(), before_net)
        check(item, "goal_backed", ZERO <= reserved <= balances[meta["cuenta_respaldo"]], True)
        if delta["asset.investment"] and not delta["income.investment_valuation"]:
            purchase = delta["asset.investment"]
            check(item, "investment_purchase", purchase,
                  number(investment["unidades_compradas"]) * number(investment["precio_compra"]))
            cost += purchase
            units += purchase / number(investment["precio_compra"])

    item = stage("closing")
    check(item, "all_closing_accounts", balances.copy(),
          {k: number(v) for k, v in f["saldos_cierre_por_cuenta"].items()})
    check(item, "investment_market_value", balances["asset.investment"],
          units * number(investment["precio_valuacion_cierre"]))
    valuation = balances["income.investment_valuation"]
    income, expenses = total("income.") - valuation, total("expense.")
    check(item, "valuation_above_historical_cost", valuation, balances["asset.investment"] - cost)
    check(item, "net_worth_movement", net_worth() - opening_net, income - expenses + valuation)
    check(item, "cash_movement", liquidity() - opening_liquidity, sum(flows.values(), ZERO))
    budgets = {k: number(v) for k, v in f["presupuestos"].items()}
    check(item, "budget_categories", sorted(budgets), sorted(k for k in balances if k.startswith("expense.")))
    consumed = sum((balances[k] for k in budgets), ZERO)
    budget = sum(budgets.values(), ZERO)
    actual = {"cuentas": {k: balances[k] for k in sorted(LIQUID)},
              "efectivo_total": liquidity(), "activos_total": total("asset."),
              "pasivos_total": total("liability."), "patrimonio_neto": net_worth(),
              "ingresos_ordinarios_y_financieros_sin_valorizacion": income, "gastos": expenses,
              "excedente_antes_de_valorizacion": income - expenses, "ganancia_no_realizada": valuation,
              "resultado_total": income - expenses + valuation,
              "prestamo_bancario": balances["liability.bank_loan"], "tarjeta": balances["liability.credit_card"],
              "prestamo_familiar": balances["liability.family_loan"], "prestamo_por_cobrar": balances["asset.loan_receivable"],
              "inversion_valor_mercado": balances["asset.investment"], "inversion_costo": cost, "acciones": units,
              "dividendos": balances["income.dividend"], "presupuesto": budget,
              "presupuesto_consumido": consumed, "presupuesto_disponible": budget - consumed,
              "meta_objetivo": number(meta["objetivo"]), "meta_asignada": reserved,
              "meta_progreso_pct": reserved * 100 / number(meta["objetivo"]),
              **{f"flujo_efectivo_{k}": v for k, v in flows.items()},
              "flujo_efectivo_neto": sum(flows.values(), ZERO)}
    expected = {k: ({a: number(v) for a, v in value.items()} if isinstance(value, dict) else number(value))
                for k, value in f["resultado_esperado"].items()}
    check(item, "all_result_fields", actual, expected)
    for item in report["stages"]:
        item["status"] = "PASS" if all(c["status"] == "PASS" for c in item["checks"]) else "FAIL"
    report["status"] = "PASS" if all(s["status"] == "PASS" for s in report["stages"]) else "FAIL"
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", required=True, help="Authoritative reference JSON (read only)")
    parser.add_argument("--output", required=True, help="Write PASS/FAIL JSON evidence; app acceptance remains NOT_RUN")
    args = parser.parse_args()
    try:
        report = validate(load_fixture(args.fixture))
    except (ValueError, KeyError, TypeError, ArithmeticError) as error:
        report = {"reference_only": True, "application_acceptance": "NOT_RUN",
                  "status": "FAIL", "error": str(error)}
    Path(args.output).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: report[k] for k in ("status", "reference_only", "application_acceptance")}))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
