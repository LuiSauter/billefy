# Loan Engine Specification

This document defines how the loan engine calculates schedules, late interest, payment allocation, and the effective annual rate (TEA). It is the reference for the server implementation and for any client implementation. The golden vectors at the end are mandatory test cases.

The class design is in `diagrams/09-clases-motor-prestamos.puml`. The lifecycle is in `diagrams/07-estados-prestamo.puml`.

> The app records and calculates the terms the user chooses. It does not give legal advice or limit interest rates. See ADR-016 in [DECISIONS.md](DECISIONS.md).

## 1. Principles

1. All amounts use `decimal`. No floating point, except the informational TEA solver (section 7).
2. The **server** generates and stores schedules. Clients may preview through the API.
3. A schedule is deterministic: the same inputs always give the same output.
4. Terms are immutable after activation. Changes create a new loan.
5. The user sees the full schedule, the total interest, and the TEA before saving.

## 2. Inputs

| Parameter | Type | Notes |
|---|---|---|
| `template` | enum | One of the six templates in section 4 |
| `principal` | decimal | Greater than 0, in the loan's currency |
| `rate` | decimal | Nominal rate as a fraction (`0.02` means 2%) |
| `rate_unit` | `monthly` or `annual` | Unit of `rate` |
| `day_count` | `THIRTY_360` or `ACTUAL_365` | See section 3 |
| `frequency` | `monthly`, `biweekly`, `weekly`, `single` | Installment frequency |
| `installments` | int | Number of installments (`1` for single payment) |
| `disbursement_date` | date | First due date is one period later |
| `compounding` | frequency | Only for `SINGLE_PAYMENT_COMPOUND`; default `monthly` |
| `grace_days` | int | Days after the due date before late interest applies |
| `late_rate` | decimal, optional | Same unit and day count as `rate`; none means no late interest |
| `allocation_order` | enum | Default `LATE_INTEREST_INTEREST_PRINCIPAL` |
| `early_payment_policy` | enum | Default `ADVANCE_INSTALLMENTS` |

Validation: `principal > 0`, `rate >= 0`, `installments >= 1`, `grace_days >= 0`, and the combinations in section 4.

## 3. Conventions

### 3.1 Frequencies and due dates

| Frequency | Nominal period | Due dates |
|---|---|---|
| `monthly` | 30 days (`THIRTY_360`) | Same day of the month; if the month is shorter, the last day |
| `biweekly` | 15 days | Every 15 days (twice a month) |
| `weekly` | 7 days | Every 7 days |
| `single` | Disbursement to maturity | One due date |

### 3.2 Periodic rate

Convert the stated rate to a daily rate first.

| Day count | Monthly rate | Annual rate |
|---|---|---|
| `THIRTY_360` | `daily = rate / 30` | `daily = rate / 360` |
| `ACTUAL_365` | `daily = rate * 12 / 365` | `daily = rate / 365` |

Then the periodic rate is `i = daily * days_in_period`.

- Under `THIRTY_360`, `days_in_period` is the nominal period (30, 15, or 7). For a monthly rate and monthly installments, `i = rate`. For an annual rate and monthly installments, `i = rate / 12`.
- Under `ACTUAL_365`, `days_in_period` is the actual number of days between consecutive due dates.

### 3.3 Where each day count applies

`ACTUAL_365` is available only for `SIMPLE_ON_BALANCE`, `INTEREST_ONLY`, and late interest. `NO_INTEREST`, `FLAT_ON_INITIAL_CAPITAL`, `FIXED_INSTALLMENT`, and `SINGLE_PAYMENT_COMPOUND` use `THIRTY_360` nominal periods, because their formulas assume a constant periodic rate.

### 3.4 Rounding

- Scale: the currency's minor unit (2 decimals for BOB and USD).
- Mode: half away from zero (`MidpointRounding.AwayFromZero`).
- Round each interest amount and each principal portion to the scale.
- **The last installment absorbs the difference** so that the principal portions sum exactly to the principal.

## 4. Templates

Notation: `P` principal, `n` installments, `i` periodic rate, `B_k` outstanding balance after installment `k` (`B_0 = P`), `I_k` interest, `C_k` principal portion, `T_k` installment total.

### 4.1 `NO_INTEREST`

```text
C_k = round(P / n)  for k < n        C_n = P - sum(C_1..C_{n-1})
I_k = 0
T_k = C_k
```

### 4.2 `FLAT_ON_INITIAL_CAPITAL`

Simple interest on the initial principal for every period.

