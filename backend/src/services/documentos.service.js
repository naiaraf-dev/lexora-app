const documentosRepository = require('../repositories/documentos.repository');

const {
    subirDocumentoACloudinary,
    eliminarDocumentoDeCloudinary,
    obtenerUrlDocumentoCloudinary
} = require('./cloudinaryDocumento.service');

// trae documentos aplicando los filtros que llegan desde el controller
async function obtenerDocumentos(filtros) {
    return await documentosRepository.obtenerDocumentos(filtros);
}

// trae todos los documentos sin filtros
async function obtenerTodosLosDocumentos() {
    return await documentosRepository.obtenerTodosLosDocumentos();
}

// inserta un documento sin subir archivo real, usando una storage key simulada
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

    // valida campos obligatorios antes de insertar
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

    // si viene novedad, valida que exista
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

    // arma una key simulada para guardar en la base
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

// sube el archivo a cloudinary y despues inserta el documento en la base
async function subirEInsertarDocumento(datos, file) {
    if (!file) {
        const error = new Error('El archivo es obligatorio');
        error.statusCode = 400;
        throw error;
    }

    const {
        descripcion,
        fecha_documento,
        activo,
        expediente,
        novedad,
        usuario_creacion,
        tipo_documento
    } = datos;

    // valida los datos principales antes de subir
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

    const expedienteExiste = await documentosRepository.existeExpediente(Number(expediente));

    if (!expedienteExiste) {
        const error = new Error(`No existe un expediente con id ${expediente}`);
        error.statusCode = 400;
        throw error;
    }

    if (novedad) {
        const novedadExiste = await documentosRepository.existeNovedad(Number(novedad));

        if (!novedadExiste) {
            const error = new Error(`No existe una novedad con id ${novedad}`);
            error.statusCode = 400;
            throw error;
        }
    }

    const usuarioExiste = await documentosRepository.existeUsuario(Number(usuario_creacion));

    if (!usuarioExiste) {
        const error = new Error(`No existe un usuario con id ${usuario_creacion}`);
        error.statusCode = 400;
        throw error;
    }

    const tipoDocumentoExiste = await documentosRepository.existeTipoDocumento(Number(tipo_documento));

    if (!tipoDocumentoExiste) {
        const error = new Error(`No existe un tipo de documento con id ${tipo_documento}`);
        error.statusCode = 400;
        throw error;
    }

    const resultadoCloudinary = await subirDocumentoACloudinary(file);

    const nombreArchivo = file.originalname
        ? Buffer.from(file.originalname, 'latin1').toString('utf8')
        : `archivo_${Date.now()}`;

    const documento = {
        nombre_archivo: nombreArchivo,
        descripcion,
        fecha_documento: fecha_documento || null,
        storage_key: resultadoCloudinary.public_id,
        activo: activo === undefined ? true : activo === 'true' || activo === true || activo === '1',
        expediente: Number(expediente),
        novedad: novedad ? Number(novedad) : null,
        usuario_creacion: Number(usuario_creacion),
        tipo_documento: Number(tipo_documento)
    };

    const documentoInsertado = await documentosRepository.insertarDocumento(documento);

    // devuelve datos del documento y tambien info basica de cloudinary
    return {
        ...documentoInsertado,
        cloudinary: {
            public_id: resultadoCloudinary.public_id,
            secure_url: resultadoCloudinary.secure_url,
            resource_type: resultadoCloudinary.resource_type,
            format: resultadoCloudinary.format
        }
    };
}

// genera la url de descarga para un documento guardado
async function obtenerUrlDescargaDocumento(idDocumento) {
    if (!idDocumento || isNaN(Number(idDocumento))) {
        const error = new Error('El id del documento es obligatorio y debe ser numérico');
        error.statusCode = 400;
        throw error;
    }

    const documento = await documentosRepository.obtenerDocumentoPorId(Number(idDocumento));

    if (!documento) {
        const error = new Error(`No existe un documento con id ${idDocumento}`);
        error.statusCode = 404;
        throw error;
    }

    if (!documento.storage_key) {
        const error = new Error('El documento no tiene archivo asociado');
        error.statusCode = 404;
        throw error;
    }

    const url = obtenerUrlDocumentoCloudinary(documento.storage_key);

    return {
        documento,
        url
    };
}

