const bcrypt = require('bcrypt');
const repo = require('../repositories/usuarios.repository');

// trae el perfil del usuario y lo devuelve con formato para el front
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

// actualiza los datos del perfil y devuelve el usuario actualizado
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

// actualiza la imagen de perfil y devuelve el perfil actualizado
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

// valida la contraseña actual y guarda la nueva hasheada
async function cambiarPassword(id, actual, nueva) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    // compara la contraseña ingresada con el hash guardado
    const match = await bcrypt.compare(actual, u.password_hash);
    if (!match) throw { status: 400, mensaje: 'La contraseña actual no es correcta' };

    const hash = await bcrypt.hash(nueva, 10);
    await repo.cambiarPassword(id, hash);
}

// elimina la cuenta del usuario con baja logica
async function eliminarCuenta(id) {
    const u = await repo.getById(id);
    if (!u) throw { status: 404, mensaje: 'Usuario no encontrado' };

    await repo.eliminar(id);
}

// trae todos los usuarios activos
async function getAll() {
    return repo.getAll();
}

module.exports = { getPerfil, actualizarPerfil, actualizarImagen, cambiarPassword, eliminarCuenta, getAll };