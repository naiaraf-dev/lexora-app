const repo = require('../repositories/expedientes.repository');

async function listar(filtros) {
    const registros = await repo.getAll(filtros);

    if (!registros.length) {
        return { data: [], total: 0, pagina: filtros.pagina ?? 1, pageSize: filtros.pageSize ?? 25 };
    }

    const total = registros[0].totalRegistros;

    const data = registros.map(r => ({
        id:                   r.id,
        numero:               r.numero,
        caratula:             r.caratula,
        area:                 r.area,
        fechaInicio:          r.fecha_inicio,
        ultimaActualizacion:  r.ultimaActualizacion,
        tipo: {
            id:     r.tipoId,
            nombre: r.tipoNombre,
        },
        estado: {
            id:     r.estadoId,
            nombre: r.estadoNombre,
        },
        cliente: {
            id:     r.clienteId,
            nombre: r.clienteNombre,
        },
        usuarioPrincipal: {
            id:     r.usuarioPrincipalId,
            nombre: r.usuarioPrincipalNombre,
        },
    }));

    return { data, total, pagina: Number(filtros.pagina ?? 1), pageSize: Number(filtros.pageSize ?? 25) };
}

async function obtener(id) {
    const r = await repo.getById(id);
    if (!r) return null;

    return {
        id:                        r.id,
        numero:                    r.numero_expediente_judicial,
        caratula:                  r.caratula,
        area:                      r.fuero,
        descripcion:               r.descripcion,
        juzgado:                   r.juzgado,
        secretaria:                r.secretaria,
        jurisdiccion:              r.jurisdiccion,
        instancia:                 r.instancia,
        estadoSede:                r.estado_sede,
        contraparte:               r.contraparte,
        abogadoContraparte:        r.abogado_contraparte,
        origenCaso:                r.origen_caso,
        fechaInicio:               r.fecha_inicio,
        fechaUltActuacion:         r.fecha_ult_actuacion,
        fechaEstimadaCierre:       r.fecha_estimada_cierre,
        fechaProximaActuacion:     r.fecha_proxima_proxima,
        fechaVencimiento:          r.fecha_vencimiento,
        fechaCreacion:             r.fecha_creacion,
        fechaUltimaModificacion:   r.fecha_ultima_modificacion,
        tipo: {
            id:     r.tipo_expediente,
            nombre: r.tipoNombre,
        },
        estado: {
            id:     r.estado_nodo,
            nombre: r.estadoNombre,
        },
        cliente: r.clienteId ? {
            id:     r.clienteId,
            nombre: r.clienteNombre,
        } : null,
        usuarioPrincipal: r.usuarioPrincipalId ? {
            id:     r.usuarioPrincipalId,
            nombre: r.usuarioPrincipalNombre,
        } : null,
        usuarioSecundario: r.usuarioSecundarioId ? {
            id:     r.usuarioSecundarioId,
            nombre: r.usuarioSecundarioNombre,
        } : null,
        prioridad: r.prioridad ? {
            id:     r.prioridad,
            nombre: r.prioridadNombre,
        } : null,
        categoria: r.categoria ? {
            id:     r.categoria,
            nombre: r.categoriaNombre,
        } : null,
    };
}

async function crear(data) {
    // Validaciones mínimas
    if (!data.tipo_expediente) throw { status: 400, mensaje: 'tipo_expediente es obligatorio' };
    if (!data.estado_nodo)     throw { status: 400, mensaje: 'estado_nodo es obligatorio' };
    if (!data.caratula)        throw { status: 400, mensaje: 'caratula es obligatoria' };
    if (!data.usuario_creacion)throw { status: 400, mensaje: 'usuario_creacion es obligatorio' };
    if (!data.usuario_principal)throw { status: 400, mensaje: 'usuario_principal es obligatorio' };

    return repo.crear(data);
}

async function actualizar(id, data) {
    const existente = await repo.getById(id);
    if (!existente) throw { status: 404, mensaje: 'Expediente no encontrado' };

    return repo.actualizar(id, data);
}

async function cerrar(id, idEstado) {
    // Reutiliza actualizar — el cierre es solo un cambio de estado
    return actualizar(id, { estado_nodo: idEstado });
}

async function eliminar(id) {
    const existente = await repo.getById(id);
    if (!existente) throw { status: 404, mensaje: 'Expediente no encontrado' };

    return repo.eliminar(id);
}

module.exports = { listar, obtener, crear, actualizar, cerrar, eliminar };