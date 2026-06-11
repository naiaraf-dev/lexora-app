const crypto = require('crypto');
const authRepository = require('../repositories/auth.repository');
const { sendPasswordResetEmail } = require('./email.service');

async function register(username, email, password) {
    return await authRepository.registerUser(username, email, password);
}

async function login(email, password) {
    return await authRepository.loginUser(email, password);
}

async function logout() {
    return await authRepository.logoutUser();
}

async function forgotPassword(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('Email not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await authRepository.saveResetToken(email, token, expiresAt);
    await sendPasswordResetEmail(email, token);
}

async function resetPassword(token, newPassword) {
    const user = await authRepository.findUserByResetToken(token);
    if (!user) throw new Error('Invalid or expired token');

    const newHash = await authRepository.hashPassword(newPassword);
    await authRepository.updatePasswordAndClearToken(user.id, newHash);
}

module.exports = {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword
};
