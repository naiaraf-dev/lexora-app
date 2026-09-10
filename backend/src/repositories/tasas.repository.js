const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');

const BASE_URL = 'https://tasas2.cpacf.org.ar';


// ============================================================
// TASAS DISPONIBLES
// ============================================================

const TASAS = [

    // ACTAS CNAT
    {
        id: 22,
        nombre:
            'Tasa activa efectiva anual vencida, cartera general diversa del Banco Nación - Acta CNAT 2.658'
    },
    {
        id: 23,
        nombre:
            'Acta CNAT 2.764/22, a partir del 07/11/03 (incluye actas anteriores)'
    },
    {
        id: 30,
        nombre:
            'Actualización por CER más interés simple. Acta 2783/24 y otros'
    },

    // ACTUALIZACIÓN CRÉDITOS LABORALES
    {
        id: null,
        buscar:
            'Intereses para juicios laborales pendientes',
        nombre:
            'Intereses para juicios laborales pendientes - Ley 27.802, ART 55'
    },

    // TASAS BANCARIAS
    {
        id: 25,
        nombre:
            'Tasa Activa Cartera general (préstamos) nominal anual vencida a 30 días del Banco Nación'
    },
    {
        id: 1,
        nombre:
            'Tasa Activa. Banco Nación. Efectiva mensual vencida'
    },
    {
        id: 2,
        nombre:
            'Tasa Pasiva Banco Nación'
    },
    {
        id: 16,
        nombre:
            'Tasa activa Banco Nación para préstamos personales libre destino 49 a 60 meses (hasta 22/3/16)'
    },
    {
        id: 3,
        nombre:
            'Tasa Activa Banco Provincia Restantes Operaciones'
    },
    {
        id: 4,
        nombre:
            'Tasa Pasiva Banco Provincia'
    },
    {
        id: 14,
        nombre:
            'Tasa Activa Banco Provincia en Dólares'
    },
    {
        id: 15,
        nombre:
            'Tasa Pasiva Banco Provincia en Dólares'
    },
    {
        id: 7,
        nombre:
            'Tasa Pasiva BCRA'
    },

    // ÍNDICES
    {
        id: 10,
        nombre:
            'Índice de Precios Internos al por Mayor - IPIM (hasta el 31/10/15)'
    },
    {
        id: 21,
        nombre:
            'Índice de Precios Internos al por Mayor - IPIM (desde el 01/01/16)'
    },
    {
        id: 17,
        nombre:
            'Índice de Precios al Consumidor INDEC- IPC/IPCNU (hasta el 31/10/15)'
    },
    {
        id: 18,
        nombre:
            'Índice de Precios al Consumidor INDEC- IPC (desde el 01/04/16)'
    },
    {
        id: 19,
        nombre:
            'Índice de Precios al Consumidor CABA - IPCBA (hasta el 28/02/22)'
    },
    {
        id: 24,
        nombre:
            'Índice de Precios al Consumidor CABA - IPCBA (desde el 01/03/22)'
    },

    // OTROS
    {
        id: 11,
        nombre:
            'Fallo Massa'
    },
    {
        id: 8,
        nombre:
            'Coeficiente de Estabilización de Referencia (CER)'
    },
    {
        id: 5,
        nombre:
            'Tasa art. 37, Ley 11.683'
    },
    {
        id: 6,
        nombre:
            'Tasa art. 52, Ley 11.683'
    },

    // INDEMNIZACIONES
    {
        id: 26,
        nombre:
            'Indemnización por daños. Fórmula VUOTTO MÉNDEZ'
    },
    {
        id: 27,
        nombre:
            'Indemnización por despido'
    },
    {
        id: 29,
        nombre:
            'Liquidación IBM - Ley 27.348'
    },

    // HONORARIOS
    {
        id: 28,
        nombre:
            'Cálculo de honorarios de letrados y peritos (Ley 27.423 – Valores UMA)'
    }
];


// ============================================================
// CLIENTE / SESIÓN
// ============================================================

let client = null;
let jar = null;
let sesionIniciada = false;


async function crearCliente() {

    if (client)
        return client;

    /*
     * axios-cookiejar-support es ESM en versiones modernas.
     * Como Lexora usa CommonJS, lo importamos dinámicamente.
     */
    const {
        wrapper
    } = await import('axios-cookiejar-support');


    jar = new CookieJar();


    client = wrapper(
        axios.create({

            baseURL: BASE_URL,

            jar,

            withCredentials: true,

            maxRedirects: 10,

            headers: {

                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/152.0.0.0 Safari/537.36',

                Accept:
                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

                'Accept-Language':
                    'es-ES,es;q=0.9'
            }
        })
    );


    return client;
}


