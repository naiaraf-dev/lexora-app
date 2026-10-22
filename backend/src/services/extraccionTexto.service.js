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

// un .docx es un ZIP: suma los tamanos descomprimidos que declara su directorio central,
// sin descomprimir nada, para descartar archivos que se inflan de mas ("zip bomb").
// devuelve null si el archivo no es un ZIP valido e Infinity si usa ZIP64 (tamanos de mas de 4 GB)
function tamanioDescomprimidoZip(buffer) {
    const FIN_DIRECTORIO = 0x06054b50;
    const ENTRADA = 0x02014b50;

    // el registro final mide 22 bytes mas un comentario de hasta 65535
    let fin = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
        if (buffer.readUInt32LE(i) === FIN_DIRECTORIO) { fin = i; break; }
    }
    if (fin < 0) return null;

    const cantidad = buffer.readUInt16LE(fin + 10);
    let posicion = buffer.readUInt32LE(fin + 16);
    if (cantidad === 0xffff || posicion === 0xffffffff) return Infinity;

    let total = 0;
    for (let n = 0; n < cantidad; n++) {
        if (posicion + 46 > buffer.length || buffer.readUInt32LE(posicion) !== ENTRADA) return null;
        const tamanio = buffer.readUInt32LE(posicion + 24);
        if (tamanio === 0xffffffff) return Infinity;
        total += tamanio;
        posicion += 46 + buffer.readUInt16LE(posicion + 28) + buffer.readUInt16LE(posicion + 30) + buffer.readUInt16LE(posicion + 32);
    }
    return total;
}

async function textoDeWord(buffer, extension) {
    if (extension === 'docx') {
        const { value } = await mammoth.extractRawText({ buffer });
        return normalizar(value);
    }

    if (extension === 'doc') {
        const documento = await new WordExtractor().extract(buffer);
        return normalizar(documento.getBody());
    }

    throw new Error(`No se puede extraer texto de archivos .${extension}`);
}

module.exports = { esWord, textoDeWord, normalizar, tamanioDescomprimidoZip };
