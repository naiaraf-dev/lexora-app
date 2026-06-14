const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');
const { sendPasswordResetEmail } = require('./email.service');

const JWT_SECRET = process.env.JWT_SECRET || 'lexora-dev-secret-changeme';

async function register(nombre, apellido, email, password) {
    return await authRepository.registerUser(nombre, apellido, email, password);
}

async function login(email, password) {
    const user = await authRepository.loginUser(email, password);
    const token = jwt.sign(
        { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
    return { token };
}

async function logout() {
    return await authRepository.logoutUser();
}

async function forgotPassword(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('Email not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await authRepository.saveResetToken(email, token, expiresAt);
    await sendPasswordResetEmail(email, token);
}

async function resetPassword(token, newPassword) {
    const user = await authRepository.findUserByResetToken(token);
    if (!user) throw new Error('Invalid or expired token');

    const newHash = await authRepository.hashPassword(newPassword);
    await authRepository.updatePasswordAndClearToken(user.id, newHash);
}

module.exports = { register, login, logout, forgotPassword, resetPassword };
