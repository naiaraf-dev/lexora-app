const { sql, conectarBD } = require('../config/db');

// trae los expedientes activos con filtros y paginacion
async function getAll({ numero, causa, caratula, area, tipo, estado, clienteId, pagina = 1, pageSize = 10 }) {
    const pool = await conectarBD();
    const req = pool.request();

    // arranca filtrando solo los expedientes activos
    let where = 'WHERE e.activo = 1';

    if (numero) {
        req.input('numero', sql.NVarChar, `%${numero}%`);
        where += ` AND (CAST(e.id AS NVARCHAR) + '/' + CAST(YEAR(e.fecha_inicio) AS NVARCHAR)) LIKE @numero`;
    }
    if (causa) {
        req.input('causa', sql.NVarChar, `%${causa}%`);
        where += ' AND e.numero_expediente_judicial LIKE @causa';
    }
    if (caratula) {
        req.input('caratula', sql.NVarChar, `%${caratula}%`);
        where += ' AND e.caratula LIKE @caratula';
    }
    if (area) {
        req.input('area_filtro', sql.NVarChar, area);
        where += ' AND e.area = @area_filtro';
    }
    if (tipo) {
        req.input('tipo', sql.Int, Number(tipo));
        where += ' AND e.tipo_expediente = @tipo';
    }
    if (estado) {
        req.input('estado', sql.Int, Number(estado));
        where += ' AND e.estado_expediente = @estado';
    }
    if (clienteId) {
        req.input('clienteId', sql.Int, Number(clienteId));
        where += ' AND e.cliente = @clienteId';
    }

    // calcula desde que registro empieza segun la pagina
    const offset = (pagina - 1) * pageSize;
    req.input('offset', sql.Int, offset);
    req.input('pageSize', sql.Int, pageSize);

    const resultado = await req.query(`
        SELECT
            e.id,
            e.numero_expediente_judicial   AS numeroExpedienteJudicial,
            e.caratula,
            e.area,
            e.fecha_inicio,
            e.fecha_creacion,
            e.causa_id,
            e.fecha_ultima_modificacion    AS ultimaActualizacion,
            e.activo,
            te.id                          AS tipoId,
            te.nombre                      AS tipoNombre,
            ee.id                          AS estadoId,
            ee.nombre                      AS estadoNombre,
            c.id                           AS clienteId,
            c.nombre + ' ' + c.apellido    AS clienteNombre,
            u.id                           AS usuarioPrincipalId,
            u.nombre + ' ' + u.apellido    AS usuarioPrincipalNombre,
            COUNT(*) OVER()                AS totalRegistros
        FROM expediente e
        LEFT JOIN tipoexpediente   te ON te.id = e.tipo_expediente
        LEFT JOIN estadoexpediente ee ON ee.id = e.estado_expediente
        LEFT JOIN cliente          c  ON c.id  = e.cliente
        LEFT JOIN usuario          u  ON u.id  = e.usuario_principal
        ${where}
        ORDER BY e.fecha_ultima_modificacion DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return resultado.recordset;
}

// trae un expediente por id con todos sus datos relacionados
async function getById(id) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT
                e.*,
                te.nombre                       AS tipoNombre,
                ee.nombre                       AS estadoNombre,
                c.id                            AS clienteId,
                c.nombre + ' ' + c.apellido     AS clienteNombre,
                up.id                           AS usuarioPrincipalId,
                up.nombre + ' ' + up.apellido   AS usuarioPrincipalNombre,
                us.id                           AS usuarioSecundarioId,
                us.nombre + ' ' + us.apellido   AS usuarioSecundarioNombre,
                p.nombre                        AS prioridadNombre,
                rc.id                           AS rolClienteId,
                rc.nombre                       AS rolClienteNombre
            FROM expediente e
            LEFT JOIN tipoexpediente   te  ON te.id  = e.tipo_expediente
            LEFT JOIN estadoexpediente ee  ON ee.id  = e.estado_expediente
            LEFT JOIN cliente          c   ON c.id   = e.cliente
            LEFT JOIN usuario          up  ON up.id  = e.usuario_principal
            LEFT JOIN usuario          us  ON us.id  = e.usuario_secundario
            LEFT JOIN prioridad        p   ON p.id   = e.prioridad
            LEFT JOIN rolcliente       rc  ON rc.id  = e.rol_cliente
            WHERE e.id = @id AND e.activo = 1
        `);

    return resultado.recordset[0] ?? null;
}