// ============================================================
// NORMALIZAR TEXTO
// ============================================================

function normalizarTexto(texto) {

    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}


// ============================================================
// BUSCAR CONFIGURACIÓN DE TASA
// ============================================================

function buscarTasaPorNombre(nombre) {

    const buscado =
        normalizarTexto(nombre);


    return TASAS.find(
        tasa =>
            normalizarTexto(
                tasa.nombre
            ) === buscado
    );
}


// ============================================================
// LOGIN
// ============================================================

async function login() {

    const cliente =
        await crearCliente();


    if (
        !process.env.CPACF_DNI ||
        !process.env.CPACF_TOMO ||
        !process.env.CPACF_FOLIO
    ) {

        throw new Error(
            'Faltan las credenciales CPACF en las variables de entorno'
        );
    }


    /*
     * 1. Entrar al formulario.
     */
    const loginPage =
        await cliente.get('/newLogin');


    const $ =
        cheerio.load(loginPage.data);


    const token =
        $('input[name="_token"]').attr(
            'value'
        );


    if (!token) {

        throw new Error(
            'No se pudo obtener el token CSRF del CPACF'
        );
    }


    /*
     * 2. Preparar formulario.
     */
    const form =
        new URLSearchParams();


    form.append(
        '_token',
        token
    );

    form.append(
        'dni',
        process.env.CPACF_DNI
    );

    form.append(
        'tomo',
        process.env.CPACF_TOMO
    );

    form.append(
        'folio',
        process.env.CPACF_FOLIO
    );


    /*
     * 3. Login.
     */
    await cliente.post(
        '/doNewLogin',
        form.toString(),
        {
            headers: {

                'Content-Type':
                    'application/x-www-form-urlencoded',

                Origin:
                    BASE_URL,

                Referer:
                    `${BASE_URL}/newLogin`
            }
        }
    );


    /*
     * 4. Verificar sesión.
     */
    const prueba =
        await cliente.get('/index');


    const urlFinal =
        prueba.request?.res?.responseUrl ?? '';


    if (
        urlFinal.includes('/login') ||
        urlFinal.includes('/newLogin')
    ) {

        throw new Error(
            'El CPACF rechazó el inicio de sesión'
        );
    }


    sesionIniciada =
        true;
}


// ============================================================
// ASEGURAR SESIÓN
// ============================================================

async function asegurarSesion() {

    const cliente =
        await crearCliente();


    /*
     * Primera consulta de la aplicación.
     */
    if (!sesionIniciada) {

        await login();

        return;
    }


    /*
     * Si ya teníamos una sesión,
     * comprobamos que siga vigente.
     */
    try {

        const response =
            await cliente.get('/index');


        const urlFinal =
            response.request?.res?.responseUrl ?? '';


        if (
            urlFinal.includes('/login') ||
            urlFinal.includes('/newLogin')
        ) {

            sesionIniciada =
                false;

            await login();
        }

    } catch (error) {

        sesionIniciada =
            false;

        throw error;
    }
}


// ============================================================
// BUSCAR ID DESDE /index
// ============================================================

async function resolverIdDesdeIndex(
    tasaConfigurada
) {

    if (tasaConfigurada.id)
        return tasaConfigurada.id;


    const cliente =
        await crearCliente();


    const response =
        await cliente.get('/index');


    const $ =
        cheerio.load(response.data);


    const buscar =
        normalizarTexto(
            tasaConfigurada.buscar ??
            tasaConfigurada.nombre
        );


    let idEncontrado =
        null;


    $('option').each(
        (_, option) => {

            if (idEncontrado)
                return;


            const texto =
                $(option)
                    .text()
                    .replace(/\s+/g, ' ')
                    .trim();


            const value =
                $(option).attr('value');


            if (
                normalizarTexto(texto)
                    .includes(buscar)
            ) {

                const match =
                    String(value ?? '')
                        .match(/\d+/);


                if (match) {

                    idEncontrado =
                        Number(match[0]);
                }
            }
        }
    );


    if (!idEncontrado) {

        throw new Error(
            `No se pudo determinar el ID CPACF de "${tasaConfigurada.nombre}"`
        );
    }


    /*
     * Lo guardamos para las próximas llamadas.
     */
    tasaConfigurada.id =
        idEncontrado;


    return idEncontrado;
}


// ============================================================
// FECHA
// ============================================================

function fechaArgentinaAComparable(
    fecha
) {

    const partes =
        fecha.split('/');


    if (partes.length !== 3)
        return 0;


    const [
        dia,
        mes,
        anio
    ] =
        partes.map(Number);


    return new Date(
        anio,
        mes - 1,
        dia
    ).getTime();
}


