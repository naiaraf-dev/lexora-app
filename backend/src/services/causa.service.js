const repo = require('../repositories/causa.repository');

// tipos que determinan el expediente principal de una causa
const TIPOS_PRINCIPALES = {
    CIVIL:    'Demanda Civil',
    LABORAL:  'Demanda Laboral',
};

// agrupa las filas planas del repo en objetos causa con expedientes[]
function agrupar(filas) {
    const mapa = new Map();

    for (const fila of filas) {
        if (!mapa.has(fila.id)) {
            mapa.set(fila.id, {
                id:                     fila.id,
                numeroCausa:            fila.numero_causa,
                area:                   fila.area,
                activo:                 fila.activo,
                fechaCreacion:          fila.fecha_creacion,
                fechaUltimaModificacion:fila.fecha_ultima_modificacion,
                expedientePrincipalId:  fila.expediente_principal_id,
                expedientes:            [],
            });
        }

        // agrega el expediente si existe (LEFT JOIN puede traer nulls)
        if (fila.expedienteId) {
            mapa.get(fila.id).expedientes.push({
                id:                  fila.expedienteId,
                numeroInterno:       `${fila.expedienteId}/${new Date(fila.expedienteFechaCreacion).getFullYear()}`,
                caratula:            fila.caratula,
                area:                fila.expedienteArea,
                fechaInicio:         fila.fecha_inicio,
                ultimaActualizacion: fila.expedienteUltimaActualizacion,
                esPrincipal:         fila.expedienteId === fila.expediente_principal_id,
                tipo: {
                    id:     fila.tipoId,
                    nombre: fila.tipoNombre,
                },
                estado: {
                    id:     fila.estadoId,
                    nombre: fila.estadoNombre,
                },
                cliente: fila.clienteId ? {
                    id:     fila.clienteId,
                    nombre: fila.clienteNombre,
                } : null,
                usuarioPrincipal: fila.usuarioPrincipalId ? {
                    id:     fila.usuarioPrincipalId,
                    nombre: fila.usuarioPrincipalNombre,
                } : null,
            });
        }
    }

    return Array.from(mapa.values());
}

// lista todas las causas con sus expedientes agrupados
async function listar(filtros = {}) {
    const filas = await repo.getAll(filtros);
    if (!filas.length) return [];
    return agrupar(filas);
}

// trae una causa por id con sus expedientes
async function obtener(id) {
    const filas = await repo.getById(id);
    if (!filas.length) return null;
    const causas = agrupar(filas);
    return causas[0];
}

// busca si ya existe una causa con ese numero y area
async function buscarPorNumero(numero_causa, area) {
    return repo.getByCausaNumero(numero_causa, area);
}

// determina si un tipo de expediente es el principal de su area
function esTipoPrincipal(area, tipoNombre) {
    const tipoPrincipal = TIPOS_PRINCIPALES[area?.toUpperCase()];
    if (!tipoPrincipal) return false;
    return tipoNombre === tipoPrincipal;
}

// crea una causa nueva y devuelve su id
async function crear(numero_causa, area, expediente_principal_id = null) {
    if (!numero_causa) throw { status: 400, mensaje: 'numero_causa es obligatorio' };
    if (!area)         throw { status: 400, mensaje: 'area es obligatoria' };

    return repo.crear({ numero_causa, area, expediente_principal_id });
}

// actualiza el expediente principal de una causa
async function actualizarExpedientePrincipal(id, expediente_principal_id) {
    const causa = await repo.getById(id);
    if (!causa.length) throw { status: 404, mensaje: 'Causa no encontrada' };

    return repo.actualizarExpedientePrincipal(id, expediente_principal_id);
}

// baja logica de la causa
async function eliminar(id) {
    const causa = await repo.getById(id);
    if (!causa.length) throw { status: 404, mensaje: 'Causa no encontrada' };

    return repo.eliminar(id);
}

module.exports = { listar, obtener, buscarPorNumero, esTipoPrincipal, crear, actualizarExpedientePrincipal, eliminar };