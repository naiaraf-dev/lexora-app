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

module.exports = { esWord, textoDeWord, normalizar };
