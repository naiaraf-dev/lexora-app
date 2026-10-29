# Cambios en la base de datos — resumen para el equipo

Este archivo explica, en lenguaje simple, cada script de esta carpeta: qué cambia en la base, por qué y cómo volver atrás. El SQL está en cada script; acá no se repite.

Reglas que siguen todos los scripts:

- **Solo agregan**: tablas, columnas (que admiten NULL o tienen un valor por defecto) y datos de catálogos. No borran ni renombran nada. Si alguno se aparta de esta regla, lo dice explícitamente.
- **Son idempotentes**: antes de crear algo preguntan si ya existe, así que correrlos dos veces no rompe nada ni duplica datos.
- **Corren en una sola transacción**: si un paso falla, se deshace todo el script.
- Se ejecutan en orden (001, 002, …) con `sqlcmd -b -f 65001 -i <script>` o desde SSMS en "Modo SQLCMD".

---

## 001_prevision_etapa1.sql — 19/10/2026

Módulo **Previsión y pago**, etapa 1 (flujo base: alta, registrar, liquidaciones, impulso y pagos con comprobante). Referencia: *Lexora — Previsión y pago — Documento técnico v1.3*.

Antes de aplicarlo se hizo un backup completo verificado: `lexora_antes_prevision_20261019.bak`, en la carpeta de backups de la instancia.

### Qué cambia

**Tabla nueva**
- `tipoobligacion`: catálogo con 7 valores (Sentencia, Regulación de honorarios, Acuerdo, Costas, Multa, Depósito de queja, Otro).
- `impulsoprevision`: cada solicitud de pago que se le hace a la Administración del cliente (fecha, monto, si es por una diferencia, nota adjunta y observaciones).

**Columnas nuevas**
- `prevision`: `tipo_obligacion` (vínculo con el catálogo nuevo), `intereses_estimados`, `activo` y auditoría (quién y cuándo creó o modificó).
- `liquidacion`: `numero`, `capital`, `intereses`, `otros`, `detalle_calculo`, `activo` y auditoría.
- `pagoprevision`: `documento` (el comprobante), `activo` y auditoría.
- `documento`: `prevision`, para saber a qué previsión pertenece un archivo.
- `tipoestadoexpediente`: `habilita_prevision` (sí/no).

**Columnas modificadas** (excepción aprobada a la regla de solo agregar)
- `tasa_valor` en `prevision`, `liquidacion` y `prevision_item` pasa de obligatoria a opcional. Solo relaja la restricción; no cambia ningún dato.

**Catálogos ampliados**
- `tipodocumento`: se suman Resolución, Liquidación, Nota, Comprobante de pago, Factura y Proveído. Sentencia y Notificación ya existían y se reutilizan.

### Por qué

| Cambio | Para qué lo necesita el módulo | Documento técnico |
|---|---|---|
| `tipoobligacion` y `prevision.tipo_obligacion` | El alta pide el tipo de obligación (sentencia, honorarios, costas…) y el listado filtra por él | Sección 4 (modelo de datos) |
| `prevision.intereses_estimados` | Los intereses del alta los ingresa el abogado (por ejemplo, desde la calculadora del CPACF): monto previsto = monto base + intereses estimados. Se guardan para mostrar el desglose y poder editarlos | Sección 2. Decisión del equipo: los intereses se ingresan, no se calculan con una fórmula |
| Desglose de `liquidacion` | Cada liquidación muestra capital, intereses, otros y total, con número correlativo. El sistema valida que capital + intereses + otros = total | Sección 4 |
| `tasa_valor` opcional | La tasa vigente se trae del CPACF solo como referencia. Algunas tasas (las "calculadoras", como indemnización por despido) no publican un valor, y el CPACF puede no responder. En esos casos se guarda vacío en lugar de inventar un número | Decisión del equipo (19/10/2026) |
| `impulsoprevision` | En modo Activo, el pago se registra después de pedirle los fondos a la Administración del cliente (estado Impulsado) | Secciones 2, 5 y 6 |
| `pagoprevision.documento` y `documento.prevision` | El comprobante de pago (y la nota del impulso) se sube como un documento más del expediente y aparece en la pestaña Documentos como "Previsión: …" | Sección 8 |
| `habilita_prevision` | "Nueva previsión" solo se habilita en los estados del expediente que define el Excel de estados y tareas | Sección 3 |
| `activo` y auditoría | Pagos y liquidaciones cargados por error se anulan (no se borran), y queda registrado quién hizo cada cosa | Secciones 1 y 4 |
| Tipos de documento nuevos | Cada archivo de la previsión se clasifica (nota, comprobante, factura, proveído…) | Sección 8 |

### Datos existentes que toca

- **`tipoestadoexpediente`**: la columna nueva se agrega en las 85 filas con valor "no" y después se marcan "sí" **21 filas**:
  - las cuatro demandas (Civil y Laboral, Parte Actora y Parte Demandada) en Sentencia 2° instancia favorable, Sentencia 2° instancia desfavorable, Recurso extraordinario federal y Ejecución de sentencia (16 filas);
  - Acuerdo extrajudicial en Lanzamientos, Recuperos, Reclamo a contratistas, Cobro de cánones y Ejecución de póliza (5 filas).
  Lanzamientos judicializados queda en "no", como pide el documento.
