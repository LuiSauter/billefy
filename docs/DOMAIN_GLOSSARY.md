# Domain Glossary

Shared vocabulary for product, design, code, and documentation. Use these terms consistently.

## 1. Terms

| Term | Meaning |
|---|---|
| Account | A place where the user keeps money: bank account, digital wallet, cash, or exchange. It has exactly one currency. |
| Base currency | The currency chosen at onboarding in which the user views totals. |
| View currency | The currency used to display a particular screen or report. Defaults to the base currency. |
| Local currency | The user's national currency (for example BOB). |
| Transaction | An immutable ledger entry that changes an account balance: income or expense. |
| Reversal | A transaction that cancels another (`reverses_id`). The only way to correct the ledger. |
| Transfer | Two linked transactions (out and in) between the user's own accounts. |
| Ledger | The set of all transactions. Balances are derived from it. |
| Balance | `initial_balance` plus the signed sum of an account's transactions. Never stored as a mutable value. |
| Category | A classification of transactions, such as food or transport. Hierarchical. |
| Template | A saved transaction pattern used for quick entry. |
| Raw event | A captured source item (for example a notification) before parsing. Its text is purged after 30 days. |
| Financial source | An app or channel the user accepted as a source of financial notifications. |
| Financial detector | On-device rules that decide whether a notification looks financial. |
| Draft | A proposed transaction created by an automatic channel. It needs user confirmation. |
| Review draft | A draft the system could not interpret; the user completes it manually. |
| Fingerprint | A hash identifying a movement for deduplication. |
| Deduplication | Preventing the same movement from becoming several drafts or transactions. |
| Idempotency key | A client-generated id that makes a request safe to retry. |
| Outbox | The device's local queue of writes waiting to be sent. |
| Parallel market | The informal exchange market. The only source of exchange rates in this product. |
| P2P | Peer-to-peer trading on Binance, used as the parallel-market source. |
| Buy rate | Price in local currency to **buy** one US dollar. Shown to users who hold local currency. |
| Sell rate | Local currency received when **selling** one US dollar. Shown to users who hold US dollars. |
| Rate snapshot | The rate and source stored with a transaction at creation time. |
| Stale rate | A rate older than the freshness threshold. Shown with a warning. |
| Manual rate | A rate typed by the user as a fallback. Scoped to that user. |
| Counterparty | The person on the other side of a loan. A record only; never contacted. |
| Loan | Money lent by the user ("lent") or borrowed by the user ("borrowed"), with terms and a schedule. |
| Template (loan) | A calculation scheme: no interest, flat, declining balance, fixed installment, interest-only, or single payment. |
| Installment | One scheduled payment of a loan, with principal and interest. |
| Schedule | The ordered list of installments of a loan. |
| TEA | Effective annual rate (APR). Informational. |
| Late interest | Interest charged on overdue amounts after grace days. |
| Grace days | Days after the due date before late interest applies. |
| Allocation order | The order in which a payment covers late interest, interest, and principal. |
| Early-payment policy | How an extra payment is handled: reduce term, reduce installment, or advance installments. |
| Acceptance | The counterparty's agreement to the loan terms, recorded manually by the user. |
| Forgiveness | The user waives the remaining balance of a loan. |
| Budget | A spending limit per category and period. |
| Goal | A savings target with an optional date. |
| Financial health indicators | Savings rate, emergency-fund coverage, and debt load. |
| Bot | The WhatsApp assistant. It only replies to messages from linked users. |
| Link (WhatsApp) | The verified association between a user and a WhatsApp number. |
| Gateway | The port (`IMessagingGateway`) behind which the WhatsApp provider is hidden. |
| Workspace | A future shared space for several users. |

## 2. Naming map: diagram labels to code

The PlantUML diagrams use Spanish labels. Code, database, API, and logs use English. English names are authoritative.

### 2.1 Tables