// ============================================================
// NÚMERO ARGENTINO
// ============================================================

function parseNumeroArgentina(
    valor
) {

    if (!valor)
        return null;


    let limpio =
        valor
            .replace(/%/g, '')
            .replace(/\$/g, '')
            .replace(/\s/g, '')
            .trim();


    if (
        limpio.includes('.') &&
        limpio.includes(',')
    ) {

        limpio =
            limpio
                .replace(/\./g, '')
                .replace(',', '.');

    } else if (
        limpio.includes(',')
    ) {

        limpio =
            limpio.replace(',', '.');
    }


    const numero =
        Number(limpio);


    return Number.isFinite(numero)
        ? numero
        : null;
}


// ============================================================
// EXTRAER ÚLTIMO VALOR
// ============================================================

function extraerUltimoValor(
    html,
    nombre
) {

    const $ =
        cheerio.load(html);


    const registros =
        [];


    const regexFecha =
        /\b(\d{2}\/\d{2}\/\d{4})\b/;


    $('tr').each(
        (_, tr) => {

            const columnas =
                $(tr)
                    .find('td')
                    .map(
                        (_, td) =>
                            $(td)
                                .text()
                                .replace(
                                    /\s+/g,
                                    ' '
                                )
                                .trim()
                    )
                    .get();


            if (!columnas.length)
                return;


            let fecha =
                null;

            let indiceFecha =
                -1;


            /*
             * Primera fecha de la fila:
             * normalmente columna "Desde".
             */
            for (
                let i = 0;
                i < columnas.length;
                i++
            ) {

                const match =
                    columnas[i]
                        .match(regexFecha);


                if (match) {

                    fecha =
                        match[1];

                    indiceFecha =
                        i;

                    break;
                }
            }


            if (!fecha)
                return;


            let valor =
                null;


            /*
             * Buscar último valor numérico.
             */
            for (
                let i =
                    columnas.length - 1;
                i >= 0;
                i--
            ) {

                if (
                    i === indiceFecha
                )
                    continue;


                if (
                    /actualidad/i.test(
                        columnas[i]
                    )
                )
                    continue;


                const candidato =
                    parseNumeroArgentina(
                        columnas[i]
                    );


                if (
                    candidato !== null
                ) {

                    valor =
                        candidato;

                    break;
                }
            }


            if (
                valor === null
            )
                return;


            registros.push({

                fecha,

                valor,

                timestamp:
                    fechaArgentinaAComparable(
                        fecha
                    )
            });
        }
    );


    if (!registros.length) {

        return {
            nombre,
            fecha: null,
            valor: null
        };
    }


    registros.sort(
        (a, b) =>
            b.timestamp -
            a.timestamp
    );


    const ultima =
        registros[0];


    return {

        nombre,

        fecha:
            ultima.fecha,

        valor:
            ultima.valor
    };
}


// ============================================================
// CONSULTAR TASA
// ============================================================

async function obtenerTasaActualPorNombre(
    nombre
) {

    /*
     * Buscar solamente entre las tasas
     * permitidas por Lexora.
     */
    const tasaConfigurada =
        buscarTasaPorNombre(nombre);


    if (!tasaConfigurada) {

        const error =
            new Error(
                `La tasa "${nombre}" no está configurada`
            );

        error.statusCode =
            404;

        throw error;
    }


    await asegurarSesion();


    const id =
        await resolverIdDesdeIndex(
            tasaConfigurada
        );


    const cliente =
        await crearCliente();


    let response =
        await cliente.get(
            `/vertasas/${id}`,
            {
                headers: {

                    Referer:
                        `${BASE_URL}/index`
                }
            }
        );


    let urlFinal =
        response.request?.res?.responseUrl ?? '';


    /*
     * Puede ocurrir que la sesión haya vencido
     * entre la comprobación y esta consulta.
     *
     * Hacemos un solo reintento.
     */
    if (
        urlFinal.includes('/login') ||
        urlFinal.includes('/newLogin')
    ) {

        sesionIniciada =
            false;


        await login();


        response =
            await cliente.get(
                `/vertasas/${id}`,
                {
                    headers: {

                        Referer:
                            `${BASE_URL}/index`
                    }
                }
            );


        urlFinal =
            response.request?.res?.responseUrl ?? '';
    }


    if (
        urlFinal.includes('/login') ||
        urlFinal.includes('/newLogin')
    ) {

        throw new Error(
            'No se pudo mantener la sesión con CPACF'
        );
    }


    return extraerUltimoValor(
        response.data,
        tasaConfigurada.nombre
    );
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    obtenerTasaActualPorNombre
};