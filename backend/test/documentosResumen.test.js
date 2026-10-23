// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

// documentos.service toma las funciones de cloudinary al cargarse:
// se reemplazan ANTES de requerirlo para no subir archivos de verdad
const cloudinaryDocumento = require('../src/services/cloudinaryDocumento.service');
cloudinaryDocumento.subirDocumentoACloudinary = async () => ({ public_id: 'lexora/documentos/nuevo', secure_url: 'https://x', resource_type: 'raw' });
cloudinaryDocumento.eliminarDocumentoDeCloudinary = async () => ({ result: 'ok' });

const { describe, test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const documentosRepository = require('../src/repositories/documentos.repository');
const resumenesService = require('../src/services/resumenes.service');
const documentosService = require('../src/services/documentos.service');

const ARCHIVO = { originalname: 'demanda.pdf', buffer: Buffer.from('%PDF') };

function simularValidaciones() {
    for (const metodo of ['existeExpediente', 'existeNovedad', 'existeTarea', 'existeUsuario', 'existeTipoDocumento']) {
        mock.method(documentosRepository, metodo, async () => true);
    }
}

afterEach(() => mock.restoreAll());

describe('HU42 - encolado desde la subida de documentos', () => {
    test('subir un documento lo encola para resumir', async () => {
        simularValidaciones();
        mock.method(documentosRepository, 'insertarDocumento', async () => ({ id: 911 }));
        const encolar = mock.method(resumenesService, 'encolar', async () => {});

        await documentosService.subirEInsertarDocumento(
            { expediente: 1, usuario_creacion: 1, tipo_documento: 1 }, ARCHIVO
        );

        assert.deepEqual(encolar.mock.calls[0].arguments, [911]);
    });

    test('reemplazar el archivo vuelve a encolar el documento', async () => {
        simularValidaciones();
        mock.method(documentosRepository, 'obtenerDocumentoPorId', async () => ({ id: 911, storage_key: 'lexora/documentos/viejo' }));
        mock.method(documentosRepository, 'modificarDocumento', async () => ({ id: 911 }));
        const encolar = mock.method(resumenesService, 'encolar', async () => {});

        await documentosService.modificarDocumento(911, { idexpediente: 1 }, ARCHIVO);

        assert.deepEqual(encolar.mock.calls[0].arguments, [911]);
    });

    test('editar solo los datos, sin archivo nuevo, no vuelve a resumir', async () => {
        simularValidaciones();
        mock.method(documentosRepository, 'obtenerDocumentoPorId', async () => ({ id: 911, storage_key: 'lexora/documentos/viejo' }));
        mock.method(documentosRepository, 'modificarDocumento', async () => ({ id: 911 }));
        const encolar = mock.method(resumenesService, 'encolar', async () => {});

        await documentosService.modificarDocumento(911, { idexpediente: 1, descripcion: 'nueva' }, undefined);

        assert.equal(encolar.mock.callCount(), 0);
    });
});
