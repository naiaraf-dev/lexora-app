/*
 * Datos demo - Fechas de estados de los expedientes de ejemplo
 * Lleva el historial de estados del antecedente (37), el principal (36) y el suelto (38)
 * a las fechas reales del caso, y mueve con él las tareas automáticas:
 *
 *   - tarea.fecha_creacion: la pestaña Estados (estados.service.ts) agrupa las tareas de cada estado
 *     por fecha, tomando las creadas entre el cambio de estado anterior y el propio. Si solo se
 *     movieran las fechas del historial, todos los estados quedarían sin tareas.
 *   - tarea.fecha_ultima_modificacion de las Cumplidas: es la fecha de cumplimiento que muestra el
 *     checklist (la tabla tarea no tiene otra columna para eso). Queda dentro del rango de su estado.
 *   - expediente.fecha_inicio: igual a la fecha de su primer estado.
 *
 * No toca el log de seguridad, las tareas manuales (agenda), las novedades ni los documentos.
 *
 * Solo datos, sin cambio de esquema. Ejecutar en SSMS sobre la base de Lexora: correr todo,
 * revisar que los controles del punto 4 no devuelvan filas y recién ahí ejecutar el COMMIT
 * (o el ROLLBACK). No se puede correr dos veces: la asignación de tareas usa las fechas actuales.
 */

BEGIN TRANSACTION;

-- 1. Fecha nueva de cada cambio de estado (expediente + estado)
DECLARE @fechas TABLE (expediente INT, estado_expediente INT, fecha_nueva DATETIME2(0));
INSERT INTO @fechas (expediente, estado_expediente, fecha_nueva)
VALUES
    -- Antecedente (Consignaciones)
    (37, 2,  '2022-08-05T10:00:00'),   -- En análisis (liquidación final)
    (37, 20, '2022-08-22T10:00:00'),   -- Juicio iniciado (escrito de consignación)
    -- Principal (Demanda Laboral Parte Demandada)
    (36, 1,  '2022-10-14T10:00:00'),   -- Inicio
    (36, 5,  '2023-03-15T10:00:00'),   -- Traba de litis (contestación)
    (36, 6,  '2023-05-02T10:00:00'),   -- Prueba
    (36, 7,  '2024-10-15T10:00:00'),   -- Alegato
    (36, 9,  '2025-03-18T10:00:00'),   -- Sentencia 1° instancia desfavorable
    (36, 11, '2025-03-25T10:00:00'),   -- Apelación
    -- Suelto (Recuperos)
    (38, 2,  '2026-02-10T10:00:00'),   -- En análisis
    (38, 16, '2026-07-15T10:00:00');   -- Acuerdo extrajudicial

-- Historial con su fecha actual, la anterior (orden actual) y la nueva
DECLARE @hist TABLE (
    historial_id INT, expediente INT, orden INT,
    fecha_actual DATETIME2(7), fecha_anterior DATETIME2(7),
    fecha_nueva DATETIME2(0), fecha_nueva_siguiente DATETIME2(0)
);
INSERT INTO @hist
SELECT h.id, h.expediente,
       ROW_NUMBER() OVER (PARTITION BY h.expediente ORDER BY h.fecha_cambio_estado, h.id),
       h.fecha_cambio_estado,
       LAG(h.fecha_cambio_estado) OVER (PARTITION BY h.expediente ORDER BY h.fecha_cambio_estado, h.id),
       f.fecha_nueva,
       LEAD(f.fecha_nueva) OVER (PARTITION BY h.expediente ORDER BY h.fecha_cambio_estado, h.id)
FROM dbo.historialexpediente h
INNER JOIN @fechas f ON f.expediente = h.expediente AND f.estado_expediente = h.estado_expediente;

-- 2. Cada tarea automática con el estado al que pertenece, mismo criterio que estados.service.ts:
--    primer estado: creada <= fecha del cambio; los demás: anterior < creada <= fecha del cambio
DECLARE @tareas TABLE (
    tarea_id INT, expediente INT, historial_id INT, cumplida BIT, nro INT,
    creacion_nueva DATETIME2(0), cumplimiento_nuevo DATETIME2(0), fecha_tope DATETIME2(0)
);
INSERT INTO @tareas
SELECT t.id, t.expediente, h.historial_id,
       CASE WHEN t.estado_tarea = 2 THEN 1 ELSE 0 END,
       ROW_NUMBER() OVER (PARTITION BY h.historial_id ORDER BY t.id),
       DATEADD(SECOND, -1, h.fecha_nueva),                       -- se generan justo antes del cambio de estado
       NULL,
       h.fecha_nueva_siguiente
FROM dbo.tarea t
INNER JOIN @hist h
    ON h.expediente = t.expediente
   AND t.fecha_creacion <= h.fecha_actual
   AND (h.fecha_anterior IS NULL OR t.fecha_creacion > h.fecha_anterior)
WHERE t.automatica = 1;

-- Cumplidas: un día después de entrar al estado, una por minuto
UPDATE x SET cumplimiento_nuevo = DATEADD(MINUTE, x.nro, DATEADD(DAY, 1, h.fecha_nueva))
FROM @tareas x
INNER JOIN @hist h ON h.historial_id = x.historial_id
WHERE x.cumplida = 1;

-- 3. Aplicar
UPDATE h SET fecha_cambio_estado = x.fecha_nueva
FROM dbo.historialexpediente h
INNER JOIN @hist x ON x.historial_id = h.id;

UPDATE t SET fecha_creacion = x.creacion_nueva,
             fecha_ultima_modificacion = COALESCE(x.cumplimiento_nuevo, t.fecha_ultima_modificacion)
FROM dbo.tarea t
INNER JOIN @tareas x ON x.tarea_id = t.id;

UPDATE e SET fecha_inicio = x.fecha_nueva
FROM dbo.expediente e
INNER JOIN @hist x ON x.expediente = e.id AND x.orden = 1;

-- 4. Controles: si alguno devuelve filas, hacer ROLLBACK
-- 4.a Tareas automáticas de estos expedientes que no quedaron asignadas a ningún estado
SELECT t.id, t.expediente, t.titulo
FROM dbo.tarea t
WHERE t.expediente IN (36, 37, 38) AND t.automatica = 1
  AND t.id NOT IN (SELECT tarea_id FROM @tareas);

-- 4.b Cambios de estado sin fecha nueva (estado no previsto en el punto 1)
SELECT h.id, h.expediente, h.estado_expediente
FROM dbo.historialexpediente h
WHERE h.expediente IN (36, 37, 38)
  AND h.id NOT IN (SELECT historial_id FROM @hist);

-- 4.c Cumplimientos que caen después del estado siguiente
SELECT tarea_id, expediente, cumplimiento_nuevo, fecha_tope
FROM @tareas
WHERE cumplimiento_nuevo >= fecha_tope;

-- COMMIT;
-- ROLLBACK;
