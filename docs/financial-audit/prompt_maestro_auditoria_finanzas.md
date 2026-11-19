# PROMPT MAESTRO — AUDITORÍA Y CORRECCIÓN CONTABLE DE MI APP DE FINANZAS PERSONALES

## Tu misión
Actúa simultáneamente como (1) contador financiero experto en contabilidad de partida doble, conciliación y estados financieros, (2) arquitecto senior de software financiero, (3) ingeniero backend y de bases de datos, (4) especialista en calidad y pruebas automatizadas, y (5) auditor de seguridad de aplicaciones que manejan datos financieros.

YA EXISTE una aplicación implementada. No la rediseñes desde cero ni supongas que está bien. Inspecciona el repositorio real, sus entidades, migrations, servicios, endpoints, UI, reportes, pruebas y reglas de negocio. Comprueba cada conclusión con código y pruebas. No inventes archivos, modelos ni resultados. Identifica el stack efectivo antes de proponer cambios.

Objetivo final: una aplicación personal internamente consistente donde cada operación se refleja exactamente una vez en las cuentas, movimientos, deudas/acreencias, inversiones, patrimonio, presupuestos, metas y pagos recurrentes. La interfaz debe ser fácil para usuarios sin conocimientos contables, pero el motor debe tener trazabilidad profesional. No afirmes cumplimiento legal o NIIF completo; usa principios contables como criterios de diseño y documenta políticas simplificadas.

## Alcance obligatorio
Audita conjuntamente: (A) cuentas — efectivo, bancos, billeteras, ahorro, tarjetas, cuentas de inversión y multimoneda; (B) movimientos — ingresos, gastos, transferencias, ajustes, reversos, saldos de apertura; (C) inversiones — órdenes, posiciones, bases de costo, valoración, dividendos, comisiones, ganancia realizada/no realizada; (D) patrimonio — activos financieros, activos personales, pasivos, evolución histórica; (E) deudas propias y cuotas — préstamo bancario, familiar, tarjetas, intereses, amortización, vencimientos, pagos anticipados; (F) dinero que presté — cuentas por cobrar, desembolsos, recuperaciones, intereses, morosidad e incobrables; (G) presupuestos por categoría y período; (H) metas y fondos etiquetados; (I) pagos recurrentes, ocurrencias, notificaciones e idempotencia; (J) dashboards y reportes; (K) seguridad, exportación y reconciliación.

## Política contable central no negociable
1. Activo = Pasivo + Patrimonio neto. Cada transacción contabilizada es atómica y balanceada: SUM(debe) = SUM(haber) por moneda/base contable; si hay FX, guardar importes originales, tipos y conversiones verificables.
2. Modelar asientos y líneas de libro mayor (o demostrar formalmente una abstracción equivalente) como fuente de verdad. Los demás módulos son vistas/proyecciones del mismo evento y no deben inventar saldos autónomos. Los saldos de apertura se llevan a patrimonio inicial, NO al ingreso mensual.
3. Elegir y documentar criterio de devengo para resultado y criterio de cobros/pagos para flujo de efectivo. Mostrar ambos separadamente. Un gasto con tarjeta nace al comprar; pagar capital de tarjeta no es otro gasto. Si existen transacciones pendientes, definir exactamente cuándo impactan o no el libro.
4. Transferencia entre cuentas propias: mueve activos y no crea ingreso/gasto/patrimonio. Retirar efectivo de un banco tampoco es gasto. Cargos reales, impuestos y comisiones van separados.
5. Recibir un préstamo aumenta efectivo y deuda; prestar dinero aumenta cuentas por cobrar y reduce efectivo; pagar/recuperar capital reduce la obligación/derecho, no modifica el resultado. Solo intereses/comisiones devengados son ingresos/gastos financieros. En cuotas: separar capital, interés y otros cargos.
6. Compra de inversión = intercambio de activos, no gasto de consumo; mantener número de unidades, costo por lote o método elegido y fecha/precio de referencia. Ganancias no realizadas: cambios de valoración separados y sin efectivo; al vender, registrar efectivo, baja de unidades/costo y resultado realizado SIN duplicar ganancias que ya fueron contabilizadas. Definir política explícita de medición/fees/dividendos y método de costo FIFO/promedio.
7. Meta = asignación/etiqueta de recursos existentes; crearla o alimentarla no incrementa activos ni patrimonio. Evitar sumar una meta al dinero ya depositado en la cuenta que la respalda; impedir reservas superiores a recursos elegibles salvo permiso explícito y estado descubierto.
8. Presupuesto = plan. Crear o editar un presupuesto no afecta cuentas ni patrimonio. El consumo de categoría se genera por gastos reconocidos conforme a la política del período, incluyendo compras a crédito; nunca por transferencias, cuotas de capital, ahorro o inversiones, salvo que el producto tenga una vista separada de 'plan de flujo de caja'.
9. Pago recurrente = plantilla/programación; no contabilizar por crear, editar o notificar. Solo ocurrencias efectivamente registradas/devengadas bajo la política adoptada generan asientos; evitar duplicados mediante clave de idempotencia e identificación única de ocurrencia. Distinguir programado, debido, pagado, atrasado, cancelado y omitido.
10. Patrimonio neto = TODOS los activos reconocidos menos TODOS los pasivos; inversiones y cuentas por cobrar incluidas una vez. Valoración de bienes personales debe indicar método/fecha, permitir degradación y distinguir estimación de saldo bancario.
11. No usar float/double para dinero; usar NUMERIC/DECIMAL o unidades menores enteras con escalas y reglas documentadas. Precisiones distintas para moneda, unidades de inversión y cotizaciones. Redondeo determinista y pruebas de centavos. No usar precio actual para reescribir el costo histórico.
12. En multimoneda guardar currency de origen, importe de origen, tipo de cambio aplicado con fecha/fuente, moneda de reporte y diferencia cambiaria por separado; no asumir tipo de cambio sin fuente o política. Considerar zonas horarias, fecha efectiva, fecha de registro y cierre.
13. No editar/eliminar silenciosamente hechos publicados: usar reversos y nuevos asientos o una política de corrección auditable. Histórico reproducible a cualquier fecha. Transacciones y eventos deben tener identidad estable y pertenecer al usuario/tenant correcto.
14. Cada total del dashboard debe permitir 'drill down' hasta los asientos de origen. La reconciliación con extractos y la detección de duplicados deben contemplar operaciones importadas o repetidas.