- **`documento`**: sus 9 filas reciben la columna nueva vacía. No cambia nada más.
- **`tipodocumento`**: se agregan 6 filas; las existentes no se tocan.
- Las tablas de previsión estaban vacías al momento del cambio.
- **No borra ni renombra nada.**

### Idempotencia y cómo revertirlo

- **Idempotente**: sí. Si se corre de nuevo, no crea nada que ya exista y no vuelve a cargar catálogos. Al final controla que haya exactamente 21 filas habilitadas; si no, se deshace todo.
- **Aplicado** el 19/10/2026 en la base de desarrollo. Se corrió una segunda vez para comprobar la idempotencia: terminó sin errores y sin cambios.
- **Nota para quien lo ejecute con sqlcmd**: el script fija `QUOTED_IDENTIFIER ON` porque lo exige el índice de `documento.prevision`, y sqlcmd lo trae apagado por defecto. Un primer intento sin esa línea falló y la transacción se deshizo completa: la base quedó como estaba.
- **Revertir, opción simple**: restaurar el backup `lexora_antes_prevision_20261019.bak` (se pierde lo cargado después).
- **Revertir a mano, sin perder otros datos**: en orden inverso, quitar las 6 filas nuevas de `tipodocumento` (si ningún documento las usa), la columna `habilita_prevision`, la columna `documento.prevision` con su índice, la tabla `impulsoprevision`, las columnas nuevas de `pagoprevision`, `liquidacion` y `prevision`, y la tabla `tipoobligacion`. Antes de quitar cada columna hay que quitar su restricción (todas tienen nombre: `DF_…`, `FK_…`, `IX_…`). Volver `tasa_valor` a obligatoria solo es posible si ninguna fila quedó vacía.

---

## 002_prevision_etapa2.sql — 19/10/2026

Módulo **Previsión y pago**, etapa 2 (bloque B: acreditación, intimación, cierre, prorrateo, factura de honorarios e historial). Requiere el script 001.

### Qué cambia

**Tablas nuevas** (todas con su vínculo a `prevision`)
- `acreditacion`: cada vez que el juzgado tiene por acreditado el pago (fecha, proveído adjunto, si ordena notificar y la tarea de notificación que se generó).
- `intimacionprevision`: cada intimación de pago (fecha de notificación, vencimiento, "bajo apercibimiento de", cédula o proveído, tarea de vencimiento y observaciones). El vencimiento no puede ser anterior a la notificación.
- `prorrateo`: datos del prorrateo del art. 730 (aprobado, verificado, fecha, resolución, base, honorarios sujetos, coeficiente y monto prorrateado). Uno por previsión.
- `facturahonorarios`: la factura del profesional (nombre, monto, fecha y archivo). Una por previsión.
- `historialprevision`: el registro de todo lo que se hizo en la previsión (acción, detalle legible, estado en que quedó, quién y cuándo).

Las tablas de movimientos (`acreditacion`, `intimacionprevision`) y las de datos (`prorrateo`, `facturahonorarios`) llevan auditoría (quién y cuándo creó o modificó). Las de movimientos también tienen `activo`, para anular sin borrar.

**No modifica ninguna tabla ni columna existente** y no carga catálogos.

### Por qué

| Cambio | Para qué lo necesita el módulo | Documento técnico |
|---|---|---|
| `acreditacion` | Pasar de Pagado a Acreditado. Si el proveído ordena notificar, se crea una tarea en la Agenda (vence a los 5 días) y la previsión no se puede cerrar hasta cumplirla | Secciones 4, 5 y 6 (paso 6); casos P-26 a P-28 |
| `intimacionprevision` | Registrar la intimación de pago sin cambiar el estado; crea la tarea "Vence intimación de pago" y alimenta las marcas "Intimación vigente / vencida" | Sección 6 (intimación de pago); casos P-30 a P-33 |
| `prorrateo` | Una previsión con prorrateo aprobado no se puede impulsar hasta que esté verificado | Sección 6 (condiciones para impulsar); caso P-15 |
| `facturahonorarios` | Una previsión con ítem de Honorarios no se puede impulsar sin la factura | Sección 6 (condiciones para impulsar); caso P-14 |
| `historialprevision` | La pestaña Historial muestra cada acción con su detalle ("Registró pago — $ 5.600.000") y quién la hizo | Sección 5 |

### Datos existentes que toca

- **Ninguno.** Solo crea tablas nuevas, que arrancan vacías.
- Las previsiones cargadas antes de este script no tienen historial previo: la pestaña Historial empieza a registrar desde que se aplica.
- **No borra ni renombra nada.**

### Idempotencia y cómo revertirlo

- **Idempotente**: sí. Cada tabla se crea solo si no existe; correrlo de nuevo no cambia nada. Al final controla que estén las cinco tablas; si no, se deshace todo.
- **Aplicado** el 19/10/2026 en la base de desarrollo. La segunda ejecución, para comprobar la idempotencia, terminó sin errores y sin cambios.
- **Revertir**: borrar las cinco tablas nuevas (`historialprevision`, `facturahonorarios`, `prorrateo`, `intimacionprevision`, `acreditacion`). Ninguna otra tabla depende de ellas, así que no afecta al resto de la base. También se puede restaurar el backup `lexora_antes_prevision_20261019.bak`, aunque eso deshace también el script 001.
