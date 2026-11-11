/*
    001_prevision_etapa1.sql — Módulo Previsión y pago, etapa 1 (flujo base)
    Fecha: 2026-10-19

    Ejecutar con sqlcmd (o SSMS en "Modo SQLCMD"), con codificación UTF-8:
        sqlcmd -S <servidor> -d lexora -b -f 65001 -i 001_prevision_etapa1.sql

    - Todo corre en UNA transacción: si un paso falla, ":on error exit" corta
      el script, se cierra la conexión y SQL Server deshace todo lo anterior.
    - Es idempotente: cada paso pregunta si ya existe antes de crear,
      así que correrlo dos veces no rompe nada ni duplica datos.
    - Los GO separan lotes porque SQL Server compila cada lote entero antes de
      ejecutarlo: un UPDATE que usa una columna recién agregada tiene que ir en
      un lote posterior al ALTER que la crea.
    - QUOTED_IDENTIFIER y ANSI_NULLS en ON: los exige el índice filtrado del
      paso 7, y sqlcmd deja QUOTED_IDENTIFIER en OFF por defecto (SSMS no).
    - Detalle en lenguaje simple: RESUMEN_CAMBIOS_BD.md
*/
:on error exit
SET XACT_ABORT ON;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
BEGIN TRANSACTION;
GO

/* ------------------------------------------------------------
   1. Catálogo tipoobligacion (sección 4)
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.tipoobligacion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tipoobligacion (
        id     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tipoobligacion PRIMARY KEY,
        nombre NVARCHAR(100)     NOT NULL CONSTRAINT UQ_tipoobligacion_nombre UNIQUE
    );
END
GO

INSERT INTO dbo.tipoobligacion (nombre)
SELECT v.nombre
FROM (VALUES
    (1, N'Sentencia'),
    (2, N'Regulación de honorarios'),
    (3, N'Acuerdo'),
    (4, N'Costas'),
    (5, N'Multa'),
    (6, N'Depósito de queja'),
    (7, N'Otro')
) AS v(orden, nombre)
WHERE NOT EXISTS (SELECT 1 FROM dbo.tipoobligacion t WHERE t.nombre = v.nombre)
ORDER BY v.orden;
GO

/* ------------------------------------------------------------
   2. prevision: tipo de obligación, intereses estimados,
      auditoría y baja lógica; tasa_valor pasa a admitir NULL
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.prevision', 'tipo_obligacion') IS NULL
    ALTER TABLE dbo.prevision ADD tipo_obligacion INT NULL
        CONSTRAINT FK_prevision_tipoobligacion REFERENCES dbo.tipoobligacion(id);

IF COL_LENGTH('dbo.prevision', 'intereses_estimados') IS NULL
    ALTER TABLE dbo.prevision ADD intereses_estimados DECIMAL(18,2) NULL;

IF COL_LENGTH('dbo.prevision', 'activo') IS NULL
    ALTER TABLE dbo.prevision ADD activo BIT NOT NULL
        CONSTRAINT DF_prevision_activo DEFAULT (1);

IF COL_LENGTH('dbo.prevision', 'usuario_creacion') IS NULL
    ALTER TABLE dbo.prevision ADD usuario_creacion INT NULL
        CONSTRAINT FK_prevision_usuario_creacion REFERENCES dbo.usuario(id);

IF COL_LENGTH('dbo.prevision', 'fecha_creacion') IS NULL
    ALTER TABLE dbo.prevision ADD fecha_creacion DATETIME2 NOT NULL
        CONSTRAINT DF_prevision_fecha_creacion DEFAULT (SYSDATETIME());

IF COL_LENGTH('dbo.prevision', 'usuario_ultima_modificacion') IS NULL
    ALTER TABLE dbo.prevision ADD usuario_ultima_modificacion INT NULL
        CONSTRAINT FK_prevision_usuario_ultima_modificacion REFERENCES dbo.usuario(id);

IF COL_LENGTH('dbo.prevision', 'fecha_ultima_modificacion') IS NULL
    ALTER TABLE dbo.prevision ADD fecha_ultima_modificacion DATETIME2 NOT NULL
        CONSTRAINT DF_prevision_fecha_ultima_modificacion DEFAULT (SYSDATETIME());

-- Excepción aprobada a la regla "solo agregar": relaja NOT NULL a NULL, no toca datos.
IF COLUMNPROPERTY(OBJECT_ID('dbo.prevision'), 'tasa_valor', 'AllowsNull') = 0
    ALTER TABLE dbo.prevision ALTER COLUMN tasa_valor DECIMAL(9,4) NULL;
GO

/* ------------------------------------------------------------
   3. prevision_item: tasa_valor pasa a admitir NULL
   ------------------------------------------------------------ */
IF COLUMNPROPERTY(OBJECT_ID('dbo.prevision_item'), 'tasa_valor', 'AllowsNull') = 0
    ALTER TABLE dbo.prevision_item ALTER COLUMN tasa_valor DECIMAL(9,4) NULL;
