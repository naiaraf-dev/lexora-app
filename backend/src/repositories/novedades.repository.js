const { sql, conectarBD } = require('../config/db');

// trae todas las novedades activas de un expediente
async function getAllByExpediente(expedienteId) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('expedienteId', sql.Int, expedienteId)
        .query(`
            SELECT
                n.id,
                n.expediente,
                n.fecha_novedad,
                n.titulo,
                n.descripcion,
                n.es_procesal,
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
            ORDER BY n.fecha_novedad DESC
        `);

    return resultado.recordset;
}

// trae una novedad puntual por id
async function getById(id) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT
                n.id,
                n.expediente,
                n.fecha_novedad,
                n.titulo,
                n.descripcion,
                n.es_procesal,
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

// crea una novedad nueva y despues la devuelve completa
async function crear(data) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('expediente', sql.Int, data.expediente)
        .input('fecha_novedad', sql.DateTime, data.fecha_novedad ?? new Date())
        .input('titulo', sql.NVarChar(200), data.titulo)
        .input('descripcion', sql.NVarChar(sql.MAX), data.descripcion ?? null)
        .input('es_procesal', sql.Bit, data.es_procesal ?? false)
        .input('tipo_novedad', sql.Int, data.tipo_novedad ?? null)
        .input('usuario_creacion', sql.Int, data.usuario_creacion)
        .query(`
            INSERT INTO novedad (
                expediente, fecha_novedad, titulo, descripcion, es_procesal,
                tipo_novedad, usuario_creacion,
                fecha_creacion, fecha_ultima_modificacion, activo
            )
            OUTPUT INSERTED.id
            VALUES (
                @expediente, @fecha_novedad, @titulo, @descripcion, @es_procesal,
                @tipo_novedad, @usuario_creacion,
                GETDATE(), GETDATE(), 1
            )
        `);

    const id = resultado.recordset[0].id;
    return getById(id);
}

// actualiza solo los campos que vienen en el body
async function actualizar(id, data) {
    const pool = await conectarBD();
    const req = pool.request().input('id', sql.Int, id);

    const campos = [];

    // agrega al update solamente los campos que llegaron
    const agregarCampo = (campo, tipo, valor) => {
        if (valor !== undefined) {
            req.input(campo, tipo, valor);
            campos.push(`${campo} = @${campo}`);
        }
    };

    agregarCampo('fecha_novedad', sql.DateTime, data.fecha_novedad);
    agregarCampo('titulo', sql.NVarChar(200), data.titulo);
    agregarCampo('descripcion', sql.NVarChar(sql.MAX), data.descripcion);
    agregarCampo('es_procesal', sql.Bit, data.es_procesal);
    agregarCampo('tipo_novedad', sql.Int, data.tipo_novedad);

    if (campos.length === 0) throw new Error('No hay campos para actualizar');

    campos.push('fecha_ultima_modificacion = GETDATE()');

    await req.query(`
        UPDATE novedad
        SET ${campos.join(', ')}
        WHERE id = @id AND activo = 1
    `);

    return getById(id);
}

// baja logica de la novedad, no la borra fisicamente
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