const logsService = require('../services/logs.service');
const { ACCIONES, MODULOS, RESULTADOS } = require('../constants/log.constants');

// registro de Litis en el log de seguridad (HU40).
// usa registrarEvento, que nunca lanza error: si falla el log, la respuesta al usuario no se corta

const LARGO_MENSAJE_EN_LOG = 300;

function recortar(texto, largo) {
    return texto.length > largo ? `${texto.slice(0, largo)}…` : texto;
}

function describirResultados(resultados = []) {
    if (resultados.length === 0) return 'ninguno';
    return resultados.map((r) => `${r.tipo} ${r.id}`).join(', ');
}

// una consulta a Litis: quien pregunto, que, desde donde, que herramientas uso y que devolvio
function describirConsulta({ mensaje, contexto }, { herramientasUsadas = [], resultados = [] } = {}, error) {
    const partes = [
        `Consulta a Litis${contexto ? ` desde ${contexto}` : ''}: "${recortar(mensaje, LARGO_MENSAJE_EN_LOG)}"`,
        `Herramientas: ${herramientasUsadas.length ? [...new Set(herramientasUsadas)].join(', ') : 'ninguna'}`,
        `Resultados: ${describirResultados(resultados)}`,
    ];
    if (error) partes.push(`Error: ${error.codigo ?? 'ERROR_INTERNO'}`);
    return partes.join('. ');
}

async function registrarConsulta(req, pedido, respuesta, error) {
    await logsService.registrarEvento(req, {
        accion: ACCIONES.CONSULTA,
        modulo: MODULOS.ASISTENTE,
        descripcion: describirConsulta(pedido, respuesta, error),
        resultado: error ? RESULTADOS.ERROR : RESULTADOS.OK,
    });
}

// la descarga llega sin sesion (se valida con el token del enlace): el usuario sale del token
async function registrarDescarga(req, archivo) {
    await logsService.registrarEvento(
        { usuario: { id: archivo.usuarioId }, ip: req.ip },
        {
            accion: ACCIONES.DESCARGA,
            modulo: MODULOS.DOCUMENTOS,
            descripcion: `Descarga desde Litis (${archivo.disposicion === 'inline' ? 'ver' : 'descargar'}): ` +
                `${archivo.nombreArchivo} (documento ${archivo.documentoId})`,
        }
    );
}

module.exports = { registrarConsulta, registrarDescarga, describirConsulta };
