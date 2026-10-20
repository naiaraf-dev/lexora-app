const path = require('path');
const busquedaRepository = require('../repositories/busqueda.repository');

const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 25;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_NUMERO_INTERNO = /^EXP-\d{4}-(\d+)$/i;

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

// si el valor es un numero interno (EXP-2025-128) devuelve el id del expediente
function idDesdeNumeroInterno(valor) {
    const coincidencia = FORMATO_NUMERO_INTERNO.exec(valor ?? '');
    return coincidencia ? Number(coincidencia[1]) : undefined;
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
        limite: limpiarLimite(filtros.limite),
    };

    // un numero interno en texto o numeroCausa se busca directo por id
    for (const campo of ['texto', 'numeroCausa']) {
        const id = idDesdeNumeroInterno(normalizados[campo]);
        if (id) {
            normalizados.expedienteId = id;
            normalizados[campo] = undefined;
        }
    }

    return normalizados;
}

// evita devolver todos los registros cuando no llega ningun criterio
function tieneCriterios(filtros) {
    const { limite, ...criterios } = filtros;
    return Object.values(criterios).some((valor) => valor !== undefined);
}

async function buscarExpedientes(filtros) {
    const normalizados = normalizarFiltros(filtros);
    if (!tieneCriterios(normalizados)) return [];

    const filas = await busquedaRepository.buscarExpedientes(normalizados);

    return filas.map((r) => ({
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

    return filas.map((r) => ({
        id: r.id,
        nombreArchivo: r.nombreArchivo,
        extension: path.extname(r.nombreArchivo ?? '').slice(1).toLowerCase() || null,
        descripcion: r.descripcion,
        tipoDocumento: r.tipoDocumento,
        fecha: r.fechaDocumento ?? r.fechaCreacion,
        expedienteId: r.expedienteId,
        numeroExpediente: numeroInterno(r.expedienteId, r.expedienteFechaCreacion),
        caratula: r.caratula,
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

module.exports = {
    buscarExpedientes,
    buscarDocumentos,
    buscarClientes,
    // se exportan para tests
    normalizarFiltros,
    tieneCriterios,
};