GO

/* ------------------------------------------------------------
   4. liquidacion: desglose (sección 4), trazabilidad,
      auditoría y baja lógica; tasa_valor admite NULL
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.liquidacion', 'numero') IS NULL
    ALTER TABLE dbo.liquidacion ADD numero INT NULL;

IF COL_LENGTH('dbo.liquidacion', 'capital') IS NULL
    ALTER TABLE dbo.liquidacion ADD capital DECIMAL(18,2) NULL;

IF COL_LENGTH('dbo.liquidacion', 'intereses') IS NULL
    ALTER TABLE dbo.liquidacion ADD intereses DECIMAL(18,2) NULL;

IF COL_LENGTH('dbo.liquidacion', 'otros') IS NULL
    ALTER TABLE dbo.liquidacion ADD otros DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_liquidacion_otros DEFAULT (0);

IF COL_LENGTH('dbo.liquidacion', 'detalle_calculo') IS NULL
    ALTER TABLE dbo.liquidacion ADD detalle_calculo NVARCHAR(MAX) NULL;

IF COL_LENGTH('dbo.liquidacion', 'activo') IS NULL
    ALTER TABLE dbo.liquidacion ADD activo BIT NOT NULL
        CONSTRAINT DF_liquidacion_activo DEFAULT (1);

IF COL_LENGTH('dbo.liquidacion', 'usuario_creacion') IS NULL
    ALTER TABLE dbo.liquidacion ADD usuario_creacion INT NULL
        CONSTRAINT FK_liquidacion_usuario_creacion REFERENCES dbo.usuario(id);

IF COL_LENGTH('dbo.liquidacion', 'fecha_creacion') IS NULL
    ALTER TABLE dbo.liquidacion ADD fecha_creacion DATETIME2 NOT NULL
        CONSTRAINT DF_liquidacion_fecha_creacion DEFAULT (SYSDATETIME());

IF COL_LENGTH('dbo.liquidacion', 'usuario_ultima_modificacion') IS NULL
    ALTER TABLE dbo.liquidacion ADD usuario_ultima_modificacion INT NULL
        CONSTRAINT FK_liquidacion_usuario_ultima_modificacion REFERENCES dbo.usuario(id);

IF COL_LENGTH('dbo.liquidacion', 'fecha_ultima_modificacion') IS NULL
    ALTER TABLE dbo.liquidacion ADD fecha_ultima_modificacion DATETIME2 NOT NULL
        CONSTRAINT DF_liquidacion_fecha_ultima_modificacion DEFAULT (SYSDATETIME());

IF COLUMNPROPERTY(OBJECT_ID('dbo.liquidacion'), 'tasa_valor', 'AllowsNull') = 0
    ALTER TABLE dbo.liquidacion ALTER COLUMN tasa_valor DECIMAL(9,4) NULL;
GO

/* ------------------------------------------------------------
   5. pagoprevision: comprobante (documento), auditoría y baja lógica
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.pagoprevision', 'documento') IS NULL
    ALTER TABLE dbo.pagoprevision ADD documento INT NULL
        CONSTRAINT FK_pagoprevision_documento REFERENCES dbo.documento(id);

IF COL_LENGTH('dbo.pagoprevision', 'activo') IS NULL
    ALTER TABLE dbo.pagoprevision ADD activo BIT NOT NULL
        CONSTRAINT DF_pagoprevision_activo DEFAULT (1);

IF COL_LENGTH('dbo.pagoprevision', 'usuario_creacion') IS NULL
    ALTER TABLE dbo.pagoprevision ADD usuario_creacion INT NULL
        CONSTRAINT FK_pagoprevision_usuario_creacion REFERENCES dbo.usuario(id);

IF COL_LENGTH('dbo.pagoprevision', 'fecha_creacion') IS NULL
    ALTER TABLE dbo.pagoprevision ADD fecha_creacion DATETIME2 NOT NULL
        CONSTRAINT DF_pagoprevision_fecha_creacion DEFAULT (SYSDATETIME());

IF COL_LENGTH('dbo.pagoprevision', 'usuario_ultima_modificacion') IS NULL
    ALTER TABLE dbo.pagoprevision ADD usuario_ultima_modificacion INT NULL
        CONSTRAINT FK_pagoprevision_usuario_ultima_modificacion REFERENCES dbo.usuario(id);

IF COL_LENGTH('dbo.pagoprevision', 'fecha_ultima_modificacion') IS NULL
    ALTER TABLE dbo.pagoprevision ADD fecha_ultima_modificacion DATETIME2 NOT NULL
        CONSTRAINT DF_pagoprevision_fecha_ultima_modificacion DEFAULT (SYSDATETIME());
GO

/* ------------------------------------------------------------
   6. impulsoprevision: solicitud de pago a la Administración
      del cliente (secciones 2 y 6)
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.impulsoprevision', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.impulsoprevision (
        id                          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_impulsoprevision PRIMARY KEY,
        prevision                   INT           NOT NULL CONSTRAINT FK_impulsoprevision_prevision REFERENCES dbo.prevision(id),
        fecha                       DATE          NOT NULL,
        monto                       DECIMAL(18,2) NOT NULL CONSTRAINT CK_impulsoprevision_monto CHECK (monto > 0),
        es_diferencia               BIT           NOT NULL CONSTRAINT DF_impulsoprevision_es_diferencia DEFAULT (0),
        documento                   INT           NULL     CONSTRAINT FK_impulsoprevision_documento REFERENCES dbo.documento(id),
        observaciones               NVARCHAR(MAX) NULL,
        activo                      BIT           NOT NULL CONSTRAINT DF_impulsoprevision_activo DEFAULT (1),
        usuario_creacion            INT           NULL     CONSTRAINT FK_impulsoprevision_usuario_creacion REFERENCES dbo.usuario(id),
        fecha_creacion              DATETIME2     NOT NULL CONSTRAINT DF_impulsoprevision_fecha_creacion DEFAULT (SYSDATETIME()),
        usuario_ultima_modificacion INT           NULL     CONSTRAINT FK_impulsoprevision_usuario_ultima_modificacion REFERENCES dbo.usuario(id),
        fecha_ultima_modificacion   DATETIME2     NOT NULL CONSTRAINT DF_impulsoprevision_fecha_ultima_modificacion DEFAULT (SYSDATETIME())
    );
    CREATE INDEX IX_impulsoprevision_prevision ON dbo.impulsoprevision(prevision);
END
GO

/* ------------------------------------------------------------
   7. documento.prevision: los archivos de la previsión aparecen
      en la pestaña Documentos del expediente (sección 8)
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.documento', 'prevision') IS NULL
    ALTER TABLE dbo.documento ADD prevision INT NULL
        CONSTRAINT FK_documento_prevision REFERENCES dbo.prevision(id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documento_prevision' AND object_id = OBJECT_ID('dbo.documento'))
    CREATE INDEX IX_documento_prevision ON dbo.documento(prevision) WHERE prevision IS NOT NULL;
GO

/* ------------------------------------------------------------
   8. tipoestadoexpediente.habilita_prevision (sección 3)
      Marca 21 filas: las 4 demandas (52-55) en Sentencia 2° inst.
      favorable (12) y desfavorable (13), Recurso extraordinario
      federal (15) y Ejecución de sentencia (17); y Acuerdo
      extrajudicial (16) en Lanzamientos (7), Recuperos (59),
      Reclamo a contratistas (60), Cobro de cánones (61) y
      Ejecución de póliza (62). Lanzamientos judicializados (56) no.
   ------------------------------------------------------------ */