## Primera fase: inspección real
Mapea la arquitectura, esquema de datos, rutas HTTP, lógica de saldos, control de estados, modelos de inversión, préstamo/deuda, presupuesto, metas y recurrencia. Produce un diagrama textual: acción del usuario -> dominio -> transacción DB -> asientos -> proyecciones -> reportes. Busca doble conteo, escrituras parciales, saldo cacheado incompatible, pérdida de centavos, saldos manuales que se contradicen, falta de reverso, transacciones concurrentes e importaciones duplicadas. Presenta hallazgos P0/P1/P2 con ubicación exacta, reproducción, impacto y arreglo propuesto. Distingue bugs comprobados de riesgos hipotéticos.

## Segunda fase: prueba de aceptación obligatoria (sin cambiar sus cifras)
Crea un entorno/usuario/DB de prueba aislado y reproduce el caso 'AUDITORIA_FINANZAS_PERSONALES_ENERO_2027'. Si se adjunta `caso_prueba_contable_enero_2027.json`, úsalo como fixture autoritativo completo: incluye saldos de apertura, partidas dobles, 21 eventos y expectativas después de cada paso. Si no está, usa la secuencia y resultados resumidos a continuación.

Moneda BOB. Apertura: banco 6000; efectivo 300; billetera 700; ahorro 4000; acciones 20 unidades a 100 = inversión 2000; laptop 3500; deuda bancaria 3000; deuda tarjeta 600; patrimonio de apertura 12900. Total activos 16500, pasivos 3600, liquidez 11000.

Presupuesto: vivienda 1400, alimentos 950, transporte 200, servicios 250, suscripciones 100, salud 150, interés deuda 50; total 3100. Meta fondo de emergencia 2000 con cero inicial.

21 movimientos, en orden: (1) salario +5000 banco; (2) trabajo extra +1200 banco; (3) banco->billetera 250; (4) banco->efectivo 200; (5) alquiler recurrente 1400 banco; (6) alimentos 550 banco; (7) alimentos 350 con tarjeta; (8) transporte 150 billetera; (9) luz 220 banco; (10) suscripción recurrente 80 banco; (11) salud 130 efectivo; (12) banco->ahorro 700 y etiqueta 700 a meta; (13) compra 5 acciones a 120 desde banco, total 600; (14) pago tarjeta 700 banco; (15) cuota de préstamo bancario 530 banco, 500 capital y 30 intereses; (16) préstamo otorgado 800 desde banco; (17) cobro amigo 320 banco: 300 capital + 20 intereses; (18) préstamo familiar recibido 900 banco; (19) devolución de capital familiar 100 banco; (20) dividendo cobrado 40 banco; (21) valoración de 25 acciones a precio 110, sin movimiento bancario (valor nuevo 2750, costo 2600, ganancia no realizada 150).

Resultados EXACTOS al cierre: banco 7330, efectivo 370, billetera 800, ahorro 4700, total liquidez 13200. Inversión 2750, laptop 3500, préstamo por cobrar 500, activos 19950. Deuda bancaria 2500, tarjeta 250, préstamo familiar 800, pasivos 3550. Patrimonio 16400. Ingresos cobrados/reconocidos no relacionados con valorización 6260 (salario 5000 + extra 1200 + interés recibido 20 + dividendos 40). Gastos 2910 (vivienda 1400, alimentos 900, transporte 150, servicios 220, suscripciones 80, salud 130, interés pagado 30). Excedente antes de valoración 3350, plusvalía no realizada 150, resultado total 3500, aumento patrimonio 3500. Presupuesto disponible 190 (2910/3100 = 93,8709677%). Meta reservada 700/2000 = 35%, sin doble contabilización. Flujo de caja: operaciones +3700, inversiones y crédito a amigo -1100, financiación -400, neto +2200; liquidez 11000+2200=13200.

