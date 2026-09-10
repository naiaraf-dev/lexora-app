const repo = require('../repositories/expedientes.repository');

const causaService = require('./causa.service');
const causaRepo = require('../repositories/causa.repository');

const tareasAutomaticasService =
    require('./tareasAutomaticas.service');
const historialExpedienteService =
    require('./historialExpediente.service');
const { sql, conectarBD } = require('../config/db');


// lista expedientes y les da el formato que necesita el front
async function listar(filtros) {
    const registros = await repo.getAll(filtros);

    if (!registros.length) {
        return {
            data: [],
            total: 0,
            pagina: filtros.pagina ?? 1,
            pageSize: filtros.pageSize ?? 10
        };
    }

    const total = registros[0].totalRegistros;

    const data = registros.map(r => ({
        id: r.id,

        numeroInterno:
            `EXP-${new Date(r.fecha_creacion).getFullYear()}-${r.id}`,

        numeroExpedienteJudicial:
            r.numeroExpedienteJudicial,

        caratula: r.caratula,
        area: r.area,
        fechaInicio: r.fecha_inicio,
        ultimaActualizacion: r.ultimaActualizacion,

        tipo: {
            id: r.tipoId,
            nombre: r.tipoNombre
        },

        estado: {
            id: r.estadoId,
            nombre: r.estadoNombre
        },

        cliente: {
            id: r.clienteId,
            nombre: r.clienteNombre
        },

        usuarioPrincipal: {
            id: r.usuarioPrincipalId,
            nombre: r.usuarioPrincipalNombre
        }
    }));

    return {
        data,
        total,
        pagina: Number(filtros.pagina ?? 1),
        pageSize: Number(filtros.pageSize ?? 10)
    };
}


// trae un expediente por id y lo arma con sus datos relacionados
async function obtener(id) {
    const r = await repo.getById(id);

    if (!r) return null;

    return {
        id: r.id,

        numeroInterno:
            `EXP-${new Date(r.fecha_creacion).getFullYear()}-${r.id}`,

        numeroExpedienteJudicial:
            r.numero_expediente_judicial,

        caratula: r.caratula,
        area: r.area,

        rolCliente: r.rolClienteId
            ? {
                id: r.rolClienteId,
                nombre: r.rolClienteNombre
            }
            : null,

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
            nombre: r.tipoNombre
        },

        estado: {
            id: r.estado_expediente,
            nombre: r.estadoNombre
        },

        cliente: r.clienteId
            ? {
                id: r.clienteId,
                nombre: r.clienteNombre
            }
            : null,

        usuarioPrincipal: r.usuarioPrincipalId
            ? {
                id: r.usuarioPrincipalId,
                nombre: r.usuarioPrincipalNombre
            }
            : null,

        usuarioSecundario: r.usuarioSecundarioId
            ? {
                id: r.usuarioSecundarioId,
                nombre: r.usuarioSecundarioNombre
            }
            : null,

        prioridad: r.prioridad
            ? {
                id: r.prioridad,
                nombre: r.prioridadNombre
            }
            : null
    };
}