// crea un expediente nuevo y despues lo devuelve completo
async function crear(data, transaction = null) {
    let request;

    if (transaction) {
        request = new sql.Request(transaction);
    } else {
        const pool = await conectarBD();
        request = pool.request();
    }

    const resultado = await request
        .input('tipo_expediente', sql.Int, data.tipo_expediente)
        .input('estado_expediente', sql.Int, data.estado_expediente)
        .input('usuario_principal', sql.Int, data.usuario_principal)
        .input('usuario_secundario', sql.Int, data.usuario_secundario ?? null)
        .input('usuario_creacion', sql.Int, data.usuario_creacion)
        .input('usuario_ultima_modificacion', sql.Int, data.usuario_creacion)
        .input('cliente', sql.Int, data.cliente)
        .input('rol_cliente', sql.Int, data.rol_cliente ?? null)
        .input('area', sql.NVarChar(100), data.area)
        .input('caratula', sql.NVarChar(500), data.caratula)
        .input('fecha_inicio', sql.DateTime, data.fecha_inicio ?? new Date())
        .input('fecha_ult_actuacion', sql.DateTime, data.fecha_ult_actuacion ?? new Date())
        .input('descripcion', sql.NVarChar(sql.MAX), data.descripcion ?? null)
        .input('fuero', sql.NVarChar(100), data.fuero ?? null)
        .input('juzgado', sql.NVarChar(200), data.juzgado ?? null)
        .input('secretaria', sql.NVarChar(200), data.secretaria ?? null)
        .input('jurisdiccion', sql.NVarChar(200), data.jurisdiccion ?? null)
        .input(
            'numero_expediente_judicial',
            sql.NVarChar(100),
            data.numero_expediente_judicial ?? null
        )
        .input('instancia', sql.NVarChar(100), data.instancia ?? null)
        .input('contraparte', sql.NVarChar(500), data.contraparte ?? null)
        .input(
            'abogado_contraparte',
            sql.NVarChar(500),
            data.abogado_contraparte ?? null
        )
        .input(
            'fecha_estimada_cierre',
            sql.DateTime,
            data.fecha_estimada_cierre ?? null
        )
        .input(
            'fecha_procesal_proximo',
            sql.DateTime,
            data.fecha_procesal_proximo ?? null
        )
        .input(
            'fecha_vencimiento',
            sql.DateTime,
            data.fecha_vencimiento ?? null
        )
        .input('prioridad', sql.Int, data.prioridad ?? null)
        .input('origen_caso', sql.NVarChar(200), data.origen_caso ?? null)
        .input('causa_id', sql.Int, data.causa_id ?? null)
        .query(`
            INSERT INTO expediente (
                tipo_expediente,
                estado_expediente,
                usuario_principal,
                usuario_secundario,
                usuario_creacion,
                usuario_ultima_modificacion,
                cliente,
                rol_cliente,
                area,
                caratula,
                fecha_inicio,
                fecha_ult_actuacion,
                descripcion,
                fuero,
                juzgado,
                secretaria,
                jurisdiccion,
                numero_expediente_judicial,
                instancia,
                contraparte,
                abogado_contraparte,
                fecha_estimada_cierre,
                fecha_procesal_proximo,
                fecha_vencimiento,
                prioridad,
                origen_caso,
                causa_id,
                fecha_creacion,
                fecha_ultima_modificacion,
                activo
            )
            OUTPUT INSERTED.id
            VALUES (
                @tipo_expediente,
                @estado_expediente,
                @usuario_principal,
                @usuario_secundario,
                @usuario_creacion,
                @usuario_ultima_modificacion,
                @cliente,
                @rol_cliente,
                @area,
                @caratula,
                @fecha_inicio,
                @fecha_ult_actuacion,
                @descripcion,
                @fuero,
                @juzgado,
                @secretaria,
                @jurisdiccion,
                @numero_expediente_judicial,
                @instancia,
                @contraparte,
                @abogado_contraparte,
                @fecha_estimada_cierre,
                @fecha_procesal_proximo,
                @fecha_vencimiento,
                @prioridad,
                @origen_caso,
                @causa_id,
                GETDATE(),
                GETDATE(),
                1
            )
        `);

    const id = resultado.recordset[0].id;

    // si hay transaccion, todavia no hacemos una consulta desde otro pool
    if (transaction) {
        return { id };
    }

    return getById(id);
}

