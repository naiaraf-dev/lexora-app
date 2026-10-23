const zlib = require('zlib');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');

// la IA lee PDF e imagenes directamente, pero no archivos Word:
// estos se convierten a texto plano antes de enviarlos (HU42)

const EXTENSIONES_WORD = ['docx', 'doc'];

function esWord(extension) {
    return EXTENSIONES_WORD.includes(extension);
}

// colapsa espacios y lineas vacias de mas
function normalizar(texto) {
    return texto
        .replace(/\r/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// el formato real se decide por el contenido y no por la extension: un .docx renombrado a .doc
// sigue siendo un ZIP y tiene que pasar por el mismo control
const FIRMA_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK.." (.docx)
const FIRMA_OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]); // Word 97-2003 (.doc)

function esZip(buffer) {
    return buffer.subarray(0, 4).equals(FIRMA_ZIP);
}

function esOle(buffer) {
    return buffer.subarray(0, 4).equals(FIRMA_OLE);
}

/**
 * Descomprime cada archivo del ZIP con un tope sobre los bytes que salen de verdad, sin creer en los
 * tamanos que el archivo declara de si mismo, para descartar los que se inflan de mas ("zip bomb").
 * Lee el directorio central igual que la libreria que abre los .docx (jszip, via mammoth).
 * @returns {number|null} bytes descomprimidos; Infinity si pasan de "maximo"; null si no es un ZIP valido
 */
function bytesDescomprimidosZip(buffer, maximo) {
    const FIN_DIRECTORIO = 0x06054b50;
    const ENTRADA = 0x02014b50;
    const ENCABEZADO_LOCAL = 0x04034b50;

    // el registro final mide 22 bytes mas un comentario de hasta 65535
    let fin = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
        if (buffer.readUInt32LE(i) === FIN_DIRECTORIO) { fin = i; break; }
    }
    if (fin < 0) return null;

    const cantidad = buffer.readUInt16LE(fin + 10);
    let posicion = buffer.readUInt32LE(fin + 16);
    // ZIP64 (mas de 65535 archivos o de 4 GB): un escrito judicial nunca lo necesita
    if (cantidad === 0xffff || posicion === 0xffffffff) return Infinity;

    let total = 0;
    for (let n = 0; n < cantidad; n++) {
        if (posicion + 46 > buffer.length || buffer.readUInt32LE(posicion) !== ENTRADA) return null;
        const metodo = buffer.readUInt16LE(posicion + 10);
        const comprimido = buffer.readUInt32LE(posicion + 20);
        const local = buffer.readUInt32LE(posicion + 42);
        if (comprimido === 0xffffffff || local === 0xffffffff) return Infinity;
        posicion += 46 + buffer.readUInt16LE(posicion + 28) + buffer.readUInt16LE(posicion + 30) + buffer.readUInt16LE(posicion + 32);

        if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== ENCABEZADO_LOCAL) return null;
        const inicio = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
        if (inicio + comprimido > buffer.length) return null;
        const datos = buffer.subarray(inicio, inicio + comprimido);

        const restante = maximo - total;
        if (metodo === 0) {
            total += datos.length; // guardado sin comprimir
        } else if (metodo === 8) {
            try {
                // zlib corta apenas la salida pasa el tope: nunca se arma el archivo entero en memoria
                total += zlib.inflateRawSync(datos, { maxOutputLength: Math.max(1, restante) }).length;
            } catch (error) {
                if (error.code === 'ERR_BUFFER_TOO_LARGE') return Infinity;
                return null;
            }
        } else {
            return null; // otros metodos de compresion no los usa Word
        }
        if (total > maximo) return Infinity;
    }
    return total;
}

class ArchivoWordInvalido extends Error {}

/**
 * @param {Buffer} buffer
 * @param {number} maximoDescomprimido - tope de bytes al descomprimir un .docx
 * @throws {ArchivoWordInvalido} si el archivo esta danado, no es Word o se infla de mas
 */
async function textoDeWord(buffer, maximoDescomprimido) {
    if (esZip(buffer)) {
        const bytes = bytesDescomprimidosZip(buffer, maximoDescomprimido);
        if (bytes === null) throw new ArchivoWordInvalido('El archivo Word está dañado');
        if (bytes > maximoDescomprimido) throw new ArchivoWordInvalido('El archivo Word es demasiado grande al descomprimirlo');

        const { value } = await mammoth.extractRawText({ buffer });
        return normalizar(value);
    }

    // un .doc no esta comprimido: su tamano ya quedo limitado por el tope de descarga
    if (esOle(buffer)) {
        const documento = await new WordExtractor().extract(buffer);
        return normalizar(documento.getBody());
    }

    throw new ArchivoWordInvalido('El archivo no es un documento Word válido');
}

module.exports = { esWord, textoDeWord, normalizar, bytesDescomprimidosZip, ArchivoWordInvalido };
