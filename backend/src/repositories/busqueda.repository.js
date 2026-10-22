const { sql, conectarBD } = require('../config/db');
const { condicionAcceso } = require('./acceso.repository');

// compara sin distinguir mayusculas ni acentos ("perez" encuentra "Pérez")
const SIN_ACENTOS = 'COLLATE Latin1_General_CI_AI';

// cantidad maxima de palabras del texto libre que se usan para buscar
const MAX_PALABRAS = 5;

// escapa los comodines de LIKE para que el texto del usuario se busque literal
function escaparLike(texto) {
    return texto.replace(/[[%_]/g, (caracter) => `[${caracter}]`);
}

// junta las condiciones del WHERE y sus parametros (@p0, @p1, ...)
function crearFiltro() {
    const condiciones = [];
    const parametros = [];

    return {
        condiciones,
        parametros,
        // registra un parametro y devuelve su nombre para usarlo en el SQL
        param(tipo, valor) {
            const nombre = `p${parametros.length}`;
            parametros.push({ nombre, tipo, valor });
            return `@${nombre}`;
        },
        agregar(condicion) {
            condiciones.push(condicion);
        },
    };
}

// cada palabra del texto tiene que aparecer en alguna de las columnas
function agregarTexto(filtro, texto, columnas) {
    const palabras = texto.split(' ').filter(Boolean).slice(0, MAX_PALABRAS);

    for (const palabra of palabras) {
        const p = filtro.param(sql.NVarChar, `%${escaparLike(palabra)}%`);
        const alguna = columnas.map((columna) => `${columna} ${SIN_ACENTOS} LIKE ${p}`).join(' OR ');
        filtro.agregar(`(${alguna})`);
    }
}

// si el valor son solo numeros busca por DNI o CUIT, si no por nombre y apellido
function agregarCliente(filtro, cliente) {
    const sinSeparadores = cliente.replace(/[\s.-]/g, '');

    if (/^\d{6,}$/.test(sinSeparadores)) {
        const p = filtro.param(sql.NVarChar, `%${sinSeparadores}%`);
        filtro.agregar(
            `(REPLACE(REPLACE(c.dni, '.', ''), '-', '') LIKE ${p}` +
            ` OR REPLACE(REPLACE(c.cuit, '.', ''), '-', '') LIKE ${p})`
        );
        return;
    }

    agregarTexto(filtro, cliente, ["CONCAT(c.nombre, ' ', c.apellido)"]);
}

function agregarLike(filtro, columna, valor) {
    const p = filtro.param(sql.NVarChar, `%${escaparLike(valor)}%`);
    filtro.agregar(`${columna} ${SIN_ACENTOS} LIKE ${p}`);
}

// solo expedientes del usuario (ver acceso.repository). guarda el parametro para reusarlo en el SELECT
function agregarAcceso(filtro, usuarioId) {
    if (!usuarioId) return;
    filtro.paramUsuario = filtro.param(sql.Int, usuarioId);
    filtro.agregar(condicionAcceso('e', filtro.paramUsuario));
}

// el hasta incluye el dia completo
function agregarRangoFechas(filtro, columna, desde, hasta) {
    if (desde) {
        filtro.agregar(`${columna} >= ${filtro.param(sql.Date, desde)}`);
    }
    if (hasta) {
        filtro.agregar(`${columna} < DATEADD(day, 1, ${filtro.param(sql.Date, hasta)})`);
    }
}

// el año de un numero interno (EXP-año-id) no se filtra aca sino en el servicio,
// con la misma funcion que arma el numero que ve el usuario (ver busqueda.service)
function armarFiltroExpedientes(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('e.activo = 1');
    agregarAcceso(filtro, filtros.usuarioId);

    if (filtros.expedienteId) filtro.agregar(`e.id = ${filtro.param(sql.Int, filtros.expedienteId)}`);
    if (filtros.texto) agregarTexto(filtro, filtros.texto, ['e.caratula', 'e.descripcion', 'e.contraparte']);
    if (filtros.cliente) agregarCliente(filtro, filtros.cliente);
    if (filtros.numeroCausa) agregarLike(filtro, 'e.numero_expediente_judicial', filtros.numeroCausa);
    if (filtros.area) agregarLike(filtro, 'e.area', filtros.area);
    if (filtros.estado) agregarLike(filtro, 'ee.nombre', filtros.estado);
    agregarRangoFechas(filtro, 'e.fecha_inicio', filtros.fechaDesde, filtros.fechaHasta);

    return filtro;
}

// columnas del resumen generado por IA (HU42) en las que tambien se busca el texto libre (HU44).
// dr solo trae resumenes ya procesados: los documentos sin resumen se buscan por sus datos de siempre
const COLUMNAS_RESUMEN = [
    'dr.resumen',
    'dr.palabras_clave',
    'dr.tipo_detectado',
    "JSON_VALUE(dr.datos_json, '$.partes.actor')",
    "JSON_VALUE(dr.datos_json, '$.partes.demandado')",
];

function armarFiltroDocumentos(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('d.activo = 1');
    filtro.agregar('e.activo = 1');
    agregarAcceso(filtro, filtros.usuarioId);

    if (filtros.expedienteId) filtro.agregar(`d.expediente = ${filtro.param(sql.Int, filtros.expedienteId)}`);
    if (filtros.texto) {
        agregarTexto(filtro, filtros.texto, ['d.nombre_archivo', 'd.descripcion', 'e.caratula', 'td.nombre', ...COLUMNAS_RESUMEN]);
    }
    if (filtros.cliente) agregarCliente(filtro, filtros.cliente);
    if (filtros.numeroCausa) agregarLike(filtro, 'e.numero_expediente_judicial', filtros.numeroCausa);
    // el tipo cargado por el usuario o el que detecto la IA (un "Escrito" puede ser en realidad una demanda)
    if (filtros.tipoDocumento) agregarTexto(filtro, filtros.tipoDocumento, ['td.nombre', 'dr.tipo_detectado']);
    if (filtros.area) agregarLike(filtro, 'e.area', filtros.area);
    agregarRangoFechas(filtro, 'COALESCE(d.fecha_documento, d.fecha_creacion)', filtros.fechaDesde, filtros.fechaHasta);

    return filtro;
}

function armarFiltroClientes(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('c.activo = 1');

    // solo clientes con algun expediente activo del usuario
    if (filtros.usuarioId) {
        filtro.paramUsuario = filtro.param(sql.Int, filtros.usuarioId);
        filtro.agregar(
            `EXISTS (SELECT 1 FROM expediente e WHERE e.cliente = c.id AND e.activo = 1 AND ${condicionAcceso('e', filtro.paramUsuario)})`
        );
    }

    // en clientes el texto libre se interpreta como nombre, apellido, DNI o CUIT
    const criterio = filtros.cliente ?? filtros.texto;
    if (criterio) agregarCliente(filtro, criterio);

    return filtro;
}

// ids de la tabla estadotarea
const ESTADO_TAREA = { PENDIENTE: 1, CUMPLIDO: 2, VENCIDO: 3, NO_PROCEDENTE: 4 };

// una tarea esta vencida si quedo marcada asi o si sigue pendiente con la fecha ya pasada
const TAREA_VENCIDA =
    `(t.estado_tarea = ${ESTADO_TAREA.VENCIDO}` +
    ` OR (t.estado_tarea = ${ESTADO_TAREA.PENDIENTE} AND t.fecha_vencimiento < CAST(GETDATE() AS date)))`;

const CONDICION_ESTADO_TAREA = {
    // pendientes incluye las vencidas: todo lo que todavia hay que hacer
    pendientes: `(t.estado_tarea = ${ESTADO_TAREA.PENDIENTE} OR ${TAREA_VENCIDA})`,
    vencidas: TAREA_VENCIDA,
    cumplidas: `t.estado_tarea = ${ESTADO_TAREA.CUMPLIDO}`,
};

// HU36: tareas de los expedientes activos
function armarFiltroTareas(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('e.activo = 1');
    agregarAcceso(filtro, filtros.usuarioId);

    if (filtros.expedienteId) filtro.agregar(`t.expediente = ${filtro.param(sql.Int, filtros.expedienteId)}`);
    if (filtros.texto) agregarTexto(filtro, filtros.texto, ['t.titulo', 't.descripcion']);
    if (filtros.cliente) agregarCliente(filtro, filtros.cliente);
    if (filtros.numeroCausa) agregarLike(filtro, 'e.numero_expediente_judicial', filtros.numeroCausa);
    if (CONDICION_ESTADO_TAREA[filtros.estadoTarea]) filtro.agregar(CONDICION_ESTADO_TAREA[filtros.estadoTarea]);
    agregarRangoFechas(filtro, 't.fecha_vencimiento', filtros.fechaDesde, filtros.fechaHasta);

    return filtro;
}

// HU36: novedades activas de los expedientes activos
function armarFiltroNovedades(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('n.activo = 1');
    filtro.agregar('e.activo = 1');
    agregarAcceso(filtro, filtros.usuarioId);

    if (filtros.expedienteId) filtro.agregar(`n.expediente = ${filtro.param(sql.Int, filtros.expedienteId)}`);
    if (filtros.texto) agregarTexto(filtro, filtros.texto, ['n.titulo', 'n.descripcion', 'tn.nombre']);
    if (filtros.cliente) agregarCliente(filtro, filtros.cliente);
    if (filtros.numeroCausa) agregarLike(filtro, 'e.numero_expediente_judicial', filtros.numeroCausa);
    if (filtros.soloProcesales) filtro.agregar('n.es_procesal = 1');
    agregarRangoFechas(filtro, 'n.fecha_novedad', filtros.fechaDesde, filtros.fechaHasta);

    return filtro;
}

async function ejecutar(filtro, armarConsulta) {
    const pool = await conectarBD();
    const req = pool.request();

    for (const { nombre, tipo, valor } of filtro.parametros) {
        req.input(nombre, tipo, valor);
    }

    const resultado = await req.query(armarConsulta(`WHERE ${filtro.condiciones.join(' AND ')}`));
    return resultado.recordset;
}

async function buscarExpedientes(filtros) {
    const filtro = armarFiltroExpedientes(filtros);
    const limite = filtro.param(sql.Int, filtros.limite);

    return ejecutar(filtro, (where) => `
        SELECT TOP (${limite})
            e.id,
            e.caratula,
            e.numero_expediente_judicial    AS numeroExpedienteJudicial,
            e.area,
            e.fecha_inicio                  AS fechaInicio,
            e.fecha_creacion                AS fechaCreacion,
            te.nombre                       AS tipoNombre,
            ee.nombre                       AS estadoNombre,
            c.id                            AS clienteId,
            CONCAT(c.nombre, ' ', c.apellido) AS clienteNombre
        FROM expediente e
        LEFT JOIN tipoexpediente   te ON te.id = e.tipo_expediente
        LEFT JOIN estadoexpediente ee ON ee.id = e.estado_expediente
        LEFT JOIN cliente          c  ON c.id  = e.cliente
        ${where}
        ORDER BY e.fecha_ultima_modificacion DESC
    `);
}

async function buscarDocumentos(filtros) {
    const filtro = armarFiltroDocumentos(filtros);
    const limite = filtro.param(sql.Int, filtros.limite);

    return ejecutar(filtro, (where) => `
        SELECT TOP (${limite})
            d.id,
            d.nombre_archivo                AS nombreArchivo,
            d.descripcion,
            d.fecha_documento               AS fechaDocumento,
            d.fecha_creacion                AS fechaCreacion,
            td.nombre                       AS tipoDocumento,
            e.id                            AS expedienteId,
            e.caratula,
            e.fecha_creacion                AS expedienteFechaCreacion,
            dr.resumen
        FROM documento d
        INNER JOIN expediente    e  ON e.id  = d.expediente
        LEFT JOIN  tipodocumento td ON td.id = d.tipo_documento
        LEFT JOIN  cliente       c  ON c.id  = e.cliente
        LEFT JOIN  documento_resumen dr ON dr.documento_id = d.id AND dr.estado = 'procesado'
        ${where}
        ORDER BY COALESCE(d.fecha_documento, d.fecha_creacion) DESC
    `);
}

async function buscarClientes(filtros) {
    const filtro = armarFiltroClientes(filtros);
    const limite = filtro.param(sql.Int, filtros.limite);
    // la cantidad de expedientes cuenta solo los del usuario
    const accesoEnConteo = filtro.paramUsuario ? ` AND ${condicionAcceso('e', filtro.paramUsuario)}` : '';

    return ejecutar(filtro, (where) => `
        SELECT TOP (${limite})
            c.id,
            c.nombre,
            c.apellido,
            c.dni,
            c.cuit,
            (SELECT COUNT(*) FROM expediente e WHERE e.cliente = c.id AND e.activo = 1${accesoEnConteo}) AS cantidadExpedientes
        FROM cliente c
        ${where}
        ORDER BY c.apellido, c.nombre
    `);
}

async function buscarTareas(filtros) {
    const filtro = armarFiltroTareas(filtros);
    const limite = filtro.param(sql.Int, filtros.limite);
    // lo urgente primero; las cumplidas, de la mas reciente a la mas vieja.
    // las que no tienen vencimiento van al final
    const orden = filtros.estadoTarea === 'cumplidas' ? 'DESC' : 'ASC';

    return ejecutar(filtro, (where) => `
        SELECT TOP (${limite})
            t.id,
            t.titulo,
            t.descripcion,
            t.fecha_vencimiento             AS fechaVencimiento,
            t.hora,
            et.nombre                       AS estadoNombre,
            p.nombre                        AS prioridadNombre,
            CAST(CASE WHEN ${TAREA_VENCIDA} THEN 1 ELSE 0 END AS bit) AS vencida,
            e.id                            AS expedienteId,
            e.caratula,
            e.fecha_creacion                AS expedienteFechaCreacion
        FROM tarea t
        INNER JOIN expediente   e  ON e.id  = t.expediente
        INNER JOIN estadotarea  et ON et.id = t.estado_tarea
        LEFT JOIN  prioridad    p  ON p.id  = t.prioridad
        LEFT JOIN  cliente      c  ON c.id  = e.cliente
        ${where}
        ORDER BY CASE WHEN t.fecha_vencimiento IS NULL THEN 1 ELSE 0 END, t.fecha_vencimiento ${orden}, t.id
    `);
}

async function buscarNovedades(filtros) {
    const filtro = armarFiltroNovedades(filtros);
    const limite = filtro.param(sql.Int, filtros.limite);

    return ejecutar(filtro, (where) => `
        SELECT TOP (${limite})
            n.id,
            n.titulo,
            n.descripcion,
            n.fecha_novedad                 AS fechaNovedad,
            n.es_procesal                   AS esProcesal,
            tn.nombre                       AS tipoNovedad,
            e.id                            AS expedienteId,
            e.caratula,
            e.fecha_creacion                AS expedienteFechaCreacion
        FROM novedad n
        INNER JOIN expediente  e  ON e.id  = n.expediente
        LEFT JOIN  tiponovedad tn ON tn.id = n.tipo_novedad
        LEFT JOIN  cliente     c  ON c.id  = e.cliente
        ${where}
        ORDER BY n.fecha_novedad DESC, n.id DESC
    `);
}

module.exports = {
    buscarExpedientes,
    buscarDocumentos,
    buscarClientes,
    buscarTareas,
    buscarNovedades,
    // se exportan para poder testear el armado del WHERE sin base de datos
    escaparLike,
    armarFiltroExpedientes,
    armarFiltroDocumentos,
    armarFiltroClientes,
    armarFiltroTareas,
    armarFiltroNovedades,
};