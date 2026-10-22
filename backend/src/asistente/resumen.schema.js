const { z } = require('zod');

// formato del resumen de un documento (HU42).
// ESQUEMA_JSON_RESUMEN se le pide a la IA como salida estructurada;
// resumenSchema lo valida antes de guardarlo en documento_resumen.

// largos maximos de las columnas de documento_resumen
const LARGO_MAXIMO = { tipo: 100, resumen: 2000, palabrasClave: 1000 };

const texto = (descripcion) => ({ type: 'string', description: descripcion });
const listaDeTextos = (descripcion) => ({ type: 'array', items: { type: 'string' }, description: descripcion });

const ESQUEMA_JSON_RESUMEN = {
    type: 'object',
    properties: {
        tipo_detectado: texto('Tipo de documento, por ejemplo Demanda, Contestación, Sentencia, Cédula, Contrato o Poder.'),
        resumen: texto('Resumen de 2 a 4 oraciones, de hasta 1500 caracteres.'),
        palabras_clave: listaDeTextos('Entre 5 y 15 palabras o frases para buscar el documento, con sinónimos útiles.'),
        partes: {
            type: 'object',
            properties: {
                actor: texto('Actor o parte que inicia, vacío si no aparece.'),
                demandado: texto('Demandado o contraparte, vacío si no aparece.'),
                otros: listaDeTextos('Otras partes o intervinientes relevantes.'),
            },
            required: ['actor', 'demandado', 'otros'],
            additionalProperties: false,
        },
        fechas: {
            type: 'array',
            description: 'Fechas relevantes que aparecen en el documento.',
            items: {
                type: 'object',
                properties: {
                    fecha: texto('Fecha en formato AAAA-MM-DD.'),
                    descripcion: texto('Qué ocurrió en esa fecha.'),
                },
                required: ['fecha', 'descripcion'],
                additionalProperties: false,
            },
        },
        montos: {
            type: 'array',
            description: 'Montos de dinero que aparecen en el documento.',
            items: {
                type: 'object',
                properties: {
                    monto: { type: 'number', description: 'Importe sin separadores de miles.' },
                    moneda: texto('Moneda, por ejemplo ARS o USD.'),
                    concepto: texto('A qué corresponde el monto.'),
                },
                required: ['monto', 'moneda', 'concepto'],
                additionalProperties: false,
            },
        },
        temas: listaDeTextos('Temas jurídicos principales del documento.'),
    },
    required: ['tipo_detectado', 'resumen', 'palabras_clave', 'partes', 'fechas', 'montos', 'temas'],
    additionalProperties: false,
};

const textoLimpio = z.string().trim();

const resumenSchema = z.object({
    tipo_detectado: textoLimpio.transform((t) => t.slice(0, LARGO_MAXIMO.tipo)),
    resumen: textoLimpio.min(1).transform((t) => t.slice(0, LARGO_MAXIMO.resumen)),
    palabras_clave: z.array(textoLimpio),
    partes: z.object({
        actor: textoLimpio,
        demandado: textoLimpio,
        otros: z.array(textoLimpio),
    }),
    fechas: z.array(z.object({ fecha: textoLimpio, descripcion: textoLimpio })),
    montos: z.array(z.object({ monto: z.number().finite(), moneda: textoLimpio, concepto: textoLimpio })),
    temas: z.array(textoLimpio),
});

// une las palabras clave sin repetidas y sin pasarse del largo de la columna
function unirPalabrasClave(palabras, largoMaximo = LARGO_MAXIMO.palabrasClave) {
    const vistas = new Set();
    let resultado = '';

    for (const palabra of palabras) {
        const clave = palabra.toLowerCase();
        if (!palabra || vistas.has(clave)) continue;

        const siguiente = resultado ? `${resultado}, ${palabra}` : palabra;
        if (siguiente.length > largoMaximo) break;

        vistas.add(clave);
        resultado = siguiente;
    }

    return resultado;
}

module.exports = { ESQUEMA_JSON_RESUMEN, resumenSchema, unirPalabrasClave, LARGO_MAXIMO };
