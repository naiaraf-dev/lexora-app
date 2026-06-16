const { sql, conectarBD } = require('../config/db');

async function getById(id) {
    const pool = await conectarBD();
    const res = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT u.*, ru.nombre AS rolNombre
            FROM usuario u
            LEFT JOIN rolusuario ru ON ru.id = u.rol_usuario
            WHERE u.id = @id AND u.activo = 1
        `);
    return res.recordset[0] ?? null;
}

async function getAll() {
    const pool = await conectarBD();
    const res = await pool.request().query(`
        SELECT id, nombre, apellido, email, matricula, rol_usuario
        FROM usuario
        WHERE activo = 1
        ORDER BY apellido, nombre
    `);
    return res.recordset;
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

    agregarCampo('nombre', sql.NVarChar(100), data.nombre);
    agregarCampo('apellido', sql.NVarChar(100), data.apellido);
    agregarCampo('email', sql.NVarChar(150), data.email);
    agregarCampo('matricula', sql.NVarChar(200), data.matricula);

    if (campos.length === 0) return getById(id);

    await req.query(`UPDATE usuario SET ${campos.join(', ')} WHERE id = @id AND activo = 1`);
    return getById(id);
}

async function actualizarImagen(id, avatarUrl) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, id)
        .input('avatar_url', sql.NVarChar(sql.MAX), avatarUrl)
        .query('UPDATE usuario SET avatar_url = @avatar_url WHERE id = @id AND activo = 1');
    return getById(id);
}

async function cambiarPassword(id, passwordHash) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, id)
        .input('password_hash', sql.NVarChar(sql.MAX), passwordHash)
        .query('UPDATE usuario SET password_hash = @password_hash WHERE id = @id AND activo = 1');
}

async function eliminar(id) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, id)
        .query('UPDATE usuario SET activo = 0 WHERE id = @id');
}

module.exports = { getById, getAll, actualizar, actualizarImagen, cambiarPassword, eliminar };
