const sql = require('mssql');
const { conectarBD } = require('../config/db');

async function getAll() {
    const pool = await conectarBD();
    const result = await pool.request().query(`
        SELECT id, nombre, apellido, email, telefono, dni, cuit, activo,
               direccion, observaciones, fecha_carga, fecha_nacimiento,
               fecha_ultima_modificacion, tipo_cliente, rol_cliente
        FROM cliente
        ORDER BY apellido, nombre
    `);
    return result.recordset;
}

async function getById(id) {
    const pool = await conectarBD();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT id, nombre, apellido, email, telefono, dni, cuit, activo,
                   direccion, observaciones, fecha_carga, fecha_nacimiento,
                   fecha_ultima_modificacion, tipo_cliente, rol_cliente
            FROM cliente
            WHERE id = @id
        `);
    return result.recordset[0];
}

async function create(datos) {
    const { nombre, apellido, email, telefono, dni, cuit, activo,
            direccion, observaciones, fecha_nacimiento, tipo_cliente, rol_cliente } = datos;

    const pool = await conectarBD();
    const result = await pool.request()
        .input('nombre', sql.NVarChar(100), nombre)
        .input('apellido', sql.NVarChar(100), apellido)
        .input('email', sql.NVarChar(150), email ?? null)
        .input('telefono', sql.NVarChar(100), telefono ?? null)
        .input('dni', sql.NVarChar(100), dni ?? null)
        .input('cuit', sql.NVarChar(100), cuit ?? null)
        .input('activo', sql.Bit, activo ?? true)
        .input('direccion', sql.NVarChar(200), direccion ?? null)
        .input('observaciones', sql.NVarChar(sql.MAX), observaciones ?? null)
        .input('fecha_nacimiento', sql.DateTime2, fecha_nacimiento ?? null)
        .input('tipo_cliente', sql.Int, tipo_cliente ?? null)
        .input('rol_cliente', sql.Int, rol_cliente ?? null)
        .query(`
            INSERT INTO cliente (nombre, apellido, email, telefono, dni, cuit, activo,
                                    direccion, observaciones, fecha_carga, fecha_nacimiento,
                                    tipo_cliente, rol_cliente, fecha_ultima_modificacion)
            OUTPUT INSERTED.*
            VALUES (@nombre, @apellido, @email, @telefono, @dni, @cuit, @activo,
                    @direccion, @observaciones, SYSDATETIME(), @fecha_nacimiento,
                    @tipo_cliente, @rol_cliente, SYSDATETIME())
        `);
    return result.recordset[0];
}

async function update(id, datos) {
    const { nombre, apellido, email, telefono, dni, cuit, activo,
            direccion, observaciones, fecha_nacimiento, tipo_cliente, rol_cliente } = datos;

    const pool = await conectarBD();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('nombre', sql.NVarChar(100), nombre)
        .input('apellido', sql.NVarChar(100), apellido)
        .input('email', sql.NVarChar(150), email ?? null)
        .input('telefono', sql.NVarChar(100), telefono ?? null)
        .input('dni', sql.NVarChar(100), dni ?? null)
        .input('cuit', sql.NVarChar(100), cuit ?? null)
        .input('activo', sql.Bit, activo ?? true)
        .input('direccion', sql.NVarChar(200), direccion ?? null)
        .input('observaciones', sql.NVarChar(sql.MAX), observaciones ?? null)
        .input('fecha_nacimiento', sql.DateTime2, fecha_nacimiento ?? null)
        .input('tipo_cliente', sql.Int, tipo_cliente ?? null)
        .input('rol_cliente', sql.Int, rol_cliente ?? null)
        .query(`
            UPDATE cliente
            SET nombre = @nombre,
                apellido = @apellido,
                email = @email,
                telefono = @telefono,
                dni = @dni,
                cuit = @cuit,
                activo = @activo,
                direccion = @direccion,
                observaciones = @observaciones,
                fecha_nacimiento = @fecha_nacimiento,
                fecha_ultima_modificacion = SYSDATETIME(),
                tipo_cliente = @tipo_cliente,
                rol_cliente = @rol_cliente
            OUTPUT INSERTED.*
            WHERE id = @id
        `);
    return result.recordset[0];
}

module.exports = { getAll, getById, create, update };
