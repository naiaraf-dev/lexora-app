const repo = require('../repositories/clientes.repository');

// trae todos los clientes desde el repo
async function getAll() {
    return repo.getAll();
}

// busca un cliente por id y valida que exista
async function getById(id) {
    const cliente = await repo.getById(id);
    if (!cliente) throw new Error('Cliente no encontrado');
    return cliente;
}

// valida los datos obligatorios y crea el cliente
async function create(datos) {
    if (!datos.nombre?.trim()) throw new Error('El nombre es obligatorio');
    if (!datos.apellido?.trim()) throw new Error('El apellido es obligatorio');
    return repo.create(datos);
}

// valida los datos, actualiza el cliente y controla que exista
async function update(id, datos) {
    if (!datos.nombre?.trim()) throw new Error('El nombre es obligatorio');
    if (!datos.apellido?.trim()) throw new Error('El apellido es obligatorio');
    const actualizado = await repo.update(id, datos);
    if (!actualizado) throw new Error('Cliente no encontrado');
    return actualizado;
}

module.exports = { getAll, getById, create, update };