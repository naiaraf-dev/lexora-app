const authService = require('../services/auth.service');

// registra un usuario nuevo y devuelve el token
async function register(req, res) {
    try {
        const result = await authService.register(req.body.nombre, req.body.apellido, req.body.email, req.body.password, req.body.matricula);
        res.status(201).json({ message: 'User registered successfully', token: result.token });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
}

// valida el email y contraseña, y devuelve el token si esta todo bien
async function login(req, res) {
    try {
        const result = await authService.login(req.body.email, req.body.password);
        res.status(200).json({ message: 'User logged in successfully', token: result.token });
    } catch (error) {
        res.status(401).json({ message: 'Invalid credentials', error: error.message });
    }
}

// cierra la sesion del usuario
async function logout(req, res) {
    try {
        await authService.logout();
        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
}

// manda el mail para recuperar la contraseña
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        await authService.forgotPassword(email);
        res.status(200).json({ message: 'Si el email existe, vas a recibir un link para restablecer tu contraseña.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

// cambia la contraseña usando el token de recuperacion
async function resetPassword(req, res) {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and password are required' });
        }
        await authService.resetPassword(token, password);
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

module.exports = {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword
};