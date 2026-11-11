# Propuesta para lexora-app: convención de cambios en la base

Texto para agregar en `lexora-app/backend/db/RESUMEN_CAMBIOS_BD.md` (arriba, antes del detalle de cada script), o en un `backend/db/README.md` nuevo. Lo aplica la usuaria; lexora-qa no modifica lexora-app.

---

## Regla: todo cambio en la base es un script

**Ningún cambio en la base se hace solo a mano en SSMS.** Cada cambio se guarda como un script `.sql` en `backend/db/`, en el mismo PR que el código que lo usa:

- tablas, columnas, índices o restricciones;
- datos de catálogos (tipos, estados, transiciones, plantillas de tareas, prioridades, etc.).

**Por qué:**

- Cualquiera del equipo puede dejar su base igual a la de los demás corriendo los scripts en orden.
- El CI de QA (`lexora-qa`) arma su base de prueba desde un baseline y avisa solo cuando aparece un script nuevo en `backend/db/` ("Baseline posiblemente desactualizado"). Un cambio hecho a mano no lo ve nadie.

### Dónde va cada script

| Carpeta | Qué va | ¿Entra al baseline de QA? |
|---|---|---|
| `migrations/` | Cambios de **estructura** y de **catálogos** | Sí |
| `seeds/demo/` (nueva) | Datos de **ejemplo o demo** (como `scripts/003_fechas_historial_demo.sql`) | **No, nunca** |

> Hoy hay dos carpetas con numeración propia (`migrations/001`–`002` y `scripts/001`–`003`), y `scripts/` mezcla estructura (`001_documento_resumen`), corrección de catálogo (`002_transiciones_flujo_analisis`) y datos demo (`003_fechas_historial_demo`). Propuesta: mover los de estructura y catálogos a `migrations/` con **una sola numeración correlativa**, y los de demo a `seeds/demo/`. Hay que decidirlo en equipo, porque cambia rutas que ya se usaron.

### Cómo es cada script

Las reglas que ya están en este archivo siguen vigentes:

- solo agregan;
- son idempotentes;
- corren en una sola transacción;
- se ejecutan en orden con `sqlcmd -b`.

Además:

1. **Número correlativo único** (`003_…`, `004_…`): el orden de ejecución no puede ser ambiguo.
2. **Encabezado** con qué cambia, por qué (HU o bug) y cómo volver atrás, como ya hacen los scripts actuales.
3. **Entrada en este archivo** (`RESUMEN_CAMBIOS_BD.md`) para cada script nuevo, sin importar la carpeta. Hoy solo están documentados los de `migrations/`.
4. **Sin datos reales.** Los scripts de demo usan datos inventados.

### Checklist del PR que toca la base

- [ ] El cambio está en un script `.sql` numerado en la carpeta que corresponde.
- [ ] El script corre dos veces seguidas sin error (idempotente).
- [ ] Está documentado en `RESUMEN_CAMBIOS_BD.md`.
- [ ] Si toca estructura o catálogos: avisar a QA para regenerar el baseline (el CI también lo marca solo).
