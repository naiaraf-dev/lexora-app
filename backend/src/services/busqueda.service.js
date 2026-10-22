const path = require('path');
const busquedaRepository = require('../repositories/busqueda.repository');

const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 25;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_NUMERO_INTERNO = /^EXP-(\d{4})-(\d+)$/i;
// "todas" no filtra: queda como sin estado
const ESTADOS_TAREA = ['pendientes', 'vencidas', 'cumplidas'];

// recorta espacios y largo; devuelve undefined si queda vacio
function limpiarTexto(valor, largoMaximo = 200) {
    if (typeof valor !== 'string') return undefined;
    const limpio = valor.trim().replace(/\s+/g, ' ').slice(0, largoMaximo);
    return limpio || undefined;
}

// acepta solo fechas YYYY-MM-DD validas
function limpiarFecha(valor) {
    if (typeof valor !== 'string' || !FORMATO_FECHA.test(valor)) return undefined;
    const fecha = new Date(`${valor}T00:00:00Z`);
    return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

function limpiarId(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}

function limpiarLimite(valor) {
    return Math.min(limpiarId(valor) ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
}

// mismo formato que expedientes.service
function numeroInterno(id, fechaCreacion) {
    return `EXP-${new Date(fechaCreacion).getFullYear()}-${id}`;
}

// si el valor es un numero interno (EXP-2025-128) devuelve el id y el año del expediente
function desarmarNumeroInterno(valor) {
    const coincidencia = FORMATO_NUMERO_INTERNO.exec(valor ?? '');
    return coincidencia ? { anio: Number(coincidencia[1]), id: Number(coincidencia[2]) } : undefined;
}

function normalizarFiltros(filtros = {}) {
    const normalizados = {
        texto: limpiarTexto(filtros.texto),
        cliente: limpiarTexto(filtros.cliente, 100),
        numeroCausa: limpiarTexto(filtros.numeroCausa, 50),
        tipoDocumento: limpiarTexto(filtros.tipoDocumento, 100),
        area: limpiarTexto(filtros.area, 100),
        estado: limpiarTexto(filtros.estado, 100),
        expedienteId: limpiarId(filtros.expedienteId),
        fechaDesde: limpiarFecha(filtros.fechaDesde),
        fechaHasta: limpiarFecha(filtros.fechaHasta),
        // solo para tareas y novedades (HU36)
        estadoTarea: ESTADOS_TAREA.includes(filtros.estadoTarea) ? filtros.estadoTarea : undefined,
        soloProcesales: filtros.soloProcesales === true ? true : undefined,
        // restringe a los expedientes del usuario (Litis); no es un criterio de busqueda
        usuarioId: limpiarId(filtros.usuarioId),
        limite: limpiarLimite(filtros.limite),
    };

    // un numero interno en texto o numeroCausa se busca directo por id,
    // y el año tiene que coincidir para no devolver otro expediente
    for (const campo of ['texto', 'numeroCausa']) {
        const numero = desarmarNumeroInterno(normalizados[campo]);
        if (numero) {
            normalizados.expedienteId = numero.id;
            normalizados.anioExpediente = numero.anio;
            normalizados[campo] = undefined;
        }
    }

    return normalizados;
}

// con un numero interno (EXP-año-id) el año tiene que coincidir con el del numero que ve el usuario.
// se compara aca y no en SQL para usar el mismo calculo que numeroInterno (fecha leida por mssql + hora local)
function coincideConNumeroInterno(anio, fechaCreacion) {
    return !anio || new Date(fechaCreacion).getFullYear() === anio;
}

// evita devolver todos los registros cuando no llega ningun criterio
function tieneCriterios(filtros) {
    const { limite, usuarioId, ...criterios } = filtros;
    return Object.values(criterios).some((valor) => valor !== undefined);
}

async function buscarExpedientes(filtros) {
    const normalizados = normalizarFiltros(filtros);
    if (!tieneCriterios(normalizados)) return [];

    const filas = await busquedaRepository.buscarExpedientes(normalizados);

    return filas
        .filter((r) => coincideConNumeroInterno(normalizados.anioExpediente, r.fechaCreacion))
        .map((r) => ({
            id: r.id,
            numeroInterno: numeroInterno(r.id, r.fechaCreacion),
            caratula: r.caratula,
            numeroExpedienteJudicial: r.numeroExpedienteJudicial,
            area: r.area,
            tipo: r.tipoNombre,
            estado: r.estadoNombre,
            clienteId: r.clienteId,
            cliente: r.clienteNombre?.trim() || null,
            fechaInicio: r.fechaInicio,
        }));
}

async function buscarDocumentos(filtros) {
    const normalizados = normalizarFiltros(filtros);
    if (!tieneCriterios(normalizados)) return [];

    const filas = await busquedaRepository.buscarDocumentos(normalizados);

    return filas
        .filter((r) => coincideConNumeroInterno(normalizados.anioExpediente, r.expedienteFechaCreacion))
        .map((r) => ({
            id: r.id,
            nombreArchivo: r.nombreArchivo,
            extension: path.extname(r.nombreArchivo ?? '').slice(1).toLowerCase() || null,
            descripcion: r.descripcion,
            tipoDocumento: r.tipoDocumento,
            fecha: r.fechaDocumento ?? r.fechaCreacion,
            expedienteId: r.expedienteId,
            numeroExpediente: numeroInterno(r.expedienteId, r.expedienteFechaCreacion),
            caratula: r.caratula,
            // resumen generado por IA (HU42); null si todavia no se proceso
            resumen: r.resumen ?? null,
        }));
}

async function buscarClientes(filtros) {
    const normalizados = normalizarFiltros(filtros);
    if (!normalizados.cliente && !normalizados.texto) return [];

    const filas = await busquedaRepository.buscarClientes(normalizados);

    return filas.map((r) => ({
        id: r.id,
        nombreCompleto: `${r.nombre ?? ''} ${r.apellido ?? ''}`.trim(),
        dni: r.dni,
        cuit: r.cuit,
        cantidadExpedientes: r.cantidadExpedientes,
    }));
}

async function buscarTareas(filtros) {
    const normalizados = normalizarFiltros(filtros);
    if (!tieneCriterios(normalizados)) return [];

    const filas = await busquedaRepository.buscarTareas(normalizados);

    return filas
        .filter((r) => coincideConNumeroInterno(normalizados.anioExpediente, r.expedienteFechaCreacion))
        .map((r) => ({
            id: r.id,
            titulo: r.titulo,
            descripcion: r.descripcion,
            fechaVencimiento: r.fechaVencimiento,
            hora: r.hora,
            // una pendiente con la fecha pasada se informa como vencida
            estado: r.vencida ? 'Vencido' : r.estadoNombre,
            prioridad: r.prioridadNombre,
            expedienteId: r.expedienteId,
            numeroExpediente: numeroInterno(r.expedienteId, r.expedienteFechaCreacion),
            caratula: r.caratula,
        }));
}

async function buscarNovedades(filtros) {
    const normalizados = normalizarFiltros(filtros);
    if (!tieneCriterios(normalizados)) return [];

    const filas = await busquedaRepository.buscarNovedades(normalizados);

    return filas
        .filter((r) => coincideConNumeroInterno(normalizados.anioExpediente, r.expedienteFechaCreacion))
        .map((r) => ({
            id: r.id,
            titulo: r.titulo,
            descripcion: r.descripcion,
            fecha: r.fechaNovedad,
            tipo: r.tipoNovedad,
            esProcesal: Boolean(r.esProcesal),
            expedienteId: r.expedienteId,
            numeroExpediente: numeroInterno(r.expedienteId, r.expedienteFechaCreacion),
            caratula: r.caratula,
        }));
}

module.exports = {
    buscarExpedientes,
    buscarDocumentos,
    buscarClientes,
    buscarTareas,
    buscarNovedades,
    // se exportan para tests
    normalizarFiltros,
    tieneCriterios,
};