// actualiza solo los campos que vienen en el body
async function actualizar(id, data, transaction = null) {
    let request;

    if (transaction) {
        request = new sql.Request(transaction);
    } else {
        const pool = await conectarBD();
        request = pool.request();
    }

    request.input('id', sql.Int, id);

    const campos = [];

    const agregarCampo = (campo, tipo, valor) => {
        if (valor !== undefined) {
            request.input(campo, tipo, valor);
            campos.push(`${campo} = @${campo}`);
        }
    };

    agregarCampo(
        'tipo_expediente',
        sql.Int,
        data.tipo_expediente
    );

    agregarCampo(
        'estado_expediente',
        sql.Int,
        data.estado_expediente
    );

    agregarCampo(
        'usuario_principal',
        sql.Int,
        data.usuario_principal
    );

    agregarCampo(
        'usuario_secundario',
        sql.Int,
        data.usuario_secundario
    );

    agregarCampo(
        'cliente',
        sql.Int,
        data.cliente
    );

    agregarCampo(
        'rol_cliente',
        sql.Int,
        data.rol_cliente
    );

    agregarCampo(
        'area',
        sql.NVarChar(100),
        data.area
    );

    agregarCampo(
        'caratula',
        sql.NVarChar(500),
        data.caratula
    );

    agregarCampo(
        'fecha_inicio',
        sql.DateTime,
        data.fecha_inicio
    );

    agregarCampo(
        'descripcion',
        sql.NVarChar(sql.MAX),
        data.descripcion
    );

    agregarCampo(
        'fuero',
        sql.NVarChar(100),
        data.fuero
    );

    agregarCampo(
        'juzgado',
        sql.NVarChar(200),
        data.juzgado
    );

    agregarCampo(
        'secretaria',
        sql.NVarChar(200),
        data.secretaria
    );

    agregarCampo(
        'jurisdiccion',
        sql.NVarChar(200),
        data.jurisdiccion
    );

    agregarCampo(
        'numero_expediente_judicial',
        sql.NVarChar(100),
        data.numero_expediente_judicial
    );

    agregarCampo(
        'instancia',
        sql.NVarChar(100),
        data.instancia
    );

    agregarCampo(
        'contraparte',
        sql.NVarChar(500),
        data.contraparte
    );

    agregarCampo(
        'abogado_contraparte',
        sql.NVarChar(500),
        data.abogado_contraparte
    );

    agregarCampo(
        'fecha_estimada_cierre',
        sql.DateTime,
        data.fecha_estimada_cierre
    );

    agregarCampo(
        'fecha_procesal_proximo',
        sql.DateTime,
        data.fecha_procesal_proximo
    );

    agregarCampo(
        'fecha_vencimiento',
        sql.DateTime,
        data.fecha_vencimiento
    );

    agregarCampo(
        'prioridad',
        sql.Int,
        data.prioridad
    );

    agregarCampo(
        'origen_caso',
        sql.NVarChar(200),
        data.origen_caso
    );

    if (campos.length === 0) {
        throw new Error('No hay campos para actualizar');
    }

    campos.push('fecha_ultima_modificacion = GETDATE()');
    campos.push('fecha_ult_actuacion = GETDATE()');

    await request.query(`
        UPDATE expediente
        SET ${campos.join(', ')}
        WHERE id = @id
          AND activo = 1
    `);

    if (transaction) {
        return { id };
    }

    return getById(id);
}

// baja logica del expediente, no lo borra fisicamente
async function eliminar(id) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, id)
        .query(`
            UPDATE expediente
            SET activo = 0, fecha_ultima_modificacion = GETDATE()
            WHERE id = @id
        `);
}

module.exports = { getAll, getById, crear, actualizar, eliminar };