const sql = require('mssql');
const { conectarBD } = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function registerUser(name, lastName, email, password, matricula) {
    const hashedPassword = await hashPassword(password);
    const pool = await conectarBD();
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

async function loginUser(email, password) {
    const user = await findUserByEmail(email);
    if (!user) throw new Error('User not found');
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) throw new Error('Invalid password');
    return user;
}

async function logoutUser() {
    return;
}

async function saveResetToken(email, token, expiresAt) {
    const pool = await conectarBD();
    const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('token', sql.NVarChar(64), token)
        .input('expires', sql.DateTime2, expiresAt)
        .query('UPDATE usuario SET password_token = @token, password_token_expires = @expires WHERE email = @email');
    if (result.rowsAffected[0] === 0) throw new Error('Email not found');
}

async function findUserByResetToken(token) {
    const pool = await conectarBD();
    const result = await pool.request()
        .input('token', sql.NVarChar(64), token)
        .input('now', sql.DateTime2, new Date())
        .query('SELECT * FROM usuario WHERE password_token = @token AND password_token_expires > @now');
    return result.recordset[0];
}

async function updatePasswordAndClearToken(userId, newPasswordHash) {
    const pool = await conectarBD();
    await pool.request()
        .input('id', sql.Int, userId)
        .input('hash', sql.NVarChar(sql.MAX), newPasswordHash)
        .query('UPDATE usuario SET password_hash = @hash, password_token = NULL, password_token_expires = NULL WHERE id = @id');
}

async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

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
