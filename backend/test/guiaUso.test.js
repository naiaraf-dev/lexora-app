// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const llm = require('../src/config/llm');
const asistenteService = require('../src/services/asistente.service');
const { armarInstrucciones, GUIA_DE_USO, INSTRUCCIONES_FIJAS } = require('../src/asistente/instrucciones');

const USUARIO = { id: 7, nombre: 'Ana', apellido: 'Gómez' };

afterEach(() => mock.restoreAll());

describe('HU38 - guía de uso del sistema', () => {
    test('la guía se carga desde manual.md', () => {
        assert.match(GUIA_DE_USO, /^# Guía de uso de Lexora/);
        assert.ok(GUIA_DE_USO.length > 2000);
    });

    // las respuestas que el front simulaba antes de conectar Litis tienen que estar cubiertas
    const TEMAS_DEL_FRONT = [
        ['liquidación de intereses', /### Generar una liquidación de intereses[\s\S]*"Nueva liquidación"/],
        ['tareas vencidas', /### Ver las tareas y los vencimientos[\s\S]*"Vencidas"/],
        ['cambiar el estado', /### Cambiar el estado de un expediente[\s\S]*"Listo para avanzar"/],
        ['subir un documento', /### Subir un documento a un expediente[\s\S]*"Subir Documento"/],
        ['agrupar bajo la misma causa', /### Agrupar expedientes bajo la misma causa[\s\S]*"Agrupar a causa"/],
        ['marcar una tarea como cumplida', /### Marcar una tarea como cumplida[\s\S]*"Marcar cumplida"/],
    ];

    for (const [tema, patron] of TEMAS_DEL_FRONT) {
        test(`cubre: ${tema}`, () => {
            assert.match(GUIA_DE_USO, patron);
        });
    }

    test('aclara lo que no existe en la pantalla en lugar de omitirlo', () => {
        assert.match(GUIA_DE_USO, /La Agenda no tiene un botón para crear tareas/);
    });

    test('las reglas piden responder solo con la guía y no inventar', () => {
        assert.match(INSTRUCCIONES_FIJAS, /Respondé solo con lo que dice la guía de uso/);
        assert.match(INSTRUCCIONES_FIJAS, /No inventes pantallas, botones, menús ni funciones/);
        assert.match(INSTRUCCIONES_FIJAS, /no tenés esa información/);
    });
});

describe('HU38 - guía dentro de las instrucciones', () => {
    test('va como bloque propio, después de las reglas y antes de los datos variables', () => {
        const bloques = armarInstrucciones({ usuario: USUARIO });

        assert.equal(bloques.length, 3);
        assert.equal(bloques[0].text, INSTRUCCIONES_FIJAS);
        assert.match(bloques[1].text, /^Guía de uso de Lexora:\n\n# Guía de uso de Lexora/);
        assert.match(bloques[2].text, /Ana Gómez/);
    });

    test('el caché se marca en el último bloque fijo (la guía) y no en el variable', () => {
        const bloques = armarInstrucciones({ usuario: USUARIO });

        assert.equal(bloques[0].cache_control, undefined);
        assert.deepEqual(bloques[1].cache_control, { type: 'ephemeral' });
        assert.equal(bloques[2].cache_control, undefined);
    });

    test('la parte fija es idéntica entre usuarios y fechas, para que el caché se reutilice', () => {
        const a = armarInstrucciones({ usuario: USUARIO, fecha: new Date('2026-10-21T12:00:00Z') });
        const b = armarInstrucciones({ usuario: { nombre: 'Gero' }, fecha: new Date('2026-12-01T12:00:00Z') });

        assert.deepEqual(a.slice(0, 2), b.slice(0, 2));
        assert.notEqual(a[2].text, b[2].text);
    });

    test('la guía le llega a la IA en una conversación real', async () => {
        const pedidos = [];
        mock.method(llm, 'estaDisponible', () => true);
        mock.method(llm, 'enviar', async (pedido) => {
            pedidos.push(pedido);
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Entrá a "Previsión y pago"…' }] };
        });

        await asistenteService.conversar({ mensaje: '¿cómo genero una liquidación de intereses?', historial: [] }, USUARIO);

        const instrucciones = pedidos[0].system.map((b) => b.text).join('\n');
        assert.match(instrucciones, /### Generar una liquidación de intereses/);
    });
});
