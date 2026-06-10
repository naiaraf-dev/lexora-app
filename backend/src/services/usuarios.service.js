const bcrypt = require('bcrypt');
const repo = require('../repositories/usuarios.repository');

async function getPerfil(id) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    return {
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        matricula: u.matricula,
        avatarUrl: u.avatar_url ?? '',
        rol: { id: u.rol_usuario, nombre: u.rolNombre },
    };
}

async function actualizarPerfil(id, data) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    const actualizado = await repo.actualizar(id, data);
    return {
        id: actualizado.id,
        nombre: actualizado.nombre,
        apellido: actualizado.apellido,
        email: actualizado.email,
        matricula: actualizado.matricula,
        avatarUrl: actualizado.avatar_url ?? '',
        rol: { id: actualizado.rol_usuario, nombre: actualizado.rolNombre },
    };
}

async function actualizarImagen(id, avatarUrl) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    const actualizado = await repo.actualizarImagen(id, avatarUrl);
    return {
        id: actualizado.id,
        nombre: actualizado.nombre,
        apellido: actualizado.apellido,
        email: actualizado.email,
        matricula: actualizado.matricula,
        avatarUrl: actualizado.avatar_url ?? '',
        rol: { id: actualizado.rol_usuario, nombre: actualizado.rolNombre },
    };
}

async function cambiarPassword(id, actual, nueva) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    const match = await bcrypt.compare(actual, u.password_hash);
    if (!match) throw { status: 400, mensaje: 'La contraseña actual no es correcta' };

    const hash = await bcrypt.hash(nueva, 10);
    await repo.cambiarPassword(id, hash);
}

async function eliminarCuenta(id) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    await repo.eliminar(id);
}

module.exports = { getPerfil, actualizarPerfil, actualizarImagen, cambiarPassword, eliminarCuenta };
