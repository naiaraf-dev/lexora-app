/*
 * HU42 - Resúmenes de documentos generados por IA
 * Crea documento_resumen: guarda el resumen de cada documento y funciona como cola de trabajo
 * del proceso en segundo plano (backend/src/jobs/resumenes.job.js).
 *
 * Se puede ejecutar más de una vez sin error. Ejecutar en SSMS sobre la base de Lexora
 * (usa GO para separar lotes).
 */

-- 1. Tabla de resúmenes / cola de procesamiento
IF OBJECT_ID('dbo.documento_resumen', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.documento_resumen (
        documento_id    INT             NOT NULL,
        estado          VARCHAR(20)     NOT NULL
            CONSTRAINT DF_documento_resumen_estado DEFAULT ('pendiente'),
        tipo_detectado  NVARCHAR(100)   NULL,
        resumen         NVARCHAR(2000)  NULL,
        palabras_clave  NVARCHAR(1000)  NULL,   -- separadas por coma, se buscan con LIKE (HU44)
        datos_json      NVARCHAR(MAX)   NULL,   -- partes, fechas, montos y temas
        modelo          VARCHAR(100)    NULL,   -- modelo de IA que generó el resumen
        intentos        TINYINT         NOT NULL
            CONSTRAINT DF_documento_resumen_intentos DEFAULT (0),
        ultimo_error    NVARCHAR(500)   NULL,
        fecha_creacion  DATETIME2(0)    NOT NULL
            CONSTRAINT DF_documento_resumen_fecha_creacion DEFAULT (SYSDATETIME()),
        fecha_proceso   DATETIME2(0)    NULL,   -- inicio del último procesamiento

        CONSTRAINT PK_documento_resumen
            PRIMARY KEY (documento_id),

        -- documento usa borrado físico: el resumen se borra con el documento
        CONSTRAINT FK_documento_resumen_documento
            FOREIGN KEY (documento_id) REFERENCES dbo.documento (id)
            ON DELETE CASCADE,

        CONSTRAINT CK_documento_resumen_estado
            CHECK (estado IN ('pendiente', 'procesando', 'procesado', 'error', 'omitido')),

        CONSTRAINT CK_documento_resumen_datos_json
            CHECK (datos_json IS NULL OR ISJSON(datos_json) = 1)
    );
END
GO

-- 2. Índice para encontrar rápido los pendientes y los errores a reintentar
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_documento_resumen_estado'
      AND object_id = OBJECT_ID('dbo.documento_resumen')
)
BEGIN
    CREATE INDEX IX_documento_resumen_estado
        ON dbo.documento_resumen (estado, intentos)
        INCLUDE (fecha_proceso);
END
GO
