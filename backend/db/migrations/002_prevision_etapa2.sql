/*
    002_prevision_etapa2.sql — Módulo Previsión y pago, etapa 2 (bloque B)
    Fecha: 2026-10-19
    Requiere: 001_prevision_etapa1.sql

    Ejecutar con sqlcmd (o SSMS en "Modo SQLCMD"), con codificación UTF-8:
        sqlcmd -S <servidor> -d lexora -b -f 65001 -i 002_prevision_etapa2.sql

    - Todo corre en UNA transacción: si un paso falla, ":on error exit" corta
      el script, se cierra la conexión y SQL Server deshace todo lo anterior.
    - Es idempotente: cada tabla se crea solo si no existe.
    - Solo crea tablas nuevas: no modifica ni borra nada de lo existente.
    - Detalle en lenguaje simple: RESUMEN_CAMBIOS_BD.md
*/
:on error exit
SET XACT_ABORT ON;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
BEGIN TRANSACTION;
GO

IF OBJECT_ID('dbo.impulsoprevision', 'U') IS NULL
    THROW 50100, 'Falta aplicar 001_prevision_etapa1.sql', 1;
GO

/* ------------------------------------------------------------
   1. acreditacion: el juzgado tiene por acreditado el pago
      (proveído). Si ordena notificar, se crea una tarea en la
      Agenda y la previsión no se puede cerrar hasta cumplirla.
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.acreditacion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.acreditacion (
        id                          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_acreditacion PRIMARY KEY,
        prevision                   INT           NOT NULL CONSTRAINT FK_acreditacion_prevision REFERENCES dbo.prevision(id),
        fecha                       DATE          NOT NULL,
        documento                   INT           NULL     CONSTRAINT FK_acreditacion_documento REFERENCES dbo.documento(id),
        ordena_notificar            BIT           NOT NULL CONSTRAINT DF_acreditacion_ordena_notificar DEFAULT (0),
        tarea                       INT           NULL     CONSTRAINT FK_acreditacion_tarea REFERENCES dbo.tarea(id),
        activo                      BIT           NOT NULL CONSTRAINT DF_acreditacion_activo DEFAULT (1),
        usuario_creacion            INT           NULL     CONSTRAINT FK_acreditacion_usuario_creacion REFERENCES dbo.usuario(id),
        fecha_creacion              DATETIME2     NOT NULL CONSTRAINT DF_acreditacion_fecha_creacion DEFAULT (SYSDATETIME()),
        usuario_ultima_modificacion INT           NULL     CONSTRAINT FK_acreditacion_usuario_ultima_modificacion REFERENCES dbo.usuario(id),
        fecha_ultima_modificacion   DATETIME2     NOT NULL CONSTRAINT DF_acreditacion_fecha_ultima_modificacion DEFAULT (SYSDATETIME())
    );
    CREATE INDEX IX_acreditacion_prevision ON dbo.acreditacion(prevision);
END
GO

/* ------------------------------------------------------------
   2. intimacionprevision: el juzgado intima a pagar en un plazo.
      No cambia el estado; crea una tarea que vence ese día.
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.intimacionprevision', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.intimacionprevision (
        id                          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_intimacionprevision PRIMARY KEY,
        prevision                   INT           NOT NULL CONSTRAINT FK_intimacionprevision_prevision REFERENCES dbo.prevision(id),
        fecha                       DATE          NOT NULL,
        fecha_vencimiento           DATE          NOT NULL,
        apercibimiento              NVARCHAR(100) NULL,
        documento                   INT           NULL     CONSTRAINT FK_intimacionprevision_documento REFERENCES dbo.documento(id),
        tarea                       INT           NULL     CONSTRAINT FK_intimacionprevision_tarea REFERENCES dbo.tarea(id),
        observaciones               NVARCHAR(MAX) NULL,
        activo                      BIT           NOT NULL CONSTRAINT DF_intimacionprevision_activo DEFAULT (1),
        usuario_creacion            INT           NULL     CONSTRAINT FK_intimacionprevision_usuario_creacion REFERENCES dbo.usuario(id),
        fecha_creacion              DATETIME2     NOT NULL CONSTRAINT DF_intimacionprevision_fecha_creacion DEFAULT (SYSDATETIME()),
        usuario_ultima_modificacion INT           NULL     CONSTRAINT FK_intimacionprevision_usuario_ultima_modificacion REFERENCES dbo.usuario(id),
        fecha_ultima_modificacion   DATETIME2     NOT NULL CONSTRAINT DF_intimacionprevision_fecha_ultima_modificacion DEFAULT (SYSDATETIME()),
        CONSTRAINT CK_intimacionprevision_vencimiento CHECK (fecha_vencimiento >= fecha)
    );
    CREATE INDEX IX_intimacionprevision_prevision ON dbo.intimacionprevision(prevision);
END
GO

/* ------------------------------------------------------------
   3. prorrateo (art. 730): uno por previsión.
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.prorrateo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.prorrateo (
        id                          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_prorrateo PRIMARY KEY,
        prevision                   INT           NOT NULL CONSTRAINT FK_prorrateo_prevision REFERENCES dbo.prevision(id)
                                                           CONSTRAINT UQ_prorrateo_prevision UNIQUE,
        aprobado                    BIT           NOT NULL CONSTRAINT DF_prorrateo_aprobado DEFAULT (0),
        verificado                  BIT           NOT NULL CONSTRAINT DF_prorrateo_verificado DEFAULT (0),
        fecha_aprobacion            DATE          NULL,
        resolucion                  NVARCHAR(200) NULL,
        base_calculo                DECIMAL(18,2) NULL,
        honorarios_sujetos          DECIMAL(18,2) NULL,
        coeficiente                 DECIMAL(9,6)  NULL,
        monto_prorrateado           DECIMAL(18,2) NULL,
        usuario_creacion            INT           NULL     CONSTRAINT FK_prorrateo_usuario_creacion REFERENCES dbo.usuario(id),
        fecha_creacion              DATETIME2     NOT NULL CONSTRAINT DF_prorrateo_fecha_creacion DEFAULT (SYSDATETIME()),
        usuario_ultima_modificacion INT           NULL     CONSTRAINT FK_prorrateo_usuario_ultima_modificacion REFERENCES dbo.usuario(id),
        fecha_ultima_modificacion   DATETIME2     NOT NULL CONSTRAINT DF_prorrateo_fecha_ultima_modificacion DEFAULT (SYSDATETIME())
    );
END
GO

/* ------------------------------------------------------------
   4. facturahonorarios: factura del profesional, una por
      previsión. Sin factura no se impulsa una previsión con
      ítem de Honorarios.
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.facturahonorarios', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.facturahonorarios (
        id                          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_facturahonorarios PRIMARY KEY,
        prevision                   INT           NOT NULL CONSTRAINT FK_facturahonorarios_prevision REFERENCES dbo.prevision(id)
                                                           CONSTRAINT UQ_facturahonorarios_prevision UNIQUE,
        profesional                 NVARCHAR(200) NOT NULL,
        monto                       DECIMAL(18,2) NOT NULL CONSTRAINT CK_facturahonorarios_monto CHECK (monto > 0),
        fecha                       DATE          NOT NULL,
        documento                   INT           NULL     CONSTRAINT FK_facturahonorarios_documento REFERENCES dbo.documento(id),
        usuario_creacion            INT           NULL     CONSTRAINT FK_facturahonorarios_usuario_creacion REFERENCES dbo.usuario(id),
        fecha_creacion              DATETIME2     NOT NULL CONSTRAINT DF_facturahonorarios_fecha_creacion DEFAULT (SYSDATETIME()),
        usuario_ultima_modificacion INT           NULL     CONSTRAINT FK_facturahonorarios_usuario_ultima_modificacion REFERENCES dbo.usuario(id),
        fecha_ultima_modificacion   DATETIME2     NOT NULL CONSTRAINT DF_facturahonorarios_fecha_ultima_modificacion DEFAULT (SYSDATETIME())
    );
END
GO

/* ------------------------------------------------------------
   5. historialprevision: una fila por acción, con el estado en
      que quedó la previsión. Alimenta la pestaña Historial.
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.historialprevision', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.historialprevision (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_historialprevision PRIMARY KEY,
        prevision        INT           NOT NULL CONSTRAINT FK_historialprevision_prevision REFERENCES dbo.prevision(id),
        estado_prevision INT           NULL     CONSTRAINT FK_historialprevision_estadoprevision REFERENCES dbo.estadoprevision(id),
        accion           NVARCHAR(100) NOT NULL,
        detalle          NVARCHAR(500) NULL,
        usuario          INT           NULL     CONSTRAINT FK_historialprevision_usuario REFERENCES dbo.usuario(id),
        fecha            DATETIME2     NOT NULL CONSTRAINT DF_historialprevision_fecha DEFAULT (SYSDATETIME())
    );
    CREATE INDEX IX_historialprevision_prevision ON dbo.historialprevision(prevision, fecha);
END
GO

/* ------------------------------------------------------------
   Control final
   ------------------------------------------------------------ */
IF OBJECT_ID('dbo.acreditacion', 'U') IS NULL OR OBJECT_ID('dbo.intimacionprevision', 'U') IS NULL
   OR OBJECT_ID('dbo.prorrateo', 'U') IS NULL OR OBJECT_ID('dbo.facturahonorarios', 'U') IS NULL
   OR OBJECT_ID('dbo.historialprevision', 'U') IS NULL
    THROW 50101, 'No se crearon todas las tablas de la etapa 2', 1;
GO

COMMIT TRANSACTION;
PRINT '002_prevision_etapa2.sql aplicado correctamente.';
GO