```text
I_k = round(P * i)
C_k = as in NO_INTEREST
T_k = C_k + I_k
Total interest = n * round(P * i)
```

### 4.3 `SIMPLE_ON_BALANCE` (fixed principal)

```text
C_k = as in NO_INTEREST
I_k = round(B_{k-1} * i)
T_k = C_k + I_k
```

With `ACTUAL_365`, `i` uses the actual days of each period.

### 4.4 `FIXED_INSTALLMENT` (fixed installment, compound on balance)

```text
A   = P * i / (1 - (1 + i)^(-n))      if i > 0, else P / n
I_k = round(B_{k-1} * i)
T_k = round(A)                        for k < n
C_k = T_k - I_k                       for k < n
C_n = B_{n-1}                         T_n = C_n + I_n
```

### 4.5 `INTEREST_ONLY`

```text
I_k = round(B_{k-1} * i)   (the balance stays P until the end)
T_k = I_k                  for k < n
T_n = P + I_n              C_n = P
```

### 4.6 `SINGLE_PAYMENT_COMPOUND`

One installment at maturity. `m` is the number of whole compounding periods until maturity. `i_c` is the periodic rate for the compounding frequency (section 3.2).

```text
Total = round(P * (1 + i_c)^m)
Interest = Total - P
```

Maturity must be a whole number of compounding periods in the MVP.

### 4.7 Template compatibility

| Template | Day counts | Early-payment policies |
|---|---|---|
| `NO_INTEREST` | `THIRTY_360` | All three |
| `FLAT_ON_INITIAL_CAPITAL` | `THIRTY_360` | `ADVANCE_INSTALLMENTS` only |
| `SIMPLE_ON_BALANCE` | Both | All three |
| `FIXED_INSTALLMENT` | `THIRTY_360` | All three |
| `INTEREST_ONLY` | Both | `ADVANCE_INSTALLMENTS`, `REDUCE_INSTALLMENT` |
| `SINGLE_PAYMENT_COMPOUND` | `THIRTY_360` | `ADVANCE_INSTALLMENTS` only (partial payments apply to the single installment) |

## 5. Late interest

Late interest is simple (never compounded) and accrues on the **overdue principal** of unpaid installments.

```text
days_late      = max(0, payment_date - (due_date + grace_days))
late_interest  = round(overdue_principal * late_daily_rate * days_late)
```

`late_daily_rate` follows section 3.2 using `late_rate`, `rate_unit`, and `day_count`. If `late_rate` is not set, late interest is zero. Late interest is calculated when a payment is registered and whenever the schedule is displayed.

## 6. Payment allocation

1. Order installments by due date, oldest first.
2. For each installment with an outstanding amount, apply the payment in the configured order. Default `LATE_INTEREST_INTEREST_PRINCIPAL`: late interest, then interest, then principal.
3. When one installment is fully covered, continue with the next overdue installment, then with the current one.
4. A payment that does not cover an installment leaves it `partially_paid`. The loan stays `in_arrears` while any installment is overdue.
5. An amount that remains after all due installments is handled by the **early-payment policy**:
   - `ADVANCE_INSTALLMENTS`: pays future installments in due-date order; a partial amount marks the next installment partially paid. No recalculation.
   - `REDUCE_TERM`: applies the amount to the outstanding principal, keeps the installment amount, and removes installments from the end.
   - `REDUCE_INSTALLMENT`: applies the amount to the outstanding principal, keeps the number of installments, and recalculates the remaining installments.
6. Early principal reductions take effect at the next due date. No partial-period interest is charged in the MVP.
7. A payment larger than the total outstanding balance (including late interest) is rejected.
8. The allocation is stored in `payment_allocations` (late interest, interest, and principal per installment). Registering a payment runs in one database transaction that locks the loan row.

## 7. Effective annual rate (TEA)

The TEA is informational and shows the real cost to the user. It is calculated from the cash flows seen by the lender: `-P` at disbursement and each installment total on its due date.

**Regular schedules.** Solve for the periodic internal rate of return `y`:

```text
sum over k of ( T_k / (1 + y)^k ) = P
TEA = (1 + y)^(periods_per_year) - 1
periods_per_year: monthly = 12, biweekly = 24, weekly = 52
```

**Single payment.**

```text
TEA = (Total / P)^(365 / days) - 1        days = maturity_date - disbursement_date
```

The solver may use `double` internally (bisection or Newton with a tolerance of 1e-12). Round the result to 6 decimal places. The TEA never feeds a balance.

## 8. Output

