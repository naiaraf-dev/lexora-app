const service = require('../services/clientes.service');

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

// crea un cliente nuevo
async function create(req, res) {
    try {
        const cliente = await service.create(req.body);
        res.status(201).json(cliente);
    } catch (error) {
        const status = error.message.includes('obligatorio') ? 400 : 500;
        res.status(status).json({ mensaje: error.message });
    }
}

// actualiza un cliente existente
async function update(req, res) {
    try {
        const cliente = await service.update(Number(req.params.id), req.body);
        res.json(cliente);
    } catch (error) {
        const status = error.message === 'Cliente no encontrado' ? 404
            : error.message.includes('obligatorio') ? 400 : 500;
        res.status(status).json({ mensaje: error.message });
    }
}

module.exports = { getAll, getById, create, update };