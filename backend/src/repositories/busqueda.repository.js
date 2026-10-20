const { sql, conectarBD } = require('../config/db');

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

// el hasta incluye el dia completo
function agregarRangoFechas(filtro, columna, desde, hasta) {
    if (desde) {
        filtro.agregar(`${columna} >= ${filtro.param(sql.Date, desde)}`);
    }
    if (hasta) {
        filtro.agregar(`${columna} < DATEADD(day, 1, ${filtro.param(sql.Date, hasta)})`);
    }
}

function armarFiltroExpedientes(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('e.activo = 1');

    if (filtros.expedienteId) filtro.agregar(`e.id = ${filtro.param(sql.Int, filtros.expedienteId)}`);
    if (filtros.texto) agregarTexto(filtro, filtros.texto, ['e.caratula', 'e.descripcion', 'e.contraparte']);
    if (filtros.cliente) agregarCliente(filtro, filtros.cliente);
    if (filtros.numeroCausa) agregarLike(filtro, 'e.numero_expediente_judicial', filtros.numeroCausa);
    if (filtros.area) agregarLike(filtro, 'e.area', filtros.area);
    if (filtros.estado) agregarLike(filtro, 'ee.nombre', filtros.estado);
    agregarRangoFechas(filtro, 'e.fecha_inicio', filtros.fechaDesde, filtros.fechaHasta);

    return filtro;
}

function armarFiltroDocumentos(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('d.activo = 1');
    filtro.agregar('e.activo = 1');

    if (filtros.expedienteId) filtro.agregar(`d.expediente = ${filtro.param(sql.Int, filtros.expedienteId)}`);
    if (filtros.texto) agregarTexto(filtro, filtros.texto, ['d.nombre_archivo', 'd.descripcion', 'e.caratula', 'td.nombre']);
    if (filtros.cliente) agregarCliente(filtro, filtros.cliente);
    if (filtros.numeroCausa) agregarLike(filtro, 'e.numero_expediente_judicial', filtros.numeroCausa);
    if (filtros.tipoDocumento) agregarLike(filtro, 'td.nombre', filtros.tipoDocumento);
    if (filtros.area) agregarLike(filtro, 'e.area', filtros.area);
    agregarRangoFechas(filtro, 'COALESCE(d.fecha_documento, d.fecha_creacion)', filtros.fechaDesde, filtros.fechaHasta);

    return filtro;
}

function armarFiltroClientes(filtros) {
    const filtro = crearFiltro();
    filtro.agregar('c.activo = 1');

    // en clientes el texto libre se interpreta como nombre, apellido, DNI o CUIT
    const criterio = filtros.cliente ?? filtros.texto;
    if (criterio) agregarCliente(filtro, criterio);

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
            e.fecha_creacion                AS expedienteFechaCreacion
        FROM documento d
        INNER JOIN expediente    e  ON e.id  = d.expediente
        LEFT JOIN  tipodocumento td ON td.id = d.tipo_documento
        LEFT JOIN  cliente       c  ON c.id  = e.cliente
        ${where}
        ORDER BY COALESCE(d.fecha_documento, d.fecha_creacion) DESC
    `);
}

async function buscarClientes(filtros) {
    const filtro = armarFiltroClientes(filtros);
    const limite = filtro.param(sql.Int, filtros.limite);

    return ejecutar(filtro, (where) => `
        SELECT TOP (${limite})
            c.id,
            c.nombre,
            c.apellido,
            c.dni,
            c.cuit,
            (SELECT COUNT(*) FROM expediente e WHERE e.cliente = c.id AND e.activo = 1) AS cantidadExpedientes
        FROM cliente c
        ${where}
        ORDER BY c.apellido, c.nombre
    `);
}

module.exports = {
    buscarExpedientes,
    buscarDocumentos,
    buscarClientes,
    // se exportan para poder testear el armado del WHERE sin base de datos
    escaparLike,
    armarFiltroExpedientes,
    armarFiltroDocumentos,
    armarFiltroClientes,
};