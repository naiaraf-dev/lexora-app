const { sql, conectarBD } = require('../config/db');

async function getAll({ numero, causa, caratula, area, tipo, estado, clienteId, pagina = 1, pageSize = 25 }) {
    const pool = await conectarBD();
    const req = pool.request();

    let where = 'WHERE e.activo = 1';

    if (numero) {
        req.input('numero', sql.NVarChar, `%${numero}%`);
        where += ' AND e.numero_expediente_judicial LIKE @numero';
    }
    if (causa) {
        req.input('causa', sql.NVarChar, `%${causa}%`);
        where += ' AND e.caratula LIKE @causa';
    }
    if (caratula) {
        req.input('caratula', sql.NVarChar, `%${caratula}%`);
        where += ' AND e.caratula LIKE @caratula';
    }
    if (area) {
        req.input('area', sql.NVarChar, area);
        where += ' AND e.fuero = @area';
    }
    if (tipo) {
        req.input('tipo', sql.Int, tipo);
        where += ' AND e.tipo_expediente = @tipo';
    }
    if (estado) {
        req.input('estado', sql.Int, estado);
        where += ' AND e.estado_nodo = @estado';
    }
    if (clienteId) {
        req.input('clienteId', sql.Int, clienteId);
        where += ' AND e.cliente = @clienteId';
    }

    const offset = (pagina - 1) * pageSize;
    req.input('offset',   sql.Int, offset);
    req.input('pageSize', sql.Int, pageSize);

    const resultado = await req.query(`
        SELECT
            e.id,
            e.numero_expediente_judicial   AS numero,
            e.caratula,
            e.fuero                        AS area,
            e.fecha_inicio,
            e.fecha_ult_actuacion          AS ultimaActualizacion,
            e.activo,
            te.id                          AS tipoId,
            te.nombre                      AS tipoNombre,
            ee.id                          AS estadoId,
            ee.nombre                      AS estadoNombre,
            c.id                           AS clienteId,
            c.nombre                       AS clienteNombre,
            u.id                           AS usuarioPrincipalId,
            u.nombre + ' ' + u.apellido    AS usuarioPrincipalNombre,
            COUNT(*) OVER()                AS totalRegistros
        FROM expediente e
        LEFT JOIN tipoexpediente  te ON te.id = e.tipo_expediente
        LEFT JOIN estadoexpediente ee ON ee.id = e.estado_nodo
        LEFT JOIN cliente          c  ON c.id  = e.cliente
        LEFT JOIN usuario          u  ON u.id  = e.usuario_principal
        ${where}
        ORDER BY e.fecha_ult_actuacion DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return resultado.recordset;
}

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
                c.nombre                        AS clienteNombre,
                up.id                           AS usuarioPrincipalId,
                up.nombre + ' ' + up.apellido   AS usuarioPrincipalNombre,
                us.id                           AS usuarioSecundarioId,
                us.nombre + ' ' + us.apellido   AS usuarioSecundarioNombre,
                p.nombre                        AS prioridadNombre,
                cat.nombre                      AS categoriaNombre
            FROM expediente e
            LEFT JOIN tipoexpediente   te  ON te.id  = e.tipo_expediente
            LEFT JOIN estadoexpediente ee  ON ee.id  = e.estado_nodo
            LEFT JOIN cliente          c   ON c.id   = e.cliente
            LEFT JOIN usuario          up  ON up.id  = e.usuario_principal
            LEFT JOIN usuario          us  ON us.id  = e.usuario_secundario
            LEFT JOIN prioridad        p   ON p.id   = e.prioridad
            LEFT JOIN categoria        cat ON cat.id = e.categoria
            WHERE e.id = @id AND e.activo = 1
        `);

    return resultado.recordset[0] ?? null;
}

