const documentosRepository = require('../repositories/documentos.repository');

async function obtenerDocumentos(filtros) {
    return await documentosRepository.obtenerDocumentos(filtros);
}

async function obtenerTodosLosDocumentos() {
    return await documentosRepository.obtenerTodosLosDocumentos();
}

async function insertarDocumento(datos) {
    const {
        nombre_archivo,
        descripcion,
        fecha_documento,
        activo,
        expediente,
        novedad,
        usuario_creacion,
        tipo_documento
    } = datos;

    if (!nombre_archivo || !nombre_archivo.trim()) {
        const error = new Error('El nombre del archivo es obligatorio');
        error.statusCode = 400;
        throw error;
    }

    if (!expediente) {
        const error = new Error('El expediente es obligatorio');
        error.statusCode = 400;
        throw error;
    }

    if (!usuario_creacion) {
        const error = new Error('El usuario de creación es obligatorio');
        error.statusCode = 400;
        throw error;
    }

    if (!tipo_documento) {
        const error = new Error('El tipo de documento es obligatorio');
        error.statusCode = 400;
        throw error;
    }

    const expedienteExiste = await documentosRepository.existeExpediente(expediente);

    if (!expedienteExiste) {
        const error = new Error(`No existe un expediente con id ${expediente}`);
        error.statusCode = 400;
        throw error;
    }

    if (novedad) {
        const novedadExiste = await documentosRepository.existeNovedad(novedad);

        if (!novedadExiste) {
            const error = new Error(`No existe una novedad con id ${novedad}`);
            error.statusCode = 400;
            throw error;
        }
    }

    const usuarioExiste = await documentosRepository.existeUsuario(usuario_creacion);

    if (!usuarioExiste) {
        const error = new Error(`No existe un usuario con id ${usuario_creacion}`);
        error.statusCode = 400;
        throw error;
    }

    const tipoDocumentoExiste = await documentosRepository.existeTipoDocumento(tipo_documento);

    if (!tipoDocumentoExiste) {
        const error = new Error(`No existe un tipo de documento con id ${tipo_documento}`);
        error.statusCode = 400;
        throw error;
    }

    const storageKeySimulada = `documentos/${Date.now()}_${nombre_archivo.trim().replace(/\s+/g, '_')}`;

    const documento = {
        nombre_archivo: nombre_archivo.trim(),
        descripcion,
        fecha_documento,
        storage_key: storageKeySimulada,
        activo: activo === undefined ? true : activo,
        expediente,
        novedad,
        usuario_creacion,
        tipo_documento
    };

    return await documentosRepository.insertarDocumento(documento);
}

module.exports = {
    obtenerDocumentos,
    obtenerTodosLosDocumentos,
    insertarDocumento
};