| Diagram (Spanish) | Code and database (English) |
|---|---|
| usuario | users |
| identidad_externa | external_identities |
| sesion | sessions |
| dispositivo | devices |
| preferencia_notificacion | notification_preferences |
| notificacion | notifications |
| vinculo_whatsapp | whatsapp_links |
| mensaje_whatsapp | whatsapp_messages |
| integracion_binance | binance_integrations |
| auditoria | audit_log |
| cuenta | accounts |
| categoria | categories |
| movimiento | transactions |
| plantilla_movimiento | transaction_templates |
| tasa_cambio | exchange_rates |
| fuente_financiera | financial_sources |
| evento_crudo | raw_events |
| borrador | drafts |
| borrador_evento | draft_events |
| importacion | imports |
| contraparte | counterparties |
| prestamo | loans |
| cuota | installments |
| pago | payments |
| aplicacion_pago | payment_allocations |
| presupuesto | budgets |
| meta | goals |

### 2.2 Common columns

| Diagram (Spanish) | Code and database (English) |
|---|---|
| usuario_id | user_id |
| saldo_inicial | initial_balance |
| moneda | currency |
| moneda_base | base_currency |
| monto | amount |
| sentido | direction |
| fecha_operacion | occurred_at |
| descripcion | description |
| fuente | source |
| tasa_aplicada | applied_rate |
| tasa_fuente | rate_source |
| referencia_externa | external_reference |
| clave_idempotencia | idempotency_key |
| revierte_id | reverses_id |
| transferencia_id | transfer_id |
| huella | fingerprint |
| estado | status |
| creado_en | created_at |
| eliminado_en | deleted_at |
| capital | principal (for loans) |
| tasa | rate |
| unidad_tasa | rate_unit |
| base_dias | day_count |
| frecuencia | frequency |
| capitalizacion | compounding |
| dias_gracia | grace_days |
| tasa_mora | late_rate |
| orden_imputacion | allocation_order |
| politica_adelanto | early_payment_policy |
| aceptado_por_contraparte | accepted_by_counterparty |
| aceptado_en | accepted_at |
| vence_el | due_date |
| interes | interest |
| saldo_despues | balance_after |
| a_mora | to_late_interest |
| a_interes | to_interest |
| a_capital | to_principal |
| clave_dedup | dedup_key |
| purgar_despues_de | purge_after |
| texto_enmascarado | masked_text |
| hash_archivo | file_hash |
| umbral_alerta | alert_threshold |

### 2.3 Enumerations

| Concept | Values (English) |
|---|---|
| Transaction direction | `income`, `expense` |
| Transaction source | `manual`, `notification`, `whatsapp`, `statement`, `binance`, `loan` |
| Account type | `bank`, `wallet`, `cash`, `exchange` |
| Draft status | `received`, `parsing`, `review`, `pending`, `duplicate`, `confirmed`, `discarded` |
| Loan role | `lender`, `borrower` |
| Loan template | `NO_INTEREST`, `FLAT_ON_INITIAL_CAPITAL`, `SIMPLE_ON_BALANCE`, `FIXED_INSTALLMENT`, `INTEREST_ONLY`, `SINGLE_PAYMENT_COMPOUND` |
| Loan status | `pending_acceptance`, `active`, `in_arrears`, `paid`, `forgiven`, `canceled` |
| Installment status | `pending`, `overdue`, `partially_paid`, `paid`, `forgiven` |
| Rate unit | `monthly`, `annual` |
| Day count | `THIRTY_360`, `ACTUAL_365` |
| Frequency | `monthly`, `biweekly`, `weekly`, `single` |
| Allocation order | `LATE_INTEREST_INTEREST_PRINCIPAL`, `INTEREST_PRINCIPAL_LATE_INTEREST` |
| Early-payment policy | `REDUCE_TERM`, `REDUCE_INSTALLMENT`, `ADVANCE_INSTALLMENTS` |
| Rate side | `buy`, `sell` |
| Rate source | `binance_p2p`, `manual` |
| Link status | `pending`, `active`, `revoked` |
| Draft source | `notification`, `whatsapp`, `statement`, `binance` |

Note: the diagram `09-clases-motor-prestamos.puml` uses the Spanish enum names (`AdelantarCuotas` corresponds to `ADVANCE_INSTALLMENTS`).