Invariantes: activos-pasivos=patrimonio; patrimonio final-inicial = ingresos - gastos + resultados de valoración; debe=haber por asiento; no hay saldos negativos injustificados; crear la meta o programación recurrente sin pagar no cambia el patrimonio; transferencias, prestamos de capital, compra de inversión y pago de capital no son ingresos/gastos; el pago de tarjeta no duplica presupuesto; los cierres y vistas históricas se reproducen igual al consultar fechas anteriores.

## Tercera fase: batería adicional de pruebas y bordes
Escribe y ejecuta pruebas de unidad, integración, API y, cuando corresponda, extremo a extremo para:
- edición/anulación de transacciones contabilizadas, reverso, recontabilización, periodos cerrados y auditoría histórica;
- reintento de webhook, doble click, reintentos de recurrente, ejecución simultánea, idempotencia y rollback atómico;
- transferencia a cuenta propia, tarjeta, ahorros, metas, fondos reservados y conciliación de saldos;
- tarjeta de crédito con compras, pagos parciales, cuotas, intereses, devolución/reembolso y cierre de estado de cuenta;
- deudas activas, cuotas vencidas, pagos anticipados, amortizaciones, mora y cargos, con tablas que reconcilien capital pendiente;
- préstamos otorgados: desembolso, cobro parcial, interés, condonación y eventual deterioro/incobrabilidad de saldos;
- inversiones: compras sucesivas, ventas parciales, valorizaciones, dividendos, comisiones, costos históricos, plusvalía realizada/no realizada, ausencia de precios, activos ilíquidos;
- multimoneda con tasa histórica, tasa actual, compra/venta, diferencias de cambio, redondeos, límites de precisión;
- periodos con 28/29/30/31 días, cambio de año, fechas retroactivas y zona horaria;
- registros iniciales y migraciones de datos existentes sin fabricar ingresos históricos ni duplicar balances;
- presupuesto con categoría compartida entre medios de pago, transacciones pendientes y reembolsos;
- recurrencias reprogramadas/canceladas/vencidas/ejecutadas y ausencia de contabilización por recordatorio;
- controles de acceso por usuario/tenant, filtración cruzada, autorización, datos sensibles, logging, exportación y restauración.

## Cuarta fase: implementación de mejoras sin destruir información
Antes de cambios peligrosos, crea respaldo verificable de base de datos y un plan de rollback. Nunca ejecutes reset, truncate ni migrations destructivas en producción. Diseña migraciones aditivas cuando sea posible; haz backfill con controles y conciliación; después cambia lecturas/escrituras y elimina duplicados solo con evidencia. Mantén compatibilidad de API si es viable, documenta breaking changes. Usa transacciones de DB y controles de concurrencia adecuados. Todos los asientos deben ser reproducibles; ningún agregado cacheado debe reemplazar la verdad del libro mayor.

## Entregables y formato de respuesta
1. Mapa real del sistema existente con entidades, endpoints, pantallas y dependencias.
2. Tabla priorizada de hallazgos: severidad, módulo, evidencia (archivo/ruta/línea), escenario de reproducción, valor esperado vs obtenido, causa raíz y propuesta.
3. Contrato contable y matriz por tipo de operación: debe, haber, afectación de efectivo, resultados, presupuesto, meta, deuda/inversión y patrimonio.
4. Diseño mínimo de cambios de DB/APIs/servicios/UI; SQL o migraciones precisas si hacen falta.
5. Tests automatizados: ejecutar los 21 pasos, afirmar balances tras cada uno, comparar con el fixture y guardar evidencia PASS/FAIL; pruebas adicionales de bordes.
6. Correcciones realmente implementadas con archivos modificados, explicación y riesgos; no reportar como implementado lo que sea solo sugerencia.
7. Resultado final: activos 19950, pasivos 3550, patrimonio 16400, liquidez 13200, excedente antes de valoración 3350 y resultado total 3500; conciliaciones y reportes consistentes.
8. Registro de limitaciones, decisiones contables pendientes, pasos manuales de despliegue y plan de reversión.

## Forma de trabajo obligatoria
Primero haz diagnóstico y genera tests de referencia. Después corrige de forma incremental según severidad, ejecuta pruebas y muestra evidencia. No cambies lógica solo para que coincidan los totales: demuestra la partida correcta en cada evento. No fabriques resultados de pruebas, no borres datos de usuarios, no expongas secretos y no afirmes 'perfecto' sin evidencia. Cuando exista una ambigüedad contable, explica alternativas y propone una política explícita antes de implementarla. Si no tienes acceso al repositorio, indica exactamente qué falta para poder auditarlo; no simules que lo leíste.