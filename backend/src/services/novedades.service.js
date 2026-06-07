const repo = require('../repositories/novedades.repository');

async function listarPorExpediente(expedienteId) {
    const registros = await repo.getAllByExpediente(expedienteId);

    return registros.map(r => ({
        id:          r.id,
        expediente:  r.expediente,
        fecha:       r.fecha_novedad,
        titulo:      r.titulo,
        descripcion: r.descripcion,
        esProcesal:  r.es_procesal,
        tipoNovedad: r.tipoNovedadId ? {
            id:      r.tipoNovedadId,
            nombre:  r.tipoNovedadNombre,
        } : null,
        usuarioCreacion: r.usuarioCreacionId ? {
            id:     r.usuarioCreacionId,
            nombre: r.usuarioCreacionNombre,
        } : null,
        fechaCreacion:            r.fecha_creacion,
        fechaUltimaModificacion:  r.fecha_ultima_modificacion,
    }));
}

async function obtener(id) {
    const r = await repo.getById(id);
    if (!r) return null;

    return {
        id:          r.id,
        expediente:  r.expediente,
        fecha:       r.fecha_novedad,
        titulo:      r.titulo,
        descripcion: r.descripcion,
        esProcesal:  r.es_procesal,
        tipoNovedad: r.tipoNovedadId ? {
            id:      r.tipoNovedadId,
            nombre:  r.tipoNovedadNombre,
        } : null,
        usuarioCreacion: r.usuarioCreacionId ? {
            id:     r.usuarioCreacionId,
            nombre: r.usuarioCreacionNombre,
        } : null,
        fechaCreacion:           r.fecha_creacion,
        fechaUltimaModificacion: r.fecha_ultima_modificacion,
    };
}

async function crear(data) {
    if (!data.expediente)       throw { status: 400, mensaje: 'expediente es obligatorio' };
    if (!data.titulo)           throw { status: 400, mensaje: 'titulo es obligatorio' };
    if (!data.usuario_creacion) throw { status: 400, mensaje: 'usuario_creacion es obligatorio' };

    return repo.crear(data);
}

async function actualizar(id, data) {
    const existente = await repo.getById(id);
    if (!existente) throw { status: 404, mensaje: 'Novedad no encontrada' };

    return repo.actualizar(id, data);
}

async function eliminar(id) {
    const existente = await repo.getById(id);
    if (!existente) throw { status: 404, mensaje: 'Novedad no encontrada' };

    return repo.eliminar(id);
}

module.exports = { listarPorExpediente, obtener, crear, actualizar, eliminar };