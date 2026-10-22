// valores que se guardan en log_seguridad
// tienen que coincidir con los filtros de la pantalla del log (log-view.ts)
const ACCIONES = {
    ALTA: 'Alta',
    EDICION: 'Edición',
    ELIMINACION: 'Eliminación',
    DESCARGA: 'Descarga',
    // consultas a Litis (HU40); todavia no esta entre los filtros de la pantalla del log
    CONSULTA: 'Consulta',
};

const MODULOS = {
    CLIENTES: 'Clientes',
    PREVISIONES: 'Previsiones',
    DOCUMENTOS: 'Documentos',
    // Litis (HU40); todavia no esta entre los filtros de la pantalla del log
    ASISTENTE: 'Asistente',
};

const RESULTADOS = {
    OK: 'OK',
    ERROR: 'Error',
};

module.exports = { ACCIONES, MODULOS, RESULTADOS };