// elimina el archivo de cloudinary y despues borra el registro de la base
async function eliminarDocumento(idDocumento) {
    if (!idDocumento || isNaN(Number(idDocumento))) {
        const error = new Error('El id del documento es obligatorio y debe ser numérico');
        error.statusCode = 400;
        throw error;
    }

    const documento = await documentosRepository.obtenerDocumentoPorId(Number(idDocumento));

    if (!documento) {
        const error = new Error(`No existe un documento con id ${idDocumento}`);
        error.statusCode = 404;
        throw error;
    }

    let resultadoCloudinary = null;

    if (documento.storage_key) {
        resultadoCloudinary = await eliminarDocumentoDeCloudinary(documento.storage_key);

        // acepta ok o not found, porque si no esta en cloudinary igual puede borrarse de la base
        if (
            resultadoCloudinary.result !== 'ok' &&
            resultadoCloudinary.result !== 'not found' &&
            resultadoCloudinary.result !== 'sin_storage_key'
        ) {
            const error = new Error('No se pudo eliminar el documento de Cloudinary');
            error.statusCode = 500;
            error.detalle = resultadoCloudinary;
            throw error;
        }
    }

    const documentoEliminado = await documentosRepository.eliminarDocumentoPorId(Number(idDocumento));

    return {
        documentoEliminado,
        cloudinary: resultadoCloudinary
    };
}

// modifica los datos del documento y si viene un archivo nuevo reemplaza el anterior
async function modificarDocumento(idDocumento, datos, file) {
    if (!idDocumento || isNaN(Number(idDocumento))) {
        const error = new Error('El id del documento es obligatorio y debe ser numérico');
        error.statusCode = 400;
        throw error;
    }

    const documentoActual = await documentosRepository.obtenerDocumentoPorId(Number(idDocumento));

    if (!documentoActual) {
        const error = new Error(`No existe un documento con id ${idDocumento}`);
        error.statusCode = 404;
        throw error;
    }

    const {
        descripcion,
        fecha_documento,
        idexpediente,
        novedad
    } = datos;

    if (!idexpediente) {
        const error = new Error('El expediente es obligatorio');
        error.statusCode = 400;
        throw error;
    }

    const expedienteExiste = await documentosRepository.existeExpediente(Number(idexpediente));

    if (!expedienteExiste) {
        const error = new Error(`No existe un expediente con id ${idexpediente}`);
        error.statusCode = 400;
        throw error;
    }

    if (novedad) {
        const novedadExiste = await documentosRepository.existeNovedad(Number(novedad));

        if (!novedadExiste) {
            const error = new Error(`No existe una novedad con id ${novedad}`);
            error.statusCode = 400;
            throw error;
        }
    }

    let resultadoCloudinaryNuevo = null;
    let resultadoCloudinaryAnterior = null;

    const { tipo_documento } = datos;

    const datosActualizacion = {
        descripcion,
        fecha_documento: fecha_documento || null,
        expediente: Number(idexpediente),
        novedad: novedad ? Number(novedad) : null,
        tipo_documento: tipo_documento ? Number(tipo_documento) : undefined
    };

    if (file) {
        resultadoCloudinaryNuevo = await subirDocumentoACloudinary(file);

        datosActualizacion.nombre_archivo = file.originalname
            ? Buffer.from(file.originalname, 'latin1').toString('utf8')
            : `archivo_${Date.now()}`;

        datosActualizacion.storage_key = resultadoCloudinaryNuevo.public_id;
    }

    let documentoModificado;

    try {
        documentoModificado = await documentosRepository.modificarDocumento(
            Number(idDocumento),
            datosActualizacion
        );
    } catch (error) {
        // si fallo la base despues de subir el archivo nuevo, lo borra para no dejar basura en cloudinary
        if (resultadoCloudinaryNuevo?.public_id) {
            await eliminarDocumentoDeCloudinary(resultadoCloudinaryNuevo.public_id);
        }

        throw error;
    }

    // si se subio un archivo nuevo, borra el anterior de cloudinary
    if (file && documentoActual.storage_key) {
        resultadoCloudinaryAnterior = await eliminarDocumentoDeCloudinary(documentoActual.storage_key);
    }

    return {
        documentoAnterior: documentoActual,
        documentoModificado,
        cloudinary: {
            archivoNuevo: resultadoCloudinaryNuevo
                ? {
                    public_id: resultadoCloudinaryNuevo.public_id,
                    secure_url: resultadoCloudinaryNuevo.secure_url,
                    resource_type: resultadoCloudinaryNuevo.resource_type,
                    format: resultadoCloudinaryNuevo.format
                }
                : null,
            archivoAnteriorEliminado: resultadoCloudinaryAnterior
        }
    };
}

module.exports = {
    obtenerDocumentos,
    obtenerTodosLosDocumentos,
    insertarDocumento,
    subirEInsertarDocumento,
    obtenerUrlDescargaDocumento,
    eliminarDocumento,
    modificarDocumento
};