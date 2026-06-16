const service = require('../services/usuarios.service');

async function getPerfil(req, res) {
    try {
        const perfil = await service.getPerfil(req.usuario.id);
        res.json(perfil);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al obtener perfil',
            error: error.message,
        });
    }
}

async function actualizarPerfil(req, res) {
    try {
        const perfil = await service.actualizarPerfil(req.usuario.id, req.body);
        res.json(perfil);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al actualizar perfil',
            error: error.message,
        });
    }
}

async function actualizarImagen(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ mensaje: 'No se proporcionó una imagen' });
        }

        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const perfil = await service.actualizarImagen(req.usuario.id, base64);
        res.json(perfil);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al actualizar imagen',
            error: error.message,
        });
    }
}

async function cambiarPassword(req, res) {
    try {
        const { actual, nueva } = req.body;
        if (!actual || !nueva) {
            return res.status(400).json({ mensaje: 'Contraseña actual y nueva son obligatorias' });
        }
        if (nueva.length < 8) {
            return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });
        }

        await service.cambiarPassword(req.usuario.id, actual, nueva);
        res.json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al cambiar contraseña',
            error: error.message,
        });
    }
}

async function eliminarCuenta(req, res) {
    try {
        await service.eliminarCuenta(req.usuario.id);
        res.json({ mensaje: 'Cuenta eliminada correctamente' });
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al eliminar cuenta',
            error: error.message,
        });
    }
}

async function getAll(req, res) {
    try {
        const usuarios = await service.getAll();
        res.json(usuarios);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al obtener usuarios',
            error: error.message,
        });
    }
}

module.exports = { getPerfil, actualizarPerfil, actualizarImagen, cambiarPassword, eliminarCuenta, getAll };
