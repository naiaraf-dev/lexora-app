const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');
const { sendPasswordResetEmail } = require('./email.service');

// clave para firmar los tokens jwt: tiene que ser la misma que valida auth.middleware
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET no está definido en las variables de entorno');

// registra el usuario y le genera un token para dejarlo logueado
async function register(nombre, apellido, email, password, matricula) {
    const user = await authRepository.registerUser(nombre, apellido, email, password, matricula);
    const token = jwt.sign(
        { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
    return { token };
}

// valida login y genera un token con los datos basicos del usuario
async function login(email, password) {
    const user = await authRepository.loginUser(email, password);
    const token = jwt.sign(
        { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
    return { token };
}

// cierra sesion, aunque en este caso casi todo se maneja del lado del token
async function logout() {
    return await authRepository.logoutUser();
}

// genera un token de recuperacion y lo manda por mail
async function forgotPassword(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('Email not found');

    // token aleatorio para recuperar contraseña, valido por 1 hora
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await authRepository.saveResetToken(email, token, expiresAt);
    await sendPasswordResetEmail(email, token);
}

// valida el token de recuperacion y guarda la nueva contraseña
async function resetPassword(token, newPassword) {
    const user = await authRepository.findUserByResetToken(token);
    if (!user) throw new Error('Invalid or expired token');

    const newHash = await authRepository.hashPassword(newPassword);
    await authRepository.updatePasswordAndClearToken(user.id, newHash);
}

module.exports = { register, login, logout, forgotPassword, resetPassword };