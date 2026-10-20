const enlacesDescargaService = require('../services/enlacesDescarga.service');

// responde con el formato de errores del contrato, sin detalles internos
function responderError(res, error) {
    if (error.codigo) {
        return res.status(error.statusCode).json({ codigo: error.codigo, mensaje: error.message });
    }

    console.error('Error en descarga de Litis:', error.message);
    return res.status(500).json({
        codigo: 'ERROR_INTERNO',
        mensaje: 'Ocurrió un error. Probá de nuevo en unos minutos.',
    });
}

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

        res.send(archivo.contenido);
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = {
    pedirEnlace,
    descargar,
};
