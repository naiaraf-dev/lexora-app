const sql = require('mssql');
const { conectarDB } = require('../config/db.config');
const bcrypt = require('bcrypt');

async function registerUser(username, email, password) {
    const hashedPassword = await hashPassword(password);
    try {
        const pool = await conectarDB();
        if(await findUserByEmail(email)) {
            throw new Error('Email already in use');
        }
        const result = await pool.request()
            .input('Username', sql.VarChar, username)
            .input('Email', sql.VarChar, email)
            .input('Password', sql.VarChar, hashedPassword)
            .query('INSERT INTO Users (Username, Email, Password) VALUES (@Username, @Email, @Password)');
        return result;
    } catch (error) {
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const user = await findUserByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await comparePassword(password, user.Password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }
        return user;
    } catch (error) {
        throw error;
    }
}

async function logoutUser() {
    // Implement logout logic if needed (e.g., token invalidation)
    return;
}

async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

async function findUserByEmail(email) {
    try {
        const pool = await conectarDB();
        const result = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE Email = @Email');
        return result.recordset[0];
    } catch (error) {
        throw error;
    }
}

module.exports = {
    registerUser,
    loginUser,
    findUserByEmail
};