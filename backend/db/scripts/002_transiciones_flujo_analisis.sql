/*
 * Bug B - No se habilita el avance de estado
 * Alinea transicion_estado con los diagramas de Estados_Tareas_Lexora.xlsx para los tipos
 * cuyo flujo no coincidía con tipoestadoexpediente / tareaautomatica (que sí coinciden con el Excel).
 *
 *   - Flujo "En análisis" (7, 57, 58, 59, 60, 61, 62): desde En análisis no había ninguna
 *     transición cargada, así que no aparecía el botón "Listo para avanzar".
 *   - Lanzamientos Judicializados (56): las transiciones iban a Finalizado, que no es estado
 *     del tipo (cierra en Terminado), y varios estados quedaban inalcanzables.
 *
 * Los tipos 52 a 55 (Demandas) no se tocan.
 *
 * Solo datos, sin cambio de esquema. Se puede ejecutar más de una vez sin error.
 * Ejecutar en SSMS sobre la base de Lexora: correr todo, revisar que los dos controles
 * del punto 4 no devuelvan filas y recién ahí ejecutar el COMMIT (o el ROLLBACK).
 *
 * Estados: 1 Inicio | 2 En análisis | 3 Devuelto al sector requirente | 4 Constatación judicial
 *          5 Traba de litis | 10 Sentencia de lanzamiento | 11 Apelación | 14 Sentencia de cámara
 *          15 Recurso extraordinario federal | 16 Acuerdo extrajudicial | 18 Mandamiento librado
 *          19 Lanzamiento efectivizado | 20 Juicio iniciado | 22 Sentencia firme | 23 Terminado
 */

BEGIN TRANSACTION;

-- 1. Limpia las transiciones de los tipos que se rearman
DELETE FROM dbo.transicion_estado
WHERE tipo_expediente IN (7, 56, 57, 58, 59, 60, 61, 62);

-- 2. Flujo "En análisis": estados excluyentes alcanzables desde En análisis (todos son finales)
-- Con Acuerdo extrajudicial: Lanzamientos, Recuperos, Reclamo a contratistas, Cobro de cánones, Ejecución de póliza
INSERT INTO dbo.transicion_estado (tipo_expediente, estado_origen, estado_destino)
SELECT t.tipo, 2, d.destino
FROM (VALUES (7), (59), (60), (61), (62)) AS t(tipo)
CROSS JOIN (VALUES (16), (3), (20)) AS d(destino);

-- Sin Acuerdo extrajudicial: Desafueros, Consignaciones
INSERT INTO dbo.transicion_estado (tipo_expediente, estado_origen, estado_destino)
SELECT t.tipo, 2, d.destino
FROM (VALUES (57), (58)) AS t(tipo)
CROSS JOIN (VALUES (3), (20)) AS d(destino);

-- 3. Lanzamientos Judicializados (56)
INSERT INTO dbo.transicion_estado (tipo_expediente, estado_origen, estado_destino)
VALUES
    -- Camino operativo
    (56, 1, 4),     -- Inicio -> Constatación judicial
    (56, 4, 10),    -- Constatación judicial -> Sentencia de lanzamiento (sin vulnerables)
    (56, 4, 5),     -- Constatación judicial -> Traba de litis (con vulnerables; el diagrama pasa
                    -- antes por "Traslado a Defensor Oficial", que no existe como estado)
    (56, 5, 10),    -- Traba de litis -> Sentencia de lanzamiento
    (56, 10, 11),   -- Sentencia de lanzamiento -> Apelación
    (56, 11, 14),   -- Apelación -> Sentencia de cámara
    (56, 14, 15),   -- Sentencia de cámara -> Recurso extraordinario federal
    (56, 15, 22),   -- Recurso extraordinario federal -> Sentencia firme
    (56, 22, 18),   -- Sentencia firme -> Mandamiento librado
    (56, 18, 19),   -- Mandamiento librado -> Lanzamiento efectivizado
    (56, 19, 23),   -- Lanzamiento efectivizado -> Terminado

    -- Camino Comercial (el tipo no distingue área, se habilitan los dos caminos)
    (56, 1, 10),    -- Inicio -> Sentencia de lanzamiento
    (56, 10, 18),   -- Sentencia de lanzamiento -> Mandamiento librado

    -- "Finalizado desde cualquier estado": el cierre del tipo 56 es Terminado
    (56, 1, 23),
    (56, 4, 23),
    (56, 5, 23),
    (56, 10, 23),
    (56, 11, 23),
    (56, 14, 23),
    (56, 15, 23),
    (56, 22, 23),
    (56, 18, 23);

-- 4. Controles: si alguno devuelve filas, hacer ROLLBACK
-- 4.a Origen o destino fuera del pipeline del tipo
SELECT t.tipo_expediente, t.estado_origen, t.estado_destino
FROM dbo.transicion_estado t
WHERE t.tipo_expediente IN (7, 56, 57, 58, 59, 60, 61, 62)
  AND (
        NOT EXISTS (SELECT 1 FROM dbo.tipoestadoexpediente tee
                    WHERE tee.tipoexpediente = t.tipo_expediente AND tee.estadoexpediente = t.estado_origen)
     OR NOT EXISTS (SELECT 1 FROM dbo.tipoestadoexpediente tee
                    WHERE tee.tipoexpediente = t.tipo_expediente AND tee.estadoexpediente = t.estado_destino)
  );

-- 4.b Destino sin tareas automáticas (el cambio de estado fallaría al generarlas)
SELECT t.tipo_expediente, t.estado_destino
FROM dbo.transicion_estado t
WHERE t.tipo_expediente IN (7, 56, 57, 58, 59, 60, 61, 62)
  AND NOT EXISTS (SELECT 1 FROM dbo.tareaautomatica ta
                  WHERE ta.tipo_expediente = t.tipo_expediente AND ta.estado_expediente = t.estado_destino);

-- COMMIT;
-- ROLLBACK;