IF COL_LENGTH('dbo.tipoestadoexpediente', 'habilita_prevision') IS NULL
    ALTER TABLE dbo.tipoestadoexpediente ADD habilita_prevision BIT NOT NULL
        CONSTRAINT DF_tipoestadoexpediente_habilita_prevision DEFAULT (0);
GO

UPDATE dbo.tipoestadoexpediente
SET habilita_prevision = 1
WHERE habilita_prevision = 0
  AND (
        (tipoexpediente IN (52, 53, 54, 55) AND estadoexpediente IN (12, 13, 15, 17))
     OR (estadoexpediente = 16 AND tipoexpediente IN (7, 59, 60, 61, 62))
  );
GO

/* ------------------------------------------------------------
   9. Tipos de documento que usa la previsión (sección 8).
      "Sentencia" y "Notificación" ya existen y se reutilizan.
   ------------------------------------------------------------ */
INSERT INTO dbo.tipodocumento (nombre)
SELECT v.nombre
FROM (VALUES
    (1, N'Resolución'),
    (2, N'Liquidación'),
    (3, N'Nota'),
    (4, N'Comprobante de pago'),
    (5, N'Factura'),
    (6, N'Proveído')
) AS v(orden, nombre)
WHERE NOT EXISTS (SELECT 1 FROM dbo.tipodocumento t WHERE t.nombre = v.nombre)
ORDER BY v.orden;
GO

/* ------------------------------------------------------------
   Control final: si algo no quedó como se espera, se aborta
   y la transacción se deshace entera.
   ------------------------------------------------------------ */
IF (SELECT COUNT(*) FROM dbo.tipoestadoexpediente WHERE habilita_prevision = 1) <> 21
    THROW 50001, 'Se esperaban 21 filas con habilita_prevision = 1', 1;
IF (SELECT COUNT(*) FROM dbo.tipoobligacion) < 7
    THROW 50002, 'Faltan valores en tipoobligacion', 1;
GO

COMMIT TRANSACTION;
PRINT '001_prevision_etapa1.sql aplicado correctamente.';
GO