async function crear(data) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('tipo_expediente',          sql.Int,           data.tipo_expediente)
        .input('estado_nodo',              sql.Int,           data.estado_nodo)
        .input('usuario_principal',        sql.Int,           data.usuario_principal)
        .input('usuario_secundario',       sql.Int,           data.usuario_secundario       ?? null)
        .input('usuario_creacion',         sql.Int,           data.usuario_creacion)
        .input('cliente',                  sql.Int,           data.cliente                  ?? null)
        .input('caratula',                 sql.NVarChar(500), data.caratula)
        .input('fecha_inicio',             sql.DateTime,      data.fecha_inicio             ?? new Date())
        .input('fecha_ult_actuacion',      sql.DateTime,      data.fecha_ult_actuacion      ?? new Date())
        .input('descripcion',              sql.NVarChar(sql.MAX), data.descripcion          ?? null)
        .input('fuero',                    sql.NVarChar(100), data.fuero                    ?? null)
        .input('juzgado',                  sql.NVarChar(200), data.juzgado                  ?? null)
        .input('secretaria',               sql.NVarChar(200), data.secretaria               ?? null)
        .input('jurisdiccion',             sql.NVarChar(200), data.jurisdiccion             ?? null)
        .input('numero_expediente_judicial',sql.NVarChar(100),data.numero_expediente_judicial ?? null)
        .input('instancia',                sql.NVarChar(100), data.instancia                ?? null)
        .input('estado_sede',              sql.NVarChar(100), data.estado_sede              ?? null)
        .input('contraparte',              sql.NVarChar(500), data.contraparte              ?? null)
        .input('abogado_contraparte',      sql.NVarChar(500), data.abogado_contraparte      ?? null)
        .input('fecha_estimada_cierre',    sql.DateTime,      data.fecha_estimada_cierre    ?? null)
        .input('fecha_proxima_proxima',    sql.DateTime,      data.fecha_proxima_proxima    ?? null)
        .input('fecha_vencimiento',        sql.DateTime,      data.fecha_vencimiento        ?? null)
        .input('prioridad',                sql.Int,           data.prioridad                ?? null)
        .input('categoria',                sql.Int,           data.categoria                ?? null)
        .input('origen_caso',              sql.NVarChar(200), data.origen_caso              ?? null)
        .query(`
            INSERT INTO expediente (
                tipo_expediente, estado_nodo, usuario_principal, usuario_secundario,
                usuario_creacion, cliente, caratula, fecha_inicio, fecha_ult_actuacion,
                descripcion, fuero, juzgado, secretaria, jurisdiccion,
                numero_expediente_judicial, instancia, estado_sede, contraparte,
                abogado_contraparte, fecha_estimada_cierre, fecha_proxima_proxima,
                fecha_vencimiento, prioridad, categoria, origen_caso,
                fecha_creacion, fecha_ultima_modificacion, activo
            )
            OUTPUT INSERTED.id
            VALUES (
                @tipo_expediente, @estado_nodo, @usuario_principal, @usuario_secundario,
                @usuario_creacion, @cliente, @caratula, @fecha_inicio, @fecha_ult_actuacion,
                @descripcion, @fuero, @juzgado, @secretaria, @jurisdiccion,
                @numero_expediente_judicial, @instancia, @estado_sede, @contraparte,
                @abogado_contraparte, @fecha_estimada_cierre, @fecha_proxima_proxima,
                @fecha_vencimiento, @prioridad, @categoria, @origen_caso,
                GETDATE(), GETDATE(), 1
            )
        `);

    const id = resultado.recordset[0].id;
    return getById(id);
}

async function actualizar(id, data) {
    const pool = await conectarBD();
    const req = pool.request().input('id', sql.Int, id);

    const campos = [];

    const agregarCampo = (campo, tipo, valor) => {
        if (valor !== undefined) {
            req.input(campo, tipo, valor);
            campos.push(`${campo} = @${campo}`);
        }
    };

    agregarCampo('tipo_expediente',           sql.Int,               data.tipo_expediente);
    agregarCampo('estado_nodo',               sql.Int,               data.estado_nodo);
    agregarCampo('usuario_principal',         sql.Int,               data.usuario_principal);
    agregarCampo('usuario_secundario',        sql.Int,               data.usuario_secundario);
    agregarCampo('cliente',                   sql.Int,               data.cliente);
    agregarCampo('caratula',                  sql.NVarChar(500),     data.caratula);
    agregarCampo('fecha_inicio',              sql.DateTime,          data.fecha_inicio);
    agregarCampo('descripcion',               sql.NVarChar(sql.MAX), data.descripcion);
    agregarCampo('fuero',                     sql.NVarChar(100),     data.fuero);
    agregarCampo('juzgado',                   sql.NVarChar(200),     data.juzgado);
    agregarCampo('secretaria',                sql.NVarChar(200),     data.secretaria);
    agregarCampo('jurisdiccion',              sql.NVarChar(200),     data.jurisdiccion);
    agregarCampo('numero_expediente_judicial',sql.NVarChar(100),     data.numero_expediente_judicial);
    agregarCampo('instancia',                 sql.NVarChar(100),     data.instancia);
    agregarCampo('estado_sede',               sql.NVarChar(100),     data.estado_sede);
    agregarCampo('contraparte',               sql.NVarChar(500),     data.contraparte);
    agregarCampo('abogado_contraparte',       sql.NVarChar(500),     data.abogado_contraparte);
    agregarCampo('fecha_estimada_cierre',     sql.DateTime,          data.fecha_estimada_cierre);
    agregarCampo('fecha_proxima_proxima',     sql.DateTime,          data.fecha_proxima_proxima);
    agregarCampo('fecha_vencimiento',         sql.DateTime,          data.fecha_vencimiento);
    agregarCampo('prioridad',                 sql.Int,               data.prioridad);
    agregarCampo('categoria',                 sql.Int,               data.categoria);
    agregarCampo('origen_caso',               sql.NVarChar(200),     data.origen_caso);

    if (campos.length === 0) throw new Error('No hay campos para actualizar');

    campos.push('fecha_ultima_modificacion = GETDATE()');
    // También actualizamos fecha_ult_actuacion al editar
    campos.push('fecha_ult_actuacion = GETDATE()');

    await req.query(`
        UPDATE expediente
        SET ${campos.join(', ')}
        WHERE id = @id AND activo = 1
    `);

    return getById(id);
}

async function eliminar(id) {
    // Baja lógica
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