const repo = require('../repositories/logs.repository');

async function listar(filtros) {
    const registros = await repo.getAll(filtros);

    if (!registros.length) {
        return { data: [], total: 0, pagina: filtros.pagina ?? 1, pageSize: filtros.pageSize ?? 10 };
    }

    const total = registros[0].totalRegistros;
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

async function getStats(filtros) {
    return repo.getStats(filtros);
}

async function getUsuarios() {
    return repo.getUsuarios();
}

async function registrar(data) {
    return repo.crear(data);
}

module.exports = { listar, obtener, getStats, getUsuarios, registrar };
