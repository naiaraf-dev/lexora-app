const service = require('../services/clientes.service');
const logs = require('../services/logs.service');
const { ACCIONES, MODULOS, RESULTADOS } = require('../constants/log.constants');

// arma el nombre del cliente para las descripciones del log
function nombreCliente(cliente) {
    return `${cliente.nombre} ${cliente.apellido} (ID ${cliente.id})`;
}

// trae todos los clientes
async function getAll(req, res) {
    try {
        const clientes = await service.getAll();
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener clientes', error: error.message });
    }
}

// busca un cliente por id
async function getById(req, res) {
    try {
        const cliente = await service.getById(Number(req.params.id));
        res.json(cliente);
    } catch (error) {
        const status = error.message === 'Cliente no encontrado' ? 404 : 500;
        res.status(status).json({ mensaje: error.message });
    }
}

// crea un cliente nuevo y lo registra en el log de seguridad
async function create(req, res) {
    try {
        const cliente = await service.create(req.body);
        await logs.registrarEvento(req, {
            accion: ACCIONES.ALTA,
            modulo: MODULOS.CLIENTES,
            descripcion: `Dio de alta al cliente ${nombreCliente(cliente)}`,
        });
        res.status(201).json(cliente);
    } catch (error) {
        await logs.registrarEvento(req, {
            accion: ACCIONES.ALTA,
            modulo: MODULOS.CLIENTES,
            resultado: RESULTADOS.ERROR,
            descripcion: `Error al dar de alta un cliente: ${error.message}`,
        });
        const status = error.message.includes('obligatorio') ? 400 : 500;
        res.status(status).json({ mensaje: error.message });
    }
}

// actualiza un cliente existente y lo registra en el log de seguridad
async function update(req, res) {
    const id = Number(req.params.id);
    try {
        const { cliente, camposModificados } = await service.update(id, req.body);
        const detalle = camposModificados.length
            ? `: ${camposModificados.join(', ')}`
            : ' (sin cambios)';
        await logs.registrarEvento(req, {
            accion: ACCIONES.EDICION,
            modulo: MODULOS.CLIENTES,
            descripcion: `Editó al cliente ${nombreCliente(cliente)}${detalle}`,
        });
        res.json(cliente);
    } catch (error) {
        await logs.registrarEvento(req, {
            accion: ACCIONES.EDICION,
            modulo: MODULOS.CLIENTES,
            resultado: RESULTADOS.ERROR,
            descripcion: `Error al editar el cliente ID ${id}: ${error.message}`,
        });
        const status = error.message === 'Cliente no encontrado' ? 404
            : error.message.includes('obligatorio') ? 400 : 500;
        res.status(status).json({ mensaje: error.message });
    }
}

// da de baja logica a un cliente y lo registra en el log de seguridad
async function remove(req, res) {
    const id = Number(req.params.id);
    try {
        const cliente = await service.darDeBaja(id);
        await logs.registrarEvento(req, {
            accion: ACCIONES.ELIMINACION,
            modulo: MODULOS.CLIENTES,
            descripcion: `Dio de baja al cliente ${nombreCliente(cliente)}`,
        });
        res.json(cliente);
    } catch (error) {
        await logs.registrarEvento(req, {
            accion: ACCIONES.ELIMINACION,
            modulo: MODULOS.CLIENTES,
            resultado: RESULTADOS.ERROR,
            descripcion: `Error al dar de baja el cliente ID ${id}: ${error.message}`,
        });
        const status = error.message === 'Cliente no encontrado' ? 404
            : error.message === 'El cliente ya está dado de baja' ? 409 : 500;
        res.status(status).json({ mensaje: error.message });
    }
}

module.exports = { getAll, getById, create, update, remove };