// busca el nombre del tipo de expediente por id
async function obtenerNombreTipo(id) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT nombre
            FROM tipoexpediente
            WHERE id = @id
        `);

    return resultado.recordset[0]?.nombre ?? null;
}


// crea expediente + tareas iniciales
async function crear(data) {
    if (!data.tipo_expediente) {
        throw {
            status: 400,
            mensaje: 'tipo_expediente es obligatorio'
        };
    }

    if (!data.caratula) {
        throw {
            status: 400,
            mensaje: 'caratula es obligatoria'
        };
    }

    if (!data.usuario_creacion) {
        throw {
            status: 400,
            mensaje: 'usuario_creacion es obligatorio'
        };
    }

    if (!data.usuario_creacion_tareas) {
        throw {
            status: 400,
            mensaje: 'usuario_creacion_tareas es obligatorio'
        };
    }

    if (!data.usuario_principal) {
        throw {
            status: 400,
            mensaje: 'usuario_principal es obligatorio'
        };
    }

    if (!data.area) {
        throw {
            status: 400,
            mensaje: 'area es obligatoria'
        };
    }

    if (!data.prioridad) {
        throw {
            status: 400,
            mensaje: 'prioridad es obligatoria'
        };
    }

    /*
     * El estado inicial YA NO viene del front.
     * Se obtiene del orden configurado en tipoestadoexpediente.
     */
    const primerEstado =
        await tareasAutomaticasService.obtenerPrimerEstado(
            data.tipo_expediente
        );

    let causa_id = null;

    // si viene numero de causa, busca o crea la causa
    if (data.numero_expediente_judicial) {
        let causa = await causaRepo.getByCausaNumero(
            data.numero_expediente_judicial,
            data.area
        );

        if (!causa) {
            const nuevaCausaId = await causaService.crear(
                data.numero_expediente_judicial,
                data.area,
                null
            );

            causa = {
                id: nuevaCausaId
            };
        }

        causa_id = causa.id;
    }

    const pool = await conectarBD();

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    let expedienteId;

    try {
        // fuerza el primer estado correspondiente al tipo
        const datosExpediente = {
            ...data,
            causa_id,
            estado_expediente: primerEstado.estadoId
        };

        const expedienteCreado = await repo.crear(
            datosExpediente,
            transaction
        );

        expedienteId = expedienteCreado.id;

        // genera TODAS las tareas del primer estado
        await tareasAutomaticasService.generarTareasAutomaticas(
            {
                expedienteId,
                tipoExpedienteId: Number(data.tipo_expediente),
                estadoExpedienteId: Number(primerEstado.estadoId),
                usuarioCreacionId:
                    Number(data.usuario_creacion_tareas),
                prioridadId: Number(data.prioridad)
            },
            transaction
        );

        await historialExpedienteService.registrarCambio(
            expedienteId,
            Number(primerEstado.estadoId),
            transaction
        );

        await transaction.commit();

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                'Error haciendo rollback:',
                rollbackError.message
            );
        }

        throw error;
    }

    /*
     * Esto queda despues del commit porque causaRepository
     * actualmente no trabaja con la misma transaccion.
     */
    if (causa_id) {
        const tipoNombre =
            await obtenerNombreTipo(data.tipo_expediente);

        const causaActual =
            await causaRepo.getById(causa_id);

        const esPrincipal =
            causaService.esTipoPrincipal(
                data.area,
                tipoNombre
            );

        if (
            esPrincipal ||
            !causaActual[0]?.expediente_principal_id
        ) {
            await causaRepo.actualizarExpedientePrincipal(
                causa_id,
                expedienteId
            );
        }
    }

    return repo.getById(expedienteId);
}


// modifica un expediente
async function actualizar(id, data) {
    const existente = await repo.getById(id);

    if (!existente) {
        throw {
            status: 404,
            mensaje: 'Expediente no encontrado'
        };
    }

    const tipoActual =
        Number(existente.tipo_expediente);

    const estadoActual =
        Number(existente.estado_expediente);

    const tipoFinal =
        data.tipo_expediente !== undefined
            ? Number(data.tipo_expediente)
            : tipoActual;

    const estadoFinal =
        data.estado_expediente !== undefined
            ? Number(data.estado_expediente)
            : estadoActual;

    const cambiaTipo =
        tipoFinal !== tipoActual;

    const cambiaEstado =
        data.estado_expediente !== undefined &&
        estadoFinal !== estadoActual;

    /*
     * Si se intenta cambiar el tipo o el estado,
     * valida que la combinación resultante sea válida.
     */
    if (cambiaTipo || data.estado_expediente !== undefined) {
        await tareasAutomaticasService.validarEstadoPermitido(
            tipoFinal,
            estadoFinal
        );
    }

    /*
     * Si NO cambia el estado, actualiza normalmente.
     * No valida tareas automáticas.
     * No genera tareas.
     * No registra historial.
     */
    if (!cambiaEstado) {
        return repo.actualizar(id, data);
    }

    /*
     * Desde acá sabemos que efectivamente
     * el expediente está entrando en otro estado.
     */

    if (!data.usuario_creacion_tareas) {
        throw {
            status: 400,
            mensaje:
                'usuario_creacion_tareas es obligatorio al cambiar de estado'
        };
    }

    /*
     * Si al mismo tiempo cambiaron la prioridad,
     * las nuevas tareas usan la prioridad nueva.
     *
     * Si no, heredan la prioridad actual del expediente.
     */
    const prioridadFinal =
        data.prioridad !== undefined
            ? Number(data.prioridad)
            : Number(existente.prioridad);

    if (!prioridadFinal) {
        throw {
            status: 400,
            mensaje:
                'El expediente debe tener una prioridad para generar tareas automáticas'
        };
    }

    const pool = await conectarBD();

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {

        /*
         * Antes de cambiar de estado verifica que no haya
         * tareas automáticas sin cumplir.
         *
         * estado_tarea:
         * 1 = Pendiente  -> bloquea
         * 2 = Cumplido   -> permite
         * 3 = Vencido    -> bloquea
         */
        await tareasAutomaticasService.validarPuedeCambiarEstado(
            Number(id),
            transaction
        );

        /*
         * Cambia el expediente.
         */
        await repo.actualizar(
            id,
            data,
            transaction
        );

        /*
         * Genera las tareas automáticas correspondientes
         * al nuevo estado.
         *
         * Se crean con:
         * automatica = 1
         * estado_tarea = 1
         */
        await tareasAutomaticasService.generarTareasAutomaticas(
            {
                expedienteId: Number(id),
                tipoExpedienteId: tipoFinal,
                estadoExpedienteId: estadoFinal,
                usuarioCreacionId:
                    Number(data.usuario_creacion_tareas),
                prioridadId: prioridadFinal
            },
            transaction
        );

        /*
         * Registra el nuevo estado
         * en el historial del expediente.
         */
        await historialExpedienteService.registrarCambio(
            Number(id),
            estadoFinal,
            transaction
        );

        await transaction.commit();

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                'Error haciendo rollback:',
                rollbackError.message
            );
        }

        throw error;
    }

    return repo.getById(id);
}


// cierre mediante cambio de estado
async function cerrar(
    id,
    idEstado,
    usuarioCreacionTareas
) {
    return actualizar(
        id,
        {
            estado_expediente: idEstado,
            usuario_creacion_tareas: usuarioCreacionTareas
        }
    );
}


// valida que exista y despues lo elimina
async function eliminar(id) {
    const existente = await repo.getById(id);

    if (!existente) {
        throw {
            status: 404,
            mensaje: 'Expediente no encontrado'
        };
    }

    return repo.eliminar(id);
}

// trae el historial de estados de un expediente
async function obtenerHistorial(id) {
    const existente = await repo.getById(id);

    if (!existente) {
        throw {
            status: 404,
            mensaje: 'Expediente no encontrado'
        };
    }

    const historial =
        await historialExpedienteService.obtenerPorExpediente(id);

    return historial.map(h => ({
        id: h.id,

        estado: {
            id: h.estadoId,
            nombre: h.estadoNombre
        },

        fechaCambioEstado: h.fecha_cambio_estado
    }));
}

// trae las tareas automaticas pendientes de un expediente
async function obtenerTareasAutomaticasPendientes(id) {
    const existente = await repo.getById(id);

    if (!existente) {
        throw {
            status: 404,
            mensaje: 'Expediente no encontrado'
        };
    }

    return tareasAutomaticasService.obtenerPendientesPorExpediente(id);
}


module.exports = {
    listar,
    obtener,
    crear,
    actualizar,
    cerrar,
    eliminar,
    obtenerHistorial,
    obtenerTareasAutomaticasPendientes
};