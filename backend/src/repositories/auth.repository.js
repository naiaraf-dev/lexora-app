const sql = require('mssql');
const { conectarBD } = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// registra un usuario nuevo en la base
async function registerUser(name, lastName, email, password, matricula) {
    // antes de guardar la contraseña, la hashea para no guardarla en texto plano
    const hashedPassword = await hashPassword(password);
    const pool = await conectarBD();

    // valida que no exista otro usuario con el mismo email
    if (await findUserByEmail(email)) {
        throw new Error('Email already in use');
    }

    const result = await pool.request()
        .input('nombre', sql.NVarChar, name)
        .input('apellido', sql.NVarChar, lastName)
        .input('email', sql.NVarChar, email)
        .input('password_hash', sql.NVarChar, hashedPassword)
        .input('rol_usuario', sql.Int, 1)
        .input('matricula', sql.NVarChar, matricula)
        .query('INSERT INTO usuario (nombre, apellido, email, password_hash, matricula, rol_usuario) OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.apellido, INSERTED.email VALUES (@nombre, @apellido, @email, @password_hash, @matricula, @rol_usuario)');
    return result.recordset[0];
}

// busca el usuario por email y valida la contraseña
async function loginUser(email, password) {
    const user = await findUserByEmail(email);
    if (!user) throw new Error('User not found');

    // compara la contraseña ingresada con el hash guardado
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) throw new Error('Invalid password');
    return user;
}

// no hace nada del lado del servidor, porque el cierre de sesion se maneja desde el token
async function logoutUser() {
    return;
}

// guarda el token para recuperar contraseña y su fecha de vencimiento
async function saveResetToken(email, token, expiresAt) {
    const pool = await conectarBD();
    const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('token', sql.NVarChar(64), token)
        .input('expires', sql.DateTime2, expiresAt)
        .query('UPDATE usuario SET password_token = @token, password_token_expires = @expires WHERE email = @email');
    if (result.rowsAffected[0] === 0) throw new Error('Email not found');
}

// busca un usuario por token de recuperacion, solo si el token no vencio
async function findUserByResetToken(token) {
    const pool = await conectarBD();
    const result = await pool.request()
        .input('token', sql.NVarChar(64), token)
        .input('now', sql.DateTime2, new Date())
        .query('SELECT * FROM usuario WHERE password_token = @token AND password_token_expires > @now');
    return result.recordset[0];
}

// actualiza la contraseña y borra el token para que no se pueda volver a usar
async function updatePasswordAndClearToken(userId, newPasswordHash) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, userId)
        .input('hash', sql.NVarChar(sql.MAX), newPasswordHash)
        .query('UPDATE usuario SET password_hash = @hash, password_token = NULL, password_token_expires = NULL WHERE id = @id');
}

// compara una contraseña normal contra una contraseña hasheada
async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

// genera el hash de la contraseña con bcrypt
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// busca un usuario por email
async function findUserByEmail(email) {
    const pool = await conectarBD();
    const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT * FROM usuario WHERE email = @email');
    return result.recordset[0];
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    saveResetToken,
    findUserByResetToken,
    updatePasswordAndClearToken,
    hashPassword,
    findUserByEmail
};