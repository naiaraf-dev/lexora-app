const { sql, conectarBD } = require('../config/db');

async function getAllByExpediente(expedienteId) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('expedienteId', sql.Int, expedienteId)
        .query(`
            SELECT
                n.id,
                n.expediente,
                n.fec,
                n.titulo,
                n.descripcion,
                n.es_principal,
                n.activo,
                tn.id       AS tipoNovedadId,
                tn.nombre   AS tipoNovedadNombre,
                u.id        AS usuarioCreacionId,
                u.nombre + ' ' + u.apellido AS usuarioCreacionNombre,
                n.fecha_creacion,
                n.fecha_ultima_modificacion
            FROM novedad n
            LEFT JOIN tiponovedad tn ON tn.id = n.tipo_novedad
            LEFT JOIN usuario     u  ON u.id  = n.usuario_creacion
            WHERE n.expediente = @expedienteId AND n.activo = 1
            ORDER BY n.fec DESC
        `);

    return resultado.recordset;
}

async function getById(id) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT
                n.id,
                n.expediente,
                n.fec,
                n.titulo,
                n.descripcion,
                n.es_principal,
                n.activo,
                tn.id       AS tipoNovedadId,
                tn.nombre   AS tipoNovedadNombre,
                u.id        AS usuarioCreacionId,
                u.nombre + ' ' + u.apellido AS usuarioCreacionNombre,
                n.fecha_creacion,
                n.fecha_ultima_modificacion
            FROM novedad n
            LEFT JOIN tiponovedad tn ON tn.id = n.tipo_novedad
            LEFT JOIN usuario     u  ON u.id  = n.usuario_creacion
            WHERE n.id = @id AND n.activo = 1
        `);

    return resultado.recordset[0] ?? null;
}

async function crear(data) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('expediente',      sql.Int,                data.expediente)
        .input('fec',             sql.DateTime,           data.fec ?? new Date())
        .input('titulo',          sql.NVarChar(200),      data.titulo)
        .input('descripcion',     sql.NVarChar(sql.MAX),  data.descripcion ?? null)
        .input('es_principal',    sql.Bit,                data.es_principal ?? false)
        .input('tipo_novedad',    sql.Int,                data.tipo_novedad ?? null)
        .input('usuario_creacion',sql.Int,                data.usuario_creacion)
        .query(`
            INSERT INTO novedad (
                expediente, fec, titulo, descripcion, es_principal,
                tipo_novedad, usuario_creacion,
                fecha_creacion, fecha_ultima_modificacion, activo
            )
            OUTPUT INSERTED.id
            VALUES (
                @expediente, @fec, @titulo, @descripcion, @es_principal,
                @tipo_novedad, @usuario_creacion,
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

    agregarCampo('fec',          sql.DateTime,          data.fec);
    agregarCampo('titulo',       sql.NVarChar(200),     data.titulo);
    agregarCampo('descripcion',  sql.NVarChar(sql.MAX), data.descripcion);
    agregarCampo('es_principal', sql.Bit,               data.es_principal);
    agregarCampo('tipo_novedad', sql.Int,               data.tipo_novedad);

    if (campos.length === 0) throw new Error('No hay campos para actualizar');

    campos.push('fecha_ultima_modificacion = GETDATE()');

    await req.query(`
        UPDATE novedad
        SET ${campos.join(', ')}
        WHERE id = @id AND activo = 1
    `);

    return getById(id);
}

async function eliminar(id) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, id)
        .query(`
            UPDATE novedad
            SET activo = 0, fecha_ultima_modificacion = GETDATE()
            WHERE id = @id
        `);
}

module.exports = { getAllByExpediente, getById, crear, actualizar, eliminar };