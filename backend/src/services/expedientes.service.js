const repo = require('../repositories/expedientes.repository');
const causaService = require('./causa.service');
const causaRepo    = require('../repositories/causa.repository');

// lista expedientes y les da el formato que necesita el front
async function listar(filtros) {
    const registros = await repo.getAll(filtros);

    if (!registros.length) {
        return { data: [], total: 0, pagina: filtros.pagina ?? 1, pageSize: filtros.pageSize ?? 10 };
    }

    const total = registros[0].totalRegistros;

    // acomoda cada registro para devolver objetos mas claros
    const data = registros.map(r => ({
        id: r.id,
        numeroInterno: `EXP-${new Date(r.fecha_creacion).getFullYear()}-${r.id}`,
        numeroExpedienteJudicial: r.numeroExpedienteJudicial,
        caratula: r.caratula,
        area: r.area,
        fechaInicio: r.fecha_inicio,
        ultimaActualizacion: r.ultimaActualizacion,
        tipo: {
            id: r.tipoId,
            nombre: r.tipoNombre,
        },
        estado: {
            id: r.estadoId,
            nombre: r.estadoNombre,
        },
        cliente: {
            id: r.clienteId,
            nombre: r.clienteNombre,
        },
        usuarioPrincipal: {
            id: r.usuarioPrincipalId,
            nombre: r.usuarioPrincipalNombre,
        },
    }));

    return { data, total, pagina: Number(filtros.pagina ?? 1), pageSize: Number(filtros.pageSize ?? 10) };
}

// trae un expediente por id y lo arma con sus datos relacionados
async function obtener(id) {
    const r = await repo.getById(id);
    if (!r) return null;

    return {
        id: r.id,
        numeroInterno: `EXP-${new Date(r.fecha_creacion).getFullYear()}-${r.id}`,
        numeroExpedienteJudicial: r.numero_expediente_judicial,
        caratula: r.caratula,
        area: r.area,
        rolCliente: r.rolClienteId ? {
            id: r.rolClienteId,
            nombre: r.rolClienteNombre,
        } : null,
        descripcion: r.descripcion,
        juzgado: r.juzgado,
        fuero: r.fuero,
        secretaria: r.secretaria,
        jurisdiccion: r.jurisdiccion,
        instancia: r.instancia,
        contraparte: r.contraparte,
        abogadoContraparte: r.abogado_contraparte,
        origenCaso: r.origen_caso,
        fechaInicio: r.fecha_inicio,
        fechaUltActuacion: r.fecha_ult_actuacion,
        fechaEstimadaCierre: r.fecha_estimada_cierre,
        fechaProcesalProxima: r.fecha_procesal_proximo,
        fechaVencimiento: r.fecha_vencimiento,
        fechaCreacion: r.fecha_creacion,
        fechaUltimaModificacion: r.fecha_ultima_modificacion,
        tipo: {
            id: r.tipo_expediente,
            nombre: r.tipoNombre,
        },
        estado: {
            id: r.estado_expediente,
            nombre: r.estadoNombre,
        },
        cliente: r.clienteId ? {
            id: r.clienteId,
            nombre: r.clienteNombre,
        } : null,
        usuarioPrincipal: r.usuarioPrincipalId ? {
            id: r.usuarioPrincipalId,
            nombre: r.usuarioPrincipalNombre,
        } : null,
        usuarioSecundario: r.usuarioSecundarioId ? {
            id: r.usuarioSecundarioId,
            nombre: r.usuarioSecundarioNombre,
        } : null,
        prioridad: r.prioridad ? {
            id: r.prioridad,
            nombre: r.prioridadNombre,
        } : null,
    };
}

// busca el nombre del tipo de expediente por id
async function obtenerNombreTipo(id) {
    const pool = await require('../config/db').conectarBD();
    const resultado = await pool.request()
        .input('id', require('mssql').Int, id)
        .query('SELECT nombre FROM tipoexpediente WHERE id = @id');
    return resultado.recordset[0]?.nombre ?? null;
}

// valida los campos principales y crea el expediente
async function crear(data) {
    if (!data.tipo_expediente) throw { status: 400, mensaje: 'tipo_expediente es obligatorio' };
    if (!data.estado_expediente) throw { status: 400, mensaje: 'estado_expediente es obligatorio' };
    if (!data.caratula) throw { status: 400, mensaje: 'caratula es obligatoria' };
    if (!data.usuario_creacion) throw { status: 400, mensaje: 'usuario_creacion es obligatorio' };
    if (!data.usuario_principal) throw { status: 400, mensaje: 'usuario_principal es obligatorio' };
    if (!data.area) throw { status: 400, mensaje: 'area es obligatoria' };

    let causa_id = null;

    // si viene numero de causa, busca o crea la causa
    if (data.numero_expediente_judicial) {
        let causa = await causaRepo.getByCausaNumero(
            data.numero_expediente_judicial,
            data.area
        );

        if (!causa) {
            // crea la causa sin expediente principal todavia
            const nuevaCausaId = await causaService.crear(
                data.numero_expediente_judicial,
                data.area,
                null
            );
            causa = { id: nuevaCausaId };
        }

        causa_id = causa.id;
    }

    // crea el expediente vinculado a la causa
    const expediente = await repo.crear({ ...data, causa_id });

    // si corresponde, actualiza el expediente principal de la causa
    if (causa_id) {
        const tipoNombre = await obtenerNombreTipo(data.tipo_expediente);
        const causaActual = await causaRepo.getById(causa_id);
        const esPrincipal = causaService.esTipoPrincipal(data.area, tipoNombre);

        if (esPrincipal || !causaActual[0]?.expediente_principal_id) {
            await causaRepo.actualizarExpedientePrincipal(causa_id, expediente.id);
        }
    }

    return expediente;
}

// valida que exista y despues actualiza el expediente
async function actualizar(id, data) {
    const existente = await repo.getById(id);
    if (!existente) throw { status: 404, mensaje: 'Expediente no encontrado' };

    return repo.actualizar(id, data);
}

// cierra el expediente cambiando su estado
async function cerrar(id, idEstado) {
    // reutiliza actualizar porque el cierre es solo un cambio de estado
    return actualizar(id, { estado_expediente: idEstado });
}

// valida que exista y despues lo elimina
async function eliminar(id) {
    const existente = await repo.getById(id);
    if (!existente) throw { status: 404, mensaje: 'Expediente no encontrado' };

    return repo.eliminar(id);
}

module.exports = { listar, obtener, crear, actualizar, cerrar, eliminar };