```text
Schedule
  installments: [ { number, due_date, principal, interest, total, balance_after } ]
  total_interest
  total_to_pay
  tea
```

## 9. Golden vectors

All amounts are in a currency with 2 decimals. Every implementation must reproduce these values exactly.

### Vector A: no interest

Inputs: `P = 1000`, `n = 3`.

| k | Principal | Interest | Total |
|---|---|---|---|
| 1 | 333.33 | 0.00 | 333.33 |
| 2 | 333.33 | 0.00 | 333.33 |
| 3 | 333.34 | 0.00 | 333.34 |

### Vector B: flat on initial capital

Inputs: `P = 1000`, `i = 0.10` monthly, `n = 3`.

| k | Principal | Interest | Total |
|---|---|---|---|
| 1 | 333.33 | 100.00 | 433.33 |
| 2 | 333.33 | 100.00 | 433.33 |
| 3 | 333.34 | 100.00 | 433.34 |

Total interest: `300.00`. TEA: `4.003477` (about 400.35%). This vector shows why the app displays the TEA: a flat 10% monthly rate over three months is far more expensive than it looks.

### Vector C: simple on balance (fixed principal)

Inputs: `P = 1000`, `i = 0.05` monthly, `n = 4`.

| k | Principal | Interest | Total | Balance after |
|---|---|---|---|---|
| 1 | 250.00 | 50.00 | 300.00 | 750.00 |
| 2 | 250.00 | 37.50 | 287.50 | 500.00 |
| 3 | 250.00 | 25.00 | 275.00 | 250.00 |
| 4 | 250.00 | 12.50 | 262.50 | 0.00 |

Total interest: `125.00`. TEA: `0.795856`.

### Vector D: fixed installment

Inputs: `P = 1000`, `i = 0.02` monthly, `n = 12`. `A` unrounded: `94.5595966...`, rounded: `94.56`.

| k | Principal | Interest | Total | Balance after |
|---|---|---|---|---|
| 1 | 74.56 | 20.00 | 94.56 | 925.44 |
| 2 | 76.05 | 18.51 | 94.56 | 849.39 |
| 3 | 77.57 | 16.99 | 94.56 | 771.82 |
| 11 | 90.89 | 3.67 | 94.56 | 92.69 |
| 12 | 92.69 | 1.85 | 94.54 | 0.00 |

Sum of principal: `1000.00`. Total interest: `134.70`. TEA: `0.268242`. Installments 4 to 10 are computed with the same formulas and must be included in the full test.

### Vector E: interest only

Inputs: `P = 1000`, `i = 0.03` monthly, `n = 3`.

| k | Principal | Interest | Total |
|---|---|---|---|
| 1 | 0.00 | 30.00 | 30.00 |
| 2 | 0.00 | 30.00 | 30.00 |
| 3 | 1000.00 | 30.00 | 1030.00 |

TEA: `0.425761`.

### Vector F: single payment with compound interest

Inputs: `P = 1000`, `i_c = 0.02` monthly compounding, `m = 6`, disbursement on 2026-01-01, maturity on 2026-07-01 (181 days).

Total to pay: `1126.16` (unrounded `1126.162419264`). Interest: `126.16`. TEA: `(1126.16 / 1000)^(365 / 181) - 1 = 0.270736`, calculated from the rounded total.

### Vector G: late interest

Inputs: overdue principal `250.00`, `late_rate = 0.03` monthly, `THIRTY_360`, 10 days late after the grace days.

`late_daily_rate = 0.03 / 30 = 0.001`. Late interest: `250.00 * 0.001 * 10 = 2.50`.

### Vector H: payment allocation

Use Vector C. Installment 1 (total `300.00`) is overdue with `grace_days = 0`, and the loan has `late_rate = 0.03` monthly. The user pays `100.00` ten days after the due date.

- Late interest: `250.00 * 0.001 * 10 = 2.50`.
- Allocation order: late interest `2.50`, interest `50.00`, principal `47.50`.
- Installment 1 becomes `partially_paid`; remaining principal for that installment: `202.50`.
- The loan is `in_arrears`.

## 10. Test requirements

- Every vector above is a unit test, shared as data files (JSON) used by the server tests and by any client engine.
- Property tests: the sum of principal portions equals `P`; balances never go negative; the last balance is exactly zero; interest is never negative; schedules are deterministic.
- Boundary tests: `n = 1`, `i = 0`, very small and very large principals, month-end due dates, leap years, and currencies with different scales.
- Allocation tests: partial payments, several overdue installments, early payments with each policy, payment above the total (rejected), and concurrent payments on the same loan.
