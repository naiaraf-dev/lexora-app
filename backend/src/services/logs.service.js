const repo = require('../repositories/logs.repository');
const { RESULTADOS } = require('../constants/log.constants');

// lista logs y los formatea para el front
async function listar(filtros) {
    const registros = await repo.getAll(filtros);

    if (!registros.length) {
        return { data: [], total: 0, pagina: filtros.pagina ?? 1, pageSize: filtros.pageSize ?? 10 };
    }

    const total = registros[0].totalRegistros;

    // acomoda los nombres de los campos para devolverlos mas prolijos
    const data = registros.map(r => ({
        id: r.id,
        fechaHora: r.fecha_hora,
        usuario: r.usuarioNombre,
        usuarioId: r.usuarioId,
        accion: r.accion,
        modulo: r.modulo,
        descripcion: r.descripcion,
        resultado: r.resultado,
        ip: r.ip,
    }));

    return { data, total, pagina: Number(filtros.pagina ?? 1), pageSize: Number(filtros.pageSize ?? 10) };
}

// trae un log por id y lo devuelve formateado
async function obtener(id) {
    const r = await repo.getById(id);
    if (!r) return null;

    return {
        id: r.id,
        fechaHora: r.fecha_hora,
        usuario: r.usuarioNombre,
        usuarioId: r.usuarioId,
        accion: r.accion,
        modulo: r.modulo,
        descripcion: r.descripcion,
        resultado: r.resultado,
        ip: r.ip,
    };
}

// trae estadisticas de los logs
async function getStats(filtros) {
    return repo.getStats(filtros);
}

// trae usuarios que tienen logs registrados
async function getUsuarios() {
    return repo.getUsuarios();
}

// registra un nuevo log
async function registrar(data) {
    return repo.crear(data);
}

// registra un evento de seguridad a partir de la request (usuario del token + ip)
// nunca lanza error: si falla el guardado solo lo informa, asi no corta la operacion principal
async function registrarEvento(req, { accion, modulo, descripcion, resultado = RESULTADOS.OK }) {
    try {
        await repo.crear({
            usuario: req.usuario?.id,
            accion,
            modulo,
            descripcion,
            resultado,
            ip: req.ip,
        });
    } catch (error) {
        console.error(`Error al registrar log de seguridad (${modulo} - ${accion}):`, error.message);
    }
}

module.exports = { listar, obtener, getStats, getUsuarios, registrar, registrarEvento };