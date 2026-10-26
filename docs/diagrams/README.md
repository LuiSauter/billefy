# Diagrams

PlantUML diagrams (UML 2.5) for the Personal Finance Manager. The diagrams use Spanish labels and table names. Code and database use English names; the mapping is in [../DOMAIN_GLOSSARY.md](../DOMAIN_GLOSSARY.md).

## Index

| File | Type | Content |
|---|---|---|
| `01-casos-de-uso.puml` | Use cases | Actors and functions of the system |
| `02-componentes.puml` | Components | Layers, interfaces, ports and adapters |
| `03-despliegue.puml` | Deployment | Devices, containers, storage, external services |
| `04-modelo-de-datos.puml` | Entity-relationship | Tables, keys, relationships, and design notes |
| `05-secuencia-ingesta.puml` | Sequence | Notification capture to confirmed transaction, with deduplication |
| `06-estados-borrador.puml` | State machine | Lifecycle of an event and its draft |
| `07-estados-prestamo.puml` | State machine | Lifecycle of loans and installments |
| `08-secuencia-bot-whatsapp.puml` | Sequence | Linking and registering movements by WhatsApp |
| `09-clases-motor-prestamos.puml` | Class | Loan engine design (strategy pattern) |

## Planned

Sequence diagrams for the remaining use cases (sign-in, account deletion, accounts, manual transactions, statement import, Binance sync, exchange rates, draft review, loans, payments, acceptance, budgets and goals, dashboard, alerts) are not generated yet. Notification capture and the WhatsApp bot are already covered by diagrams 05 and 08.

## How to render

- Online: paste a file into the PlantUML web server.
- VS Code: use a PlantUML extension and preview.
- Command line: `java -jar plantuml.jar -tsvg *.puml` (Graphviz required).

The diagrams were written by hand and have not been rendered by a PlantUML engine yet. If one fails to render, fix the syntax and keep the diagram in sync with [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Keeping diagrams current

Update the affected diagram in the same pull request that changes behavior or structure. Diagram 04 must match the migrations; diagram 02 must match the module list in the architecture document.
