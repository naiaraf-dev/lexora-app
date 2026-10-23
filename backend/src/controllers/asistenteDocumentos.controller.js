const enlacesDescargaService = require('../services/enlacesDescarga.service');
const { responderError } = require('../asistente/errores');
const auditoria = require('../asistente/auditoria');

// genera un enlace temporal para ver o descargar un documento
async function pedirEnlace(req, res) {
    try {
        const enlace = await enlacesDescargaService.crearEnlace(req.params.id, req.usuario, req.body?.modo);
        res.json(enlace);
    } catch (error) {
        responderError(res, error);
    }
}

// entrega el archivo a partir del token del enlace
async function descargar(req, res) {
    try {
        const archivo = await enlacesDescargaService.obtenerArchivo(req.query.t, req.query.modo);

        res.setHeader('Content-Type', archivo.tipoContenido);
        res.setHeader(
            'Content-Disposition',
            `${archivo.disposicion}; filename*=UTF-8''${encodeURIComponent(archivo.nombreArchivo)}`
        );
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // queda en el log de seguridad quien descargo que documento desde Litis (HU40)
        await auditoria.registrarDescarga(req, archivo);

        res.send(archivo.contenido);
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = {
    pedirEnlace,
    descargar